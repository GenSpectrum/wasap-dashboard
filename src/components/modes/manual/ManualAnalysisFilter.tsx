import {
    effectiveMutationSource,
    MUTATION_SOURCE,
    type MutationSource,
    type ManualAnalysis,
} from '../../../pageState/analysisFilter';
import { mutationType, type MutationType } from '../../../util/mutations';
import { PositionRangeFilter } from '../../inputs/PositionRangeFilter';
import { SequenceTypeSelector } from '../../inputs/SequenceTypeSelector';
import { TabbedPanel } from '../../inputs/TabbedPanel';
import { MutationFilter } from '../../inputs/mutationFilter/MutationFilter';

export function ManualAnalysisFilter({
    pageState,
    setPageState,
}: {
    pageState: ManualAnalysis;
    setPageState: (newState: ManualAnalysis) => void;
}) {
    const mutationSource = effectiveMutationSource(pageState);
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
                    setPageState({
                        ...pageState,
                        sequenceType,
                        mutations: undefined,
                        rangeGene: undefined,
                        rangeStart: undefined,
                    });
                }}
            />
            <TabbedPanel<MutationSource>
                label='Mutations from'
                value={mutationSource}
                options={[
                    { value: MUTATION_SOURCE.list, label: 'List' },
                    { value: MUTATION_SOURCE.range, label: 'Position range' },
                ]}
                onChange={(newSource) => setPageState({ ...pageState, mutationSource: newSource })}
            >
                {mutationSource === MUTATION_SOURCE.list ? (
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
                ) : (
                    <PositionRangeFilter pageState={pageState} setPageState={setPageState} />
                )}
            </TabbedPanel>
        </>
    );
}
