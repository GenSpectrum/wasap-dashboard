/**
 * The mutations of a variant's signature that are the background the variant stands on rather
 * than what tells it apart: those (nearly) every read carries, which tell nothing about how much of
 * the variant there is, and those of the background lineages the user picked. Deletions can be
 * left out as well: the reads call them less reliably (alignment, read ends). They are taken out of
 * the signature and listed on their own, each with why.
 */

import { useMemo } from 'react';

import { genesOf, useOverTimeMetadata } from './mutationsOverTime';
import { type VariantSignature } from '../../externalData/lapis/useVariantSignature';
import {
    type SubstitutionOrDeletionEntry,
    type SequenceType,
    type TemporalGranularity,
} from '../../types/dashboardComponents';
import { type Deletion, type Substitution } from '../../util/mutations';
import { type SiloReadFilter } from '../queries';

/** A mutation with at least this mean proportion over the time range is background. */
export const BACKGROUND_MIN_PROPORTION = 0.99;

/** A background lineage with its signature mutations (of the sequence type of the page). */
export type BackgroundLineage = { name: string; mutations: readonly string[] };

/** Why a mutation is left out: it is in a background lineage, a deletion, or on (nearly) all reads. */
export type ExclusionReason = { type: 'lineage'; lineage: string } | { type: 'deletion' } | { type: 'proportion' };

/** Which mutations to leave out besides those of the background lineages. */
export type ExclusionOptions = {
    /** Those with a mean proportion of at least `BACKGROUND_MIN_PROPORTION`. */
    excludeNearlyFixed: boolean;
    excludeDeletions: boolean;
};

/** A mutation taken out of the signature, with its mean proportion over the time range. */
export type ExcludedMutation = SubstitutionOrDeletionEntry<Substitution, Deletion> & { reason: ExclusionReason };

export type SignatureWithoutBackground = VariantSignature & {
    /** Taken out of its `displayMutations` and `candidateMutations`, in genome order. */
    excludedMutations: ExcludedMutation[];
};

/**
 * The signature without its background mutations, once their mean proportions are in: from the
 * same query as the mutations over time take theirs from (`useOverTimeMetadata`), so it costs none
 * of its own. Nothing is asked for before there is a signature.
 */
export function useSignatureWithoutBackground(
    signature: VariantSignature | undefined,
    backgroundLineages: readonly BackgroundLineage[],
    options: ExclusionOptions,
    filter: SiloReadFilter,
    granularity: TemporalGranularity,
    sequenceType: SequenceType,
): { data: SignatureWithoutBackground | undefined; error: Error | null; isPending: boolean } {
    const mutations = signature?.candidateMutations;
    const sequenceNames = useMemo(() => genesOf(mutations, sequenceType), [mutations, sequenceType]);
    const metadata = useOverTimeMetadata(
        filter,
        granularity,
        sequenceType,
        sequenceNames,
        mutations,
        signature !== undefined && signature.candidateMutations.length > 0,
    );

    const data = useMemo(() => {
        if (signature === undefined) {
            return undefined;
        }
        if (signature.candidateMutations.length === 0) {
            return { ...signature, excludedMutations: [] };
        }
        return metadata.data === undefined
            ? undefined
            : withoutBackground(signature, metadata.data.overallMutations, backgroundLineages, options);
    }, [signature, metadata.data, backgroundLineages, options]);

    return {
        data,
        error: metadata.error,
        isPending: signature !== undefined && data === undefined && metadata.error === null,
    };
}

/**
 * The signature without the mutations of `overallMutations` (the signature's, with their mean
 * proportions) in a background lineage, and, as the `options` say, the deletions and those of at
 * least `BACKGROUND_MIN_PROPORTION` (exported for tests). A mutation is put down to the first reason
 * in that order, and to the first background lineage that has it.
 */
export function withoutBackground(
    signature: VariantSignature,
    overallMutations: readonly SubstitutionOrDeletionEntry<Substitution, Deletion>[],
    backgroundLineages: readonly BackgroundLineage[],
    { excludeNearlyFixed, excludeDeletions }: ExclusionOptions,
): SignatureWithoutBackground {
    const lineageSets = backgroundLineages.map(({ name, mutations }) => ({ name, mutations: new Set(mutations) }));
    const excludedMutations = overallMutations.flatMap((entry): ExcludedMutation[] => {
        const lineage = lineageSets.find(({ mutations }) => mutations.has(entry.mutation.code));
        if (lineage !== undefined) {
            return [{ ...entry, reason: { type: 'lineage', lineage: lineage.name } }];
        }
        if (excludeDeletions && entry.type === 'deletion') {
            return [{ ...entry, reason: { type: 'deletion' } }];
        }
        return excludeNearlyFixed && entry.proportion >= BACKGROUND_MIN_PROPORTION
            ? [{ ...entry, reason: { type: 'proportion' } }]
            : [];
    });
    const excluded = new Set(excludedMutations.map((entry) => entry.mutation.code));
    const isKept = (code: string) => !excluded.has(code);
    return {
        ...signature,
        displayMutations: signature.displayMutations.filter(isKept),
        candidateMutations: signature.candidateMutations.filter(isKept),
        excludedMutations,
    };
}
