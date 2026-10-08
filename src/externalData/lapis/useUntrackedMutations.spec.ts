import { describe, expect, test } from 'vitest';

import { fetchUntrackedMutations } from './useUntrackedMutations';
import { DUMMY_LAPIS_URL } from '../../../routeMocker';
import { lapisRouteMocker } from '../../../vitest.setup';
import type { WasapPageConfig } from '../../config/wasapPageConfig';
import { EXCLUDE_SET_NAME, SEQUENCE_TYPE, WASAP_ANALYSIS_MODE } from '../../pageState/wasap/wasapAnalysisFilter';

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
        table: 'data',
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

describe('fetchUntrackedMutations', () => {
    const config = {
        ...baseConfigFields,
        lapisBaseUrl: DUMMY_LAPIS_URL,
        untrackedAnalysisModeEnabled: true as const,
        clinicalLapis: {
            lapisBaseUrl: DUMMY_LAPIS_URL,
            cladeField: 'clade',
            lineageField: 'pangoLineage',
        },
        filterDefaults: {
            untracked: { mode: WASAP_ANALYSIS_MODE.untracked, sequenceType: SEQUENCE_TYPE.nucleotide },
        },
    };

    test('custom exclude set: filters out mutations belonging to the specified variants', async () => {
        lapisRouteMocker.mockPostNucleotideMutationsMulti([
            {
                body: { pangoLineage: 'XEC', minProportion: 0.8 },
                response: { data: [{ mutation: 'A123T', count: 100 }] },
            },
            {
                body: { pangoLineage: 'JN.1', minProportion: 0.8 },
                response: { data: [{ mutation: 'G456C', count: 50 }] },
            },
            {
                body: { minProportion: 0.05 },
                response: {
                    data: [
                        { mutation: 'A123T', count: 200 },
                        { mutation: 'G456C', count: 150 },
                        { mutation: 'C789T', count: 10 },
                    ],
                },
            },
        ]);

        const result = await fetchUntrackedMutations(config, {
            mode: WASAP_ANALYSIS_MODE.untracked,
            sequenceType: SEQUENCE_TYPE.nucleotide,
            excludeSet: EXCLUDE_SET_NAME.custom,
            excludeVariants: ['XEC', 'JN.1'],
        });

        expect(result).toEqual(['C789T']);
    });

    test('predefined exclude set: derives excluded variants from clade-lineage mapping', async () => {
        lapisRouteMocker.mockPostAggregated(
            {
                fields: ['clade', 'pangoLineage'],
                orderBy: ['clade', { field: 'count', type: 'descending' }],
            },
            { data: [{ clade: '24A', pangoLineage: 'JN.1', count: 1000 }] },
        );
        lapisRouteMocker.mockPostNucleotideMutationsMulti([
            {
                body: { pangoLineage: 'JN.1*', minProportion: 0.8 },
                response: { data: [{ mutation: 'A123T', count: 100 }] },
            },
            {
                body: { minProportion: 0.05 },
                response: {
                    data: [
                        { mutation: 'A123T', count: 200 },
                        { mutation: 'C789T', count: 10 },
                    ],
                },
            },
        ]);

        const result = await fetchUntrackedMutations(config, {
            mode: WASAP_ANALYSIS_MODE.untracked,
            sequenceType: SEQUENCE_TYPE.nucleotide,
            excludeSet: EXCLUDE_SET_NAME.predefined,
        });

        expect(result).toEqual(['C789T']);
    });
});
