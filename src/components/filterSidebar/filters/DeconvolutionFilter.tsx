import { type LineageTree } from '../../../lineageTree/lineageTree';
import { type WasapDeconvolutionFilter } from '../../../pageState/wasap/wasapAnalysisFilter';
import { LineagePanelInfo } from '../../InfoBlocks';
import { LabeledField } from '../../inputs/LabeledField';
import { LineageTreeCombobox } from '../../inputs/LineageTreeCombobox';

/**
 * The panel of lineages to deconvolve, which is fixed by the config, and a lineage of the lineage
 * tree that can be added to it.
 */
export function DeconvolutionFilter({
    panel,
    pageState,
    setPageState,
    lineageTree,
}: {
    panel: string[];
    pageState: WasapDeconvolutionFilter;
    setPageState: (newState: WasapDeconvolutionFilter) => void;
    lineageTree: LineageTree;
}) {
    return (
        <>
            <LabeledField label='Panel of lineages' info={<LineagePanelInfo />}>
                <ul aria-label='Panel of lineages' className='flex flex-wrap gap-1'>
                    {panel.map((lineage) => (
                        <li key={lineage} className='badge border-gray-300 bg-gray-50 text-gray-700'>
                            {lineage}
                        </li>
                    ))}
                </ul>
            </LabeledField>
            <LabeledField label='Additional lineage'>
                <LineageTreeCombobox
                    lineageTree={lineageTree}
                    excludedLineages={panel}
                    value={pageState.extraLineage}
                    onChange={(extraLineage) => setPageState({ ...pageState, extraLineage })}
                    placeholderText='Add a lineage'
                />
            </LabeledField>
        </>
    );
}
