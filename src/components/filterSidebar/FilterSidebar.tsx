import { type Dispatch, type ReactNode, type SetStateAction } from 'react';

import { ApplyFilterButton } from './ApplyFilterButton';
import { useDraftFilter } from './useDraftFilter';
import { type PageStateHandler } from '../../pageState/PageStateHandler';
import {
    type WasapAnalysisFilter,
    type WasapBaseFilter,
    type WasapModeFilter,
} from '../../pageState/wasap/wasapAnalysisFilter';
import { MeanProportionField } from '../inputs/MeanProportionField';

type FilterSidebarProps<Analysis extends WasapAnalysisFilter> = {
    pageStateHandler: PageStateHandler<WasapModeFilter<Analysis>>;
    /** The applied base filter. Its dataset part has its own panel, only the mean proportion is edited here. */
    base: WasapBaseFilter;
    /** The applied filter of the mode. */
    analysis: Analysis;
    setPageState: Dispatch<SetStateAction<WasapModeFilter<Analysis>>>;
    /** The filter fields of the mode, editing the draft. */
    children: (analysis: Analysis, setAnalysis: (analysis: Analysis) => void) => ReactNode;
};

/**
 * The panel next to the results of an analysis mode: the filter of the mode, the mean
 * proportion, and the button to apply them. What is edited is only applied with the button.
 */
export function FilterSidebar<Analysis extends WasapAnalysisFilter>(props: FilterSidebarProps<Analysis>) {
    return (
        <FilterSidebarWithDraft
            // Remount (rather than resync via an effect) whenever the URL-derived
            // state changes, so the draft doesn't go stale after browser back/forward
            // or opening a shared link while this page is already mounted. Safe to
            // remount on every URL change, including the app's own "Apply filters"
            // writes, since the new initial values always match what the draft already
            // showed at that point. The dataset filter isn't part of the draft, so
            // changing it doesn't reset the panel.
            key={JSON.stringify({ analysis: props.analysis, meanProportion: props.base.meanProportion })}
            {...props}
        />
    );
}

function FilterSidebarWithDraft<Analysis extends WasapAnalysisFilter>({
    pageStateHandler,
    base,
    analysis,
    setPageState,
    children,
}: FilterSidebarProps<Analysis>) {
    const draft = useDraftFilter(analysis, base.meanProportion);

    return (
        // The filters of the modes return their fields as a fragment, so they are all direct children of
        // this column and get the same gap, without margins of their own.
        <div className='flex flex-col gap-6'>
            {children(draft.analysis, draft.setAnalysis)}
            <MeanProportionField value={draft.meanProportion} onChange={draft.setMeanProportion} />
            <ApplyFilterButton
                pageStateHandler={pageStateHandler}
                newPageState={{ base: { ...base, meanProportion: draft.meanProportion }, analysis: draft.analysis }}
                setPageState={setPageState}
            />
        </div>
    );
}
