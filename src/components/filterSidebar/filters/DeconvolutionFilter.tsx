import { type LineageTree } from '../../../lineageTree/lineageTree';
import { type WasapDeconvolutionFilter } from '../../../pageState/wasap/wasapAnalysisFilter';
import { LabeledField } from '../../inputs/LabeledField';
import { LineageTreeCombobox } from '../../inputs/LineageTreeCombobox';

/** The panel of lineages to deconvolve, out of the lineages of the lineage tree. */
export function DeconvolutionFilter({
    pageState,
    setPageState,
    lineageTree,
}: {
    pageState: WasapDeconvolutionFilter;
    setPageState: (newState: WasapDeconvolutionFilter) => void;
    lineageTree: LineageTree;
}) {
    return (
        <LabeledField label='Panel of lineages'>
            <LineageTreeCombobox
                lineageTree={lineageTree}
                multiSelect={true}
                value={pageState.panel}
                onChange={(panel) => setPageState({ ...pageState, panel })}
                placeholderText='Add a lineage'
            />
        </LabeledField>
    );
}
