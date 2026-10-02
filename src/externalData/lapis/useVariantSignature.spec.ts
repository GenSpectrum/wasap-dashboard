import dayjs from 'dayjs';
import { describe, expect, test } from 'vitest';

import { fetchVariantSignature, getLapisFilterForTimeFrame } from './useVariantSignature';
import { DUMMY_LAPIS_URL } from '../../../routeMocker';
import { lapisRouteMocker } from '../../../vitest.setup';
import type { WasapPageConfig } from '../../config/wasapPageConfig';
import { buildLineageTree } from '../../lineageTree/lineageTree';
import {
    SEQUENCE_TYPE,
    SIGNATURE_TYPE,
    VARIANT_TIME_FRAME,
    WASAP_ANALYSIS_MODE,
} from '../../pageState/wasap/wasapAnalysisFilter';

// these fields have no effect on data fetching, but need to be present to have a correct type.
const unusedBaseConfigFields = {
    genSpectrumOrganismName: 'covid' as const,
    name: '',
    path: '',
    description: '',
    linkTemplate: { nucleotideMutation: '', aminoAcidMutation: '' },
    samplingDateField: '',
    locationNameField: '',
    silo: {
        url: '',
        table: 'default',
        dateColumn: 'date',
        dateColumnIsDictionaryEncoded: true,
        samplingDateColumn: 'samplingDate',
        locationNameColumn: 'locationName',
        sampleIdColumn: 'sampleId',
        batchIdColumn: 'batchId',
    },
    defaultLocationName: '',
    browseDataUrl: '',
    browseDataDescription: '',
};

const baseConfigFields: WasapPageConfig = {
    ...unusedBaseConfigFields,
    lapisBaseUrl: DUMMY_LAPIS_URL,
};

describe('fetchVariantSignature', () => {
    const config = {
        ...baseConfigFields,
        variantAnalysisModeEnabled: true as const,
        clinicalLapis: {
            lapisBaseUrl: DUMMY_LAPIS_URL,
            dateField: 'date',
            lineageField: 'pangoLineage',
        },
        filterDefaults: {
            variant: {
                mode: WASAP_ANALYSIS_MODE.variant,
                signatureType: SIGNATURE_TYPE.computed,
                sequenceType: SEQUENCE_TYPE.nucleotide,
                variant: 'XEC',
                minProportion: 0.8,
                minCount: 15,
                minJaccard: 0.3,
                timeFrame: VARIANT_TIME_FRAME.all,
            },
        },
        clinicalSequenceCountWarningThreshold: 100,
    };

    /* eslint-disable @typescript-eslint/naming-convention -- the field names of the Auspice JSON format */
    const lineageTree = buildLineageTree(
        {
            name: 'NODE_0',
            node_attrs: { lineage: { value: 'B' } },
            children: [
                {
                    name: 'NODE_1',
                    node_attrs: { lineage: { value: 'XE' } },
                    branch_attrs: { mutations: { nuc: ['A123T'] } },
                    children: [
                        {
                            name: 'NODE_2',
                            node_attrs: { lineage: { value: 'XEC' } },
                            branch_attrs: { mutations: { nuc: ['G456C'], S: ['F59S'] } },
                        },
                    ],
                },
            ],
        },
        'lineage',
    );
    /* eslint-enable @typescript-eslint/naming-convention */

    test('computed signature: fetches mutations from clinical LAPIS and annotates with jaccard scores', async () => {
        // getMutationsForVariant makes 3 concurrent requests:
        // (1) mutations with lineage filter, (2) all mutations, (3) total count for the lineage
        lapisRouteMocker.mockPostNucleotideMutationsMulti([
            {
                body: { pangoLineage: 'XEC', minProportion: 0.8 },
                response: { data: [{ mutation: 'A123T', count: 100 }] },
            },
            {
                body: { minProportion: 0 },
                response: { data: [{ mutation: 'A123T', count: 200 }] },
            },
        ]);
        lapisRouteMocker.mockPostAggregated({ pangoLineage: 'XEC' }, { data: [{ count: 150 }] });

        const result = await fetchVariantSignature(
            config,
            {
                mode: WASAP_ANALYSIS_MODE.variant,
                signatureType: SIGNATURE_TYPE.computed,
                sequenceType: SEQUENCE_TYPE.nucleotide,
                variant: 'XEC',
                minProportion: 0.8,
                minCount: 15,
                minJaccard: 0.3,
                timeFrame: VARIANT_TIME_FRAME.all,
            },
            undefined,
        );

        // Jaccard for A123T: 100 / (150 + 200 - 100) = 0.4, which passes minJaccard=0.3
        expect(result).toEqual({
            displayMutations: ['A123T'],
            jaccardIndices: { A123T: 0.4 },
        });
    });

    test('predefined signature: takes the mutations from the lineage tree and returns them with empty jaccard', async () => {
        // Empty clinical LAPIS data → jaccard map is empty → mutations returned unfiltered
        lapisRouteMocker.mockPostNucleotideMutationsMulti([
            { body: { pangoLineage: 'XEC*', minProportion: 0 }, response: { data: [] } },
            { body: { minProportion: 0 }, response: { data: [] } },
        ]);
        lapisRouteMocker.mockPostAggregated({ pangoLineage: 'XEC*' }, { data: [{ count: 0 }] });

        const result = await fetchVariantSignature(
            config,
            {
                mode: WASAP_ANALYSIS_MODE.variant,
                signatureType: SIGNATURE_TYPE.predefined,
                sequenceType: SEQUENCE_TYPE.nucleotide,
                minProportion: -1,
                minCount: -1,
                minJaccard: -1,
                timeFrame: VARIANT_TIME_FRAME.all,
                lineage: 'XEC',
                includeSublineagesForJaccard: true,
            },
            lineageTree,
        );

        expect(result).toEqual({
            displayMutations: ['A123T', 'G456C'],
            lineageForJaccard: 'XEC*',
        });
    });

    test('predefined signature: filters mutations by jaccard and returns their jaccard indices', async () => {
        lapisRouteMocker.mockPostNucleotideMutationsMulti([
            {
                body: { pangoLineage: 'XEC*', minProportion: 0 },
                response: {
                    data: [
                        { mutation: 'A123T', count: 100 },
                        { mutation: 'G456C', count: 10 },
                    ],
                },
            },
            {
                body: { minProportion: 0 },
                response: {
                    data: [
                        { mutation: 'A123T', count: 200 },
                        { mutation: 'G456C', count: 200 },
                    ],
                },
            },
        ]);
        lapisRouteMocker.mockPostAggregated({ pangoLineage: 'XEC*' }, { data: [{ count: 150 }] });

        const result = await fetchVariantSignature(
            config,
            {
                mode: WASAP_ANALYSIS_MODE.variant,
                signatureType: SIGNATURE_TYPE.predefined,
                sequenceType: SEQUENCE_TYPE.nucleotide,
                minProportion: -1,
                minCount: -1,
                minJaccard: 0.3,
                timeFrame: VARIANT_TIME_FRAME.all,
                lineage: 'XEC',
                includeSublineagesForJaccard: true,
            },
            lineageTree,
        );

        // Jaccard for A123T: 100 / (150 + 200 - 100) = 0.4, passes minJaccard=0.3
        // Jaccard for G456C: 10 / (150 + 200 - 10) ≈ 0.029, fails minJaccard=0.3
        expect(result).toEqual({
            displayMutations: ['A123T'],
            lineageForJaccard: 'XEC*',
            jaccardIndices: { A123T: 0.4 },
        });
    });

    test('predefined signature: takes only the new mutations of the lineage with newMutationsOnly', async () => {
        lapisRouteMocker.mockPostAminoAcidMutationsMulti([
            { body: { pangoLineage: 'XEC', minProportion: 0 }, response: { data: [] } },
            { body: { minProportion: 0 }, response: { data: [] } },
        ]);
        lapisRouteMocker.mockPostAggregated({ pangoLineage: 'XEC' }, { data: [{ count: 0 }] });

        const result = await fetchVariantSignature(
            config,
            {
                mode: WASAP_ANALYSIS_MODE.variant,
                signatureType: SIGNATURE_TYPE.predefined,
                sequenceType: SEQUENCE_TYPE.aminoAcid,
                minProportion: -1,
                minCount: -1,
                minJaccard: -1,
                timeFrame: VARIANT_TIME_FRAME.all,
                lineage: 'XEC',
                newMutationsOnly: true,
                includeSublineagesForJaccard: false,
            },
            lineageTree,
        );

        expect(result).toEqual({
            displayMutations: ['S:F59S'],
            lineageForJaccard: 'XEC',
        });
    });

    test('predefined signature: throws when the lineage is not in the lineage tree', async () => {
        await expect(
            fetchVariantSignature(
                config,
                {
                    mode: WASAP_ANALYSIS_MODE.variant,
                    signatureType: SIGNATURE_TYPE.predefined,
                    sequenceType: SEQUENCE_TYPE.nucleotide,
                    minProportion: -1,
                    minCount: -1,
                    minJaccard: -1,
                    timeFrame: VARIANT_TIME_FRAME.all,
                    lineage: 'XFG',
                },
                lineageTree,
            ),
        ).rejects.toThrow('Lineage "XFG" is not in the lineage tree.');
    });
});

describe('getLapisFilterForTimeFrame', () => {
    test('"all" returns an empty filter', () => {
        expect(getLapisFilterForTimeFrame(VARIANT_TIME_FRAME.all, 'date')).toEqual({});
    });

    test('"6months" returns a dateFrom filter using the given field name', () => {
        const result = getLapisFilterForTimeFrame(VARIANT_TIME_FRAME.sixMonths, 'collectionDate');

        expect(result).toEqual({ collectionDateFrom: dayjs().subtract(6, 'month').format('YYYY-MM-DD') });
    });

    test('"3months" returns a dateFrom filter using the given field name', () => {
        const result = getLapisFilterForTimeFrame(VARIANT_TIME_FRAME.threeMonths, 'date');

        expect(result).toEqual({ dateFrom: dayjs().subtract(3, 'month').format('YYYY-MM-DD') });
    });
});
