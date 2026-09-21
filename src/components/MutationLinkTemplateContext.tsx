import { createContext, useContext, useMemo, type FC, type PropsWithChildren } from 'react';
import z from 'zod';

import type { SequenceType } from '../types/dashboardComponents';
import type { Deletion, Substitution } from '../util/mutations';
import { ErrorDisplay } from './shared/error-display';
import { ResizeContainer } from './shared/resize-container';

export const mutationLinkTemplateSchema = z.object({
    nucleotideMutation: z.string().optional(),
    aminoAcidMutation: z.string().optional(),
});
export type MutationLinkTemplate = z.infer<typeof mutationLinkTemplateSchema>;

const MutationLinkTemplateContext = createContext<MutationLinkTemplate>({
    nucleotideMutation: undefined,
    aminoAcidMutation: undefined,
});

export const MutationLinkTemplateContextProvider: FC<PropsWithChildren<{ value: MutationLinkTemplate }>> = ({
    value,
    children,
}) => {
    const parseResult = useMemo(() => mutationLinkTemplateSchema.safeParse(value), [value]);

    if (!parseResult.success) {
        return (
            <ResizeContainer size={{ width: '100%' }}>
                <ErrorDisplay error={parseResult.error} layout='vertical' />
            </ResizeContainer>
        );
    }

    return (
        <MutationLinkTemplateContext.Provider value={parseResult.data}>{children}</MutationLinkTemplateContext.Provider>
    );
};

export function useMutationLinkProvider() {
    const linkTemplate = useContext(MutationLinkTemplateContext);

    return (mutation: Substitution | Deletion, sequenceType: SequenceType) => {
        switch (sequenceType) {
            case 'nucleotide': {
                if (linkTemplate.nucleotideMutation !== undefined) {
                    return linkTemplate.nucleotideMutation.replace('{{mutation}}', encodeURIComponent(mutation.code));
                }
                return undefined;
            }

            case 'amino acid': {
                if (linkTemplate.aminoAcidMutation !== undefined) {
                    return linkTemplate.aminoAcidMutation.replace('{{mutation}}', encodeURIComponent(mutation.code));
                }
                return undefined;
            }
        }
    };
}
