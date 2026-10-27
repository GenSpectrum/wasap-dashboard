import { useMemo } from 'react';
import { Outlet, useOutletContext, useSearchParams } from 'react-router-dom';

import { RhydbUnreachableWrapper } from './RhydbUnreachableWrapper';
import { rhydbSchema } from '../../config/rhydbSchema';
import type { WasapPageConfig } from '../../config/wasapPageConfig';
import { ConnectionProvider } from '../../dataLayer/hooks/connection';
import { type LineageTree } from '../../externalData/fileBased/lineageTree/lineageTree';
import { type ResistanceData } from '../../externalData/genSpectrum/resistanceData';
import { parseDatasetFilter, withDatasetFilter } from '../../pageState/wasap/baseFilter';
import { useResolvedSamplingDate } from '../../pageState/wasap/useResolvedSamplingDate';
import { type WasapDatasetFilter } from '../../pageState/wasap/wasapAnalysisFilter';
import { rhydbQueryClient } from '../../util/queryClient';
import { type DateRangeOption } from '../inputs/dateRangeFilter/dateRangeOption';
import { MutationAnnotationsContextProvider } from '../mutations/MutationAnnotationsContext';
import { MutationLinkTemplateContextProvider } from '../mutations/MutationLinkTemplateContext';

/** What the layout hands down to the page of an analysis mode. */
export type WasapLayoutContext = {
    config: WasapPageConfig;
    resistanceData: ResistanceData;
    /** `undefined` if the organism has none configured, or it failed to load. */
    lineageTree: LineageTree | undefined;
    /** The dataset filter of the URL, which is the same for all modes. */
    dataset: WasapDatasetFilter;
    /** Applies a new dataset filter (right away, by writing it to the URL). */
    onDatasetChange: (dataset: WasapDatasetFilter) => void;
    /** The sampling date of the dataset filter, with a preset (like "Most recent 90 days") turned into dates. */
    samplingDate: DateRangeOption;
    isSamplingDatePending: boolean;
};

type WasapLayoutProps = {
    config: WasapPageConfig;
    resistanceData: ResistanceData;
    lineageTree: LineageTree | undefined;
};

export function useWasapLayoutContext() {
    return useOutletContext<WasapLayoutContext>();
}

/**
 * What is the same for all the analysis modes of an organism, and stays mounted
 * when going from one mode to another: the connection to RhyDB and the dataset
 * filter of the URL. The page of the mode is rendered inside.
 */
export function WasapLayout({ config, resistanceData, lineageTree }: WasapLayoutProps) {
    const schema = useMemo(() => rhydbSchema(config.rhydb), [config.rhydb]);

    return (
        <ConnectionProvider url={config.rhydb.url} schema={schema} queryClient={rhydbQueryClient}>
            <RhydbUnreachableWrapper>
                <WasapLayoutConnected config={config} resistanceData={resistanceData} lineageTree={lineageTree} />
            </RhydbUnreachableWrapper>
        </ConnectionProvider>
    );
}

/**
 * Split out from `WasapLayout` because `useResolvedSamplingDate` reads the connection
 * via `useDateExtent`, which only works inside the `ConnectionProvider` `WasapLayout`
 * itself renders (a component can't consume a context it creates).
 */
function WasapLayoutConnected({ config, resistanceData, lineageTree }: WasapLayoutProps) {
    const [searchParams, setSearchParams] = useSearchParams();
    const dataset = useMemo(() => parseDatasetFilter(searchParams, config), [searchParams, config]);

    // resolve a preset-label-only samplingDate (e.g. from a freshly loaded URL) into concrete dates
    const { samplingDate, isPending: isSamplingDatePending } = useResolvedSamplingDate(dataset.samplingDate);

    const context: WasapLayoutContext = {
        config,
        resistanceData,
        lineageTree,
        dataset,
        onDatasetChange: (newDataset) => setSearchParams(withDatasetFilter(searchParams, newDataset, config)),
        samplingDate,
        isSamplingDatePending,
    };

    return (
        <MutationAnnotationsContextProvider value={resistanceData.mutationAnnotations}>
            <MutationLinkTemplateContextProvider value={config.linkTemplate}>
                <Outlet context={context} />
            </MutationLinkTemplateContextProvider>
        </MutationAnnotationsContextProvider>
    );
}
