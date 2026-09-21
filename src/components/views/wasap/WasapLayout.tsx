import { useMemo } from 'react';
import { Outlet, useOutletContext, useSearchParams } from 'react-router-dom';

import { type ResistanceData } from './resistanceData';
import { useResolvedSamplingDate } from './useResolvedSamplingDate';
import { siloSchema } from '../../../config/siloSchema';
import type { WasapPageConfig } from '../../../config/wasapPageConfig';
import { ConnectionProvider } from '../../../dataLayer/hooks/connection';
import { parseDatasetFilter, withDatasetFilter } from '../../../pageState/wasap/baseFilter';
import { type WasapDatasetFilter } from '../../../pageState/wasap/wasapAnalysisFilter';
import { GsApp } from '../../GsApp';
import { SiloUnreachableWrapper } from '../../SiloUnreachableWrapper';
import { type DateRangeOption } from '../../dateRangeFilter/dateRangeOption';

/** What the layout hands down to the page of an analysis mode. */
export type WasapLayoutContext = {
    config: WasapPageConfig;
    resistanceData: ResistanceData;
    /** The dataset filter of the URL, which is the same for all modes. */
    dataset: WasapDatasetFilter;
    /** Applies a new dataset filter (right away, by writing it to the URL). */
    onDatasetChange: (dataset: WasapDatasetFilter) => void;
    /** The sampling date of the dataset filter, with a preset (like "Most recent 90 days") turned into dates. */
    samplingDate: DateRangeOption;
    isSamplingDatePending: boolean;
};

export function useWasapLayoutContext() {
    return useOutletContext<WasapLayoutContext>();
}

/**
 * What is the same for all the analysis modes of an organism, and stays mounted
 * when going from one mode to another: the connection to SILO and the dataset
 * filter of the URL. The page of the mode is rendered inside.
 */
export function WasapLayout({ config, resistanceData }: { config: WasapPageConfig; resistanceData: ResistanceData }) {
    const schema = useMemo(() => siloSchema(config.silo), [config.silo]);

    return (
        <ConnectionProvider url={config.silo.url} schema={schema}>
            <SiloUnreachableWrapper>
                <WasapLayoutConnected config={config} resistanceData={resistanceData} />
            </SiloUnreachableWrapper>
        </ConnectionProvider>
    );
}

/**
 * Split out from `WasapLayout` because `useResolvedSamplingDate` reads the connection
 * via `useDateExtent`, which only works inside the `ConnectionProvider` `WasapLayout`
 * itself renders (a component can't consume a context it creates).
 */
function WasapLayoutConnected({ config, resistanceData }: { config: WasapPageConfig; resistanceData: ResistanceData }) {
    const [searchParams, setSearchParams] = useSearchParams();
    const dataset = useMemo(() => parseDatasetFilter(searchParams, config), [searchParams, config]);

    // resolve a preset-label-only samplingDate (e.g. from a freshly loaded URL) into concrete dates
    const { samplingDate, isPending: isSamplingDatePending } = useResolvedSamplingDate(dataset.samplingDate);

    const context: WasapLayoutContext = {
        config,
        resistanceData,
        dataset,
        onDatasetChange: (newDataset) => setSearchParams(withDatasetFilter(searchParams, newDataset, config)),
        samplingDate,
        isSamplingDatePending,
    };

    return (
        <GsApp
            lapis={config.lapisBaseUrl}
            mutationAnnotations={resistanceData.mutationAnnotations}
            mutationLinkTemplate={config.linkTemplate}
        >
            <Outlet context={context} />
        </GsApp>
    );
}
