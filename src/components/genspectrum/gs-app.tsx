import { type FC, type PropsWithChildren } from 'react';
import z from 'zod';

import { type ReferenceGenome } from '../../lapisApi/ReferenceGenome';
import { fetchReferenceGenome } from '../../lapisApi/lapisApi';
import { LapisUrlContextProvider } from '../LapisUrlContext';
import { MutationAnnotationsContextProvider } from '../MutationAnnotationsContext';
import { MutationLinkTemplateContextProvider } from '../MutationLinkTemplateContext';
import { INITIAL_REFERENCE_GENOMES, ReferenceGenomeContext } from '../ReferenceGenomeContext';
import { useQuery } from '../useQuery';
import { type MutationAnnotations } from './mutation-annotations-context';
import { type MutationLinkTemplate } from './mutation-link-template-context';

const lapisUrlSchema = z.string().url();

export type GsAppProps = {
    /** Required. The URL of the LAPIS instance that all children of this component will use. */
    lapis: string;
    /**
     * Supply lists of mutations that are especially relevant for the current organism. Visit
     * https://genspectrum.github.io/dashboard-components/?path=/docs/concepts-mutation-annotations--docs
     * for more information.
     */
    mutationAnnotations?: MutationAnnotations;
    /** Supply a link template for nucleotide and amino acid mutations. */
    mutationLinkTemplate?: MutationLinkTemplate;
};

/**
 * The React port's equivalent of the old `<gs-app>` Lit component: fetches the reference genome
 * from LAPIS and provides it, the LAPIS URL, and the mutation annotation/link-template config to
 * all descendants via context. Every gs-* component must be a (possibly nested) descendant of
 * this component.
 *
 * Ported from Lit's `@lit/context` provide/consume split, which stored the raw annotations/
 * link-template on `gs-app` and had `gs-mutations-over-time` re-validate and re-wrap them into a
 * child context on every consume. With plain React context there's no need for that split — it's
 * validated once here and provided directly. `gs-queries-over-time` and the filter components
 * never consumed that context, so this doesn't change what they see.
 *
 * Unlike the Lit version (which rendered its light-DOM children unconditionally and only ever
 * added an error banner alongside them, since Lit's `createRenderRoot` returning `this` couldn't
 * withhold already-present light-DOM content), this component's `children` are ordinary React
 * children — same effect, always rendered regardless of the reference-genome fetch's state.
 */
export const GsApp: FC<PropsWithChildren<GsAppProps>> = ({
    lapis,
    mutationAnnotations = [],
    mutationLinkTemplate = {},
    children,
}) => {
    const result = useQuery<ReferenceGenome>(async () => {
        const lapisUrl = lapisUrlSchema.parse(lapis);
        return fetchReferenceGenome(lapisUrl.endsWith('/') ? lapisUrl.slice(0, -1) : lapisUrl);
    }, [lapis]);

    const referenceGenome = !result.isLoading && result.error === null ? result.data : INITIAL_REFERENCE_GENOMES;
    const fetchError = !result.isLoading ? result.error : null;

    return (
        <LapisUrlContextProvider value={lapis}>
            <ReferenceGenomeContext.Provider value={referenceGenome}>
                <MutationAnnotationsContextProvider value={mutationAnnotations}>
                    <MutationLinkTemplateContextProvider value={mutationLinkTemplate}>
                        {fetchError !== null && <GsAppError error={fetchError} lapis={lapis} />}
                        {children}
                    </MutationLinkTemplateContextProvider>
                </MutationAnnotationsContextProvider>
            </ReferenceGenomeContext.Provider>
        </LapisUrlContextProvider>
    );
};

function GsAppError({ error, lapis }: { error: Error; lapis: string }) {
    const message =
        error instanceof z.ZodError
            ? `Invalid LAPIS URL: '${lapis}'`
            : 'Cannot fetch reference genome. Is LAPIS available?';

    return (
        <div style={{ padding: '0.5rem', border: 'solid red', backgroundColor: 'lightcoral', borderRadius: '0.5rem' }}>
            Error in GsApp: {message}
        </div>
    );
}
