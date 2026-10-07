import { createContext, useContext, type FC, type PropsWithChildren } from 'react';

import type { SequenceType } from '../types/dashboardComponents';
import type { Deletion, Substitution } from '../util/mutations';

export type MutationLinkTemplate = {
    nucleotideMutation?: string;
    aminoAcidMutation?: string;
};

const MutationLinkTemplateContext = createContext<MutationLinkTemplate>({
    nucleotideMutation: undefined,
    aminoAcidMutation: undefined,
});

export const MutationLinkTemplateContextProvider: FC<PropsWithChildren<{ value: MutationLinkTemplate }>> = ({
    value,
    children,
}) => {
    return <MutationLinkTemplateContext.Provider value={value}>{children}</MutationLinkTemplateContext.Provider>;
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
