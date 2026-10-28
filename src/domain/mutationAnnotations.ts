import { type Mutation, type SequenceType } from './mutations';

type MutationEntry = string | { mutation: string; name?: string; description?: string };

type PositionEntry = string | { position: string; name?: string; description?: string };

export type MutationAnnotation = {
    name: string;
    description: string;
    symbol: string;
    nucleotideMutations?: MutationEntry[];
    nucleotidePositions?: PositionEntry[];
    aminoAcidMutations?: MutationEntry[];
    aminoAcidPositions?: PositionEntry[];
};

export type MutationAnnotations = MutationAnnotation[];

export type ResolvedMutationAnnotation = {
    annotation: MutationAnnotation;
    name: string;
    description: string;
};

type AnnotationLookup = {
    mutation: Map<string, ResolvedMutationAnnotation[]>;
    position: Map<string, ResolvedMutationAnnotation[]>;
};

/** The annotations by mutation code and by position, for each sequence type (see `buildAnnotationIndex`). */
export type MutationAnnotationIndex = Record<SequenceType, AnnotationLookup>;

/**
 * Indexes a flat list of MutationAnnotations into fast lookup maps, resolving per-entry name/description overrides
 * eagerly. Called once (memoized) when the annotations config is set on the provider.
 *
 * Returns two maps per sequence type — one keyed by exact mutation code, one by position string — each mapping to
 * the list of ResolvedMutationAnnotations that apply to that key.
 */
export function buildAnnotationIndex(value: MutationAnnotations): MutationAnnotationIndex {
    const nucleotideMutationMap = new Map<string, ResolvedMutationAnnotation[]>();
    const nucleotidePositionMap = new Map<string, ResolvedMutationAnnotation[]>();
    const aminoAcidMutationMap = new Map<string, ResolvedMutationAnnotation[]>();
    const aminoAcidPositionMap = new Map<string, ResolvedMutationAnnotation[]>();

    value.forEach((annotation) => {
        annotation.nucleotideMutations?.forEach((entry) => {
            addToMap(
                nucleotideMutationMap,
                typeof entry === 'string' ? entry : entry.mutation,
                resolve(annotation, entry),
            );
        });
        annotation.aminoAcidMutations?.forEach((entry) => {
            addToMap(
                aminoAcidMutationMap,
                typeof entry === 'string' ? entry : entry.mutation,
                resolve(annotation, entry),
            );
        });
        annotation.nucleotidePositions?.forEach((entry) => {
            addToMap(
                nucleotidePositionMap,
                typeof entry === 'string' ? entry : entry.position,
                resolve(annotation, entry),
            );
        });
        annotation.aminoAcidPositions?.forEach((entry) => {
            addToMap(
                aminoAcidPositionMap,
                typeof entry === 'string' ? entry : entry.position,
                resolve(annotation, entry),
            );
        });
    });

    return {
        nucleotide: { mutation: nucleotideMutationMap, position: nucleotidePositionMap },
        'amino acid': { mutation: aminoAcidMutationMap, position: aminoAcidPositionMap },
    };
}

function resolve(
    annotation: MutationAnnotation,
    entry: string | { name?: string; description?: string },
): ResolvedMutationAnnotation {
    const overrides = typeof entry === 'object' ? entry : undefined;
    return {
        annotation,
        name: overrides?.name ?? annotation.name,
        description: overrides?.description ?? annotation.description,
    };
}

function addToMap(map: Map<string, ResolvedMutationAnnotation[]>, code: string, resolved: ResolvedMutationAnnotation) {
    const existing = map.get(code.toUpperCase()) ?? [];
    map.set(code.toUpperCase(), [...existing, resolved]);
}

export function getMutationAnnotationsProvider(mutationAnnotations: MutationAnnotationIndex) {
    return (mutation: Mutation, sequenceType: SequenceType) => {
        const position =
            mutation.segment === undefined
                ? `${mutation.position}`
                : `${mutation.segment.toUpperCase()}:${mutation.position}`;

        const exactMatches = mutationAnnotations[sequenceType].mutation.get(mutation.code.toUpperCase());
        const positionMatches = mutationAnnotations[sequenceType].position.get(position);

        const combined =
            exactMatches && positionMatches ? [...exactMatches, ...positionMatches] : (exactMatches ?? positionMatches);

        const seenNames = new Set<string>();

        return combined?.filter((resolved) => {
            if (seenNames.has(resolved.annotation.name)) {
                return false;
            }
            seenNames.add(resolved.annotation.name);
            return true;
        });
    };
}
