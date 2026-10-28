import { createContext, type ComponentProps, type FC, useContext, useMemo } from 'react';

import {
    buildAnnotationIndex,
    getMutationAnnotationsProvider,
    type MutationAnnotationIndex,
    type MutationAnnotations,
} from '../../domain/mutationAnnotations';

const MutationAnnotationsContext = createContext<MutationAnnotationIndex>({
    nucleotide: {
        mutation: new Map(),
        position: new Map(),
    },
    'amino acid': {
        mutation: new Map(),
        position: new Map(),
    },
});

/**
 * Provides mutation annotations to all descendant components.
 * Accepts the raw MutationAnnotations config, builds the internal lookup index, and stores it in context.
 */
export const MutationAnnotationsContextProvider: FC<
    Omit<ComponentProps<typeof MutationAnnotationsContext.Provider>, 'value'> & { value: MutationAnnotations }
> = ({ value, children }) => {
    const contextValue = useMemo(() => buildAnnotationIndex(value), [value]);

    return <MutationAnnotationsContext.Provider value={contextValue}>{children}</MutationAnnotationsContext.Provider>;
};

/**
 * Returns a lookup function `(mutation, sequenceType) => ResolvedMutationAnnotation[] | undefined` that, given a
 * specific mutation, returns all annotations that apply to it with name and description already resolved.
 * Returns undefined if no annotations match.
 */
export function useMutationAnnotationsProvider() {
    const mutationAnnotations = useContext(MutationAnnotationsContext);

    return useMemo(() => getMutationAnnotationsProvider(mutationAnnotations), [mutationAnnotations]);
}
