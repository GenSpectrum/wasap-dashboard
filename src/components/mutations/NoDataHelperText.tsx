import type { FC } from 'react';

import { OVER_TIME_MIN_PROPORTION } from '../../dataLayer/queries';
import { effectiveMutationSource, MUTATION_SOURCE, type AnalysisFilter } from '../../pageState/analysisFilter';

/**
 * A note to the user to display when no mutations are selected due to the settings that they set in the filters.
 * The information is tailored to the mode and settings the user selected.
 */
export const NoDataHelperText: FC<{ analysisFilter: AnalysisFilter }> = ({ analysisFilter }) => {
    return (
        <div className='border border-stone-300 bg-white p-4'>
            <h1 className='text-lg font-semibold'>No mutations selected</h1>
            {analysisFilter.mode === 'variant' && (
                <p className='text-sm'>
                    No mutations could be found matching your current filter settings. Try lowering filter thresholds or
                    looking at a different variant.
                </p>
            )}
            {analysisFilter.mode === 'manual' && effectiveMutationSource(analysisFilter) === MUTATION_SOURCE.range && (
                <p className='text-sm'>
                    None of the positions in the range carry a mutation on at least {OVER_TIME_MIN_PROPORTION * 100}% of
                    the reads. Try a different range, or widen the location or sampling-date filter.
                </p>
            )}
            {analysisFilter.mode === 'untracked' &&
                analysisFilter.excludeSet === 'custom' &&
                (analysisFilter.excludeVariants === undefined || analysisFilter.excludeVariants.length === 0) && (
                    <p className='text-sm'>
                        Your set of variants to exclude is empty, please provide at least one variant to exclude.
                    </p>
                )}
        </div>
    );
};
