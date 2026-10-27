import { useQuery } from '@tanstack/react-query';
import dayjs from 'dayjs';

import { getClusterJaccardsWithLineageCount } from './getClusterJaccards';
import { getMutationsForVariant } from './getMutations';
import { type OrganismConfigFor } from '../../config/organismConfig';
import { getClientLogger } from '../../logging';
import { getErrorLogMessage } from '../../logging';
import type { VariantTimeFrame, VariantAnalysis } from '../../pageState/wasap/analysisFilter';
import { getLineageSignature, type LineageTree } from '../fileBased/lineageTree/lineageTree';
import { type LapisFilter } from '../lapisApi/lapisTypes';

const logger = getClientLogger('useVariantSignature');

/**
 * The mutations of a variant to show, and, where there is one, the Jaccard index of each
 * (by mutation code) with the variant in the clinical sequences.
 */
export type VariantSignature = {
    /** The mutations to show: those of the variant with a Jaccard index of at least `minJaccard`. */
    displayMutations: string[];
    /**
     * All the mutations of the variant, before the Jaccard threshold. A mutation that is not
     * specific to the variant on its own can be in combination with others (see the amplicon
     * co-occurrence), so that is where combinations are looked for.
     */
    candidateMutations: string[];
    jaccardIndices?: Record<string, number>;
    /** The lineage the Jaccard indices are computed for, of a predefined signature. */
    lineageForJaccard?: string;
};

/**
 * The signature of the variant of the variant page. Not fetched while a predefined signature
 * has no lineage selected.
 */
export function useVariantSignature(
    config: OrganismConfigFor<'variant'>,
    analysis: VariantAnalysis,
    lineageTree: LineageTree | undefined,
) {
    // The background lineages are taken out of the signature afterwards
    // (`useSignatureWithoutBackground`): changing them asks for nothing new.
    const { backgroundLineages: _, ...signatureAnalysis } = analysis;
    // `config.genSpectrumOrganismName` stands in for `config` and `lineageTree` — they're
    // 1:1 with it (one static config and one lineage tree per organism).
    // eslint-disable-next-line @tanstack/query/exhaustive-deps
    return useQuery({
        queryKey: ['variantSignature', config.genSpectrumOrganismName, signatureAnalysis],
        queryFn: ({ signal }) =>
            fetchVariantSignature(config, analysis, lineageTree, signal).catch((error: unknown) => {
                if (!signal.aborted) {
                    logger.error(`Failed to fetch the variant signature: ${getErrorLogMessage(error)}`);
                }
                throw error;
            }),
        enabled: isVariantSelected(analysis),
    });
}

/**
 * Whether there is a variant to show: the variant of a computed signature, or the lineage of a
 * predefined one. Without one, a computed signature would be that of all clinical sequences.
 */
export function isVariantSelected(analysis: VariantAnalysis): boolean {
    return (analysis.signatureType === 'computed' ? analysis.variant : analysis.lineage) !== undefined;
}

export async function fetchVariantSignature(
    config: OrganismConfigFor<'variant'>,
    analysis: VariantAnalysis,
    lineageTree: LineageTree | undefined,
    signal?: AbortSignal,
): Promise<VariantSignature> {
    switch (analysis.signatureType) {
        case 'computed':
            return fetchComputedSignature(config, analysis, signal);
        case 'predefined':
            return fetchPredefinedSignature(config, analysis, lineageTree, signal);
    }
}

async function fetchComputedSignature(
    config: OrganismConfigFor<'variant'>,
    analysis: VariantAnalysis,
    signal: AbortSignal | undefined,
): Promise<VariantSignature> {
    if (analysis.variant === undefined) {
        throw new Error('No variant selected for computed variant mode.');
    }
    const mutationsWithScore = await getMutationsForVariant(
        config.clinicalLapis.lapisBaseUrl,
        analysis.sequenceType,
        {
            [config.clinicalLapis.lineageField]: analysis.variant,
        },
        analysis.minProportion,
        analysis.minCount,
        0,
        getLapisFilterForTimeFrame(analysis.timeFrame, config.clinicalLapis.dateField),
        signal,
    );
    const displayed = mutationsWithScore.filter(({ jaccardIndex }) => jaccardIndex >= analysis.minJaccard);
    return {
        displayMutations: displayed.map(({ mutation }) => mutation),
        candidateMutations: mutationsWithScore.map(({ mutation }) => mutation),
        jaccardIndices: Object.fromEntries(displayed.map(({ mutation, jaccardIndex }) => [mutation, jaccardIndex])),
    };
}

async function fetchPredefinedSignature(
    config: OrganismConfigFor<'variant'>,
    analysis: VariantAnalysis,
    lineageTree: LineageTree | undefined,
    signal: AbortSignal | undefined,
): Promise<VariantSignature> {
    if (analysis.lineage === undefined) {
        throw new Error('No lineage selected for predefined variant mode.');
    }
    if (lineageTree === undefined) {
        throw new Error('There is no lineage tree to take the predefined variant from.');
    }
    const lineage = lineageTree.lineages.get(analysis.lineage);
    if (lineage === undefined) {
        throw new Error(`Lineage "${analysis.lineage}" is not in the lineage tree.`);
    }

    const signature = analysis.newMutationsOnly ? lineage.definingMutations : getLineageSignature(lineage);
    const mutations = analysis.sequenceType === 'nucleotide' ? signature.nucleotide : signature.aminoAcid;

    const lineageForJaccard = analysis.includeSublineagesForJaccard !== false ? `${lineage.name}*` : lineage.name;
    // Each mutation as a cluster of its own: one small request for just these mutations, instead
    // of the counts of all mutations of all the clinical sequences.
    const { lineageCount, jaccards } = await getClusterJaccardsWithLineageCount(
        {
            lapisBaseUrl: config.clinicalLapis.lapisBaseUrl,
            lineageQuery: `${config.clinicalLapis.lineageField}=${lineageForJaccard}`,
            dateField: config.clinicalLapis.dateField,
            dateFrom: getFromDateForTimeFrame(analysis.timeFrame),
        },
        mutations.map((mutation) => ({ codes: [mutation], atLeast: 1 })),
        signal,
    );
    const jaccardByMutation = new Map(mutations.map((mutation, index) => [mutation, jaccards[index]]));

    if (lineageCount === 0) {
        return { displayMutations: mutations, candidateMutations: mutations, lineageForJaccard };
    }

    const displayMutations = mutations.filter((m) => (jaccardByMutation.get(m) ?? 0) >= analysis.minJaccard);
    return {
        lineageForJaccard,
        displayMutations,
        candidateMutations: mutations,
        jaccardIndices: Object.fromEntries(
            displayMutations.flatMap((m) => {
                const jaccardIndex = jaccardByMutation.get(m);
                return jaccardIndex === undefined ? [] : [[m, jaccardIndex]];
            }),
        ),
    };
}

export function getLapisFilterForTimeFrame(timeFrame: VariantTimeFrame, dateFieldName: string): LapisFilter {
    const fromDate = getFromDateForTimeFrame(timeFrame);
    if (fromDate === undefined) {
        return {};
    }
    return {
        [`${dateFieldName}From`]: fromDate,
    };
}

/** The first day of the time frame, `YYYY-MM-DD`; none for all of the time. */
export function getFromDateForTimeFrame(timeFrame: VariantTimeFrame): string | undefined {
    switch (timeFrame) {
        case 'all':
            return undefined;
        case '6months':
            return dayjs().subtract(6, 'month').format('YYYY-MM-DD');
        case '3months':
            return dayjs().subtract(3, 'month').format('YYYY-MM-DD');
    }
}
