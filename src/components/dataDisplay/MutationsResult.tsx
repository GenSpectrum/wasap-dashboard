import { type ReactNode } from 'react';

import { NoDataHelperText } from './NoDataHelperText';
import { type MeanProportionInterval, MutationsOverTime } from './mutationsOverTime/mutations-over-time';
import { type SiloReadFilter } from '../../dataLayer/queries';
import { type WasapAnalysisFilter, type WasapBaseFilter } from '../../pageState/wasap/wasapAnalysisFilter';
import { type SequenceType } from '../../types/dashboardComponents';
import { type WasapPageData } from '../views/wasap/useWasapPageData';

/**
 * The mutations over time of a mode that selects mutations, or a note that
 * none were selected. What the mode has to say about them besides goes below (`children`).
 */
export function MutationsResult({
    page,
    data,
    sequenceType,
    children,
}: {
    page: {
        base: WasapBaseFilter;
        analysis: WasapAnalysisFilter;
        filter: SiloReadFilter;
        meanProportionInterval: MeanProportionInterval;
    };
    data: WasapPageData;
    sequenceType: SequenceType;
    children?: ReactNode;
}) {
    if (data.type !== 'mutations') {
        throw Error(`Expected mutations, but the data is of type '${data.type}'.`);
    }

    return (
        <>
            {data.displayMutations?.length === 0 ? (
                <NoDataHelperText analysisFilter={page.analysis} />
            ) : (
                <MutationsOverTime
                    width='100%'
                    filter={page.filter}
                    sequenceType={sequenceType}
                    granularity={page.base.granularity}
                    displayMutations={data.displayMutations}
                    hideGaps={page.base.excludeEmpty ? true : undefined}
                    pageSizes={[20, 50, 100, 250]}
                    meanProportionInterval={page.meanProportionInterval}
                    customColumns={data.customColumns}
                />
            )}
            {children}
        </>
    );
}
