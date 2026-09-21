import type { WasapManualFilter } from '../../../../pageState/wasap/wasapAnalysisFilter';
import { mutationType, type MutationType } from '../../../../types/dashboardComponents';
import { SequenceTypeSelector } from '../../../inputs/SequenceTypeSelector';
import { MutationFilter } from '../../../inputs/mutationFilter/mutation-filter';

export function ManualAnalysisFilter({
    pageState,
    setPageState,
}: {
    pageState: WasapManualFilter;
    setPageState: (newState: WasapManualFilter) => void;
}) {
    const enabledMutationTypes: MutationType[] =
        pageState.sequenceType === 'nucleotide'
            ? [mutationType.nucleotideMutations]
            : [mutationType.aminoAcidMutations];
    return (
        <>
            <SequenceTypeSelector
                value={pageState.sequenceType}
                onChange={(sequenceType) => {
                    if (sequenceType === pageState.sequenceType) {
                        return;
                    }
                    setPageState({ ...pageState, sequenceType, mutations: undefined });
                }}
            />
            <MutationFilter
                enabledMutationTypes={enabledMutationTypes}
                initialValue={pageState.mutations}
                onMutationChange={(mutationFilter) => {
                    if (pageState.sequenceType === 'nucleotide') {
                        setPageState({ ...pageState, mutations: mutationFilter?.nucleotideMutations });
                    } else {
                        setPageState({ ...pageState, mutations: mutationFilter?.aminoAcidMutations });
                    }
                }}
            />
        </>
    );
}
