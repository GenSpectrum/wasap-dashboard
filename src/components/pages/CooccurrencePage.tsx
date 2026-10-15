import { useMemo } from 'react';
import { type To } from 'react-router-dom';

import { ModePageLayout } from './ModePageLayout';
import { useWasapLayoutContext } from './WasapLayout';
import { type Amplicon } from '../../amplicons/primerBed';
import { ampliconAnchor } from '../../amplicons/samplingPositions';
import { useAmplicons } from '../../amplicons/useAmplicons';
import { isModeEnabled, type WasapPageConfigFor } from '../../config/wasapPageConfig';
import { usePageState } from '../../pageState/usePageState';
import { datasetFilterSearchParams } from '../../pageState/wasap/baseFilter';
import { CooccurrencePageStateHandler } from '../../pageState/wasap/handlers/CooccurrencePageStateHandler';
import { useSiloReadFilter } from '../../pageState/wasap/useSiloReadFilter';
import { effectivePositionSource, type WasapCooccurrenceFilter } from '../../pageState/wasap/wasapAnalysisFilter';
import { modePath } from '../../pageState/wasap/wasapModes';
import { CooccurrenceResult } from '../dataDisplay/CooccurrenceResult';
import { NothingSelected } from '../dataDisplay/NothingSelected';
import { FilterSidebar } from '../filterSidebar/FilterSidebar';
import { CooccurrenceFilter } from '../filterSidebar/filters/CooccurrenceFilter';

function isNothingSelected(analysis: WasapCooccurrenceFilter): boolean {
    return effectivePositionSource(analysis) === 'amplicon'
        ? (analysis.anchorPosition?.length ?? 0) === 0
        : (analysis.positions?.length ?? 0) === 0;
}

/** Whether the config's default amplicon is to be picked: when nothing else is (exported for tests). */
export function usesDefaultAmplicon(analysis: WasapCooccurrenceFilter, defaultAmplicon: number | undefined): boolean {
    return (
        defaultAmplicon !== undefined &&
        analysis.sequenceType === 'nucleotide' &&
        effectivePositionSource(analysis) === 'amplicon' &&
        isNothingSelected(analysis)
    );
}

/** The analysis with the default amplicon picked, if it is in the primer scheme (exported for tests). */
export function withDefaultAmplicon(
    analysis: WasapCooccurrenceFilter,
    defaultAmplicon: number,
    amplicons: Amplicon[],
): WasapCooccurrenceFilter {
    const amplicon = amplicons.find(({ number }) => number === defaultAmplicon);
    return amplicon === undefined ? analysis : { ...analysis, anchorPosition: ampliconAnchor(amplicon, amplicons) };
}

/**
 * The analysis with the config's default amplicon picked, when nothing else is; pending while the
 * primer scheme loads, to find the amplicon in.
 */
function useWithDefaultAmplicon(analysis: WasapCooccurrenceFilter, config: WasapPageConfigFor<'cooccurrence'>) {
    const defaultAmplicon = config.cooccurrenceDefaultAmplicon;
    const usesDefault = usesDefaultAmplicon(analysis, defaultAmplicon);
    const amplicons = useAmplicons(usesDefault ? config.amplicons : undefined);

    return useMemo(
        () =>
            usesDefault && defaultAmplicon !== undefined && amplicons.data !== undefined
                ? { analysis: withDefaultAmplicon(analysis, defaultAmplicon, amplicons.data), isPending: false }
                : { analysis, isPending: usesDefault && amplicons.isPending },
        [analysis, usesDefault, defaultAmplicon, amplicons.data, amplicons.isPending],
    );
}

export function CooccurrencePage({ config }: { config: WasapPageConfigFor<'cooccurrence'> }) {
    const pageStateHandler = useMemo(() => new CooccurrencePageStateHandler(config), [config]);
    const {
        pageState: { base, analysis: urlAnalysis },
        setPageState,
    } = usePageState(pageStateHandler);
    const { analysis, isPending: isDefaultAmpliconPending } = useWithDefaultAmplicon(urlAnalysis, config);
    const { lineageTree } = useWasapLayoutContext();
    const { filter, isPending: isFilterPending } = useSiloReadFilter(base.locationNames);

    // Opens a row's mutations in the manual mode, to see them over time there.
    const manualModeLink = isModeEnabled(config, 'manual')
        ? (mutations: string[]): To => {
              const search = datasetFilterSearchParams(base, config);
              search.set('sequenceType', analysis.sequenceType);
              search.set('mutations', mutations.join('|'));
              return { pathname: modePath(config.path, 'manual'), search: `?${search.toString()}` };
          }
        : undefined;

    // Opens a panel-match lineage in the variant explorer, predefined signature.
    const variantModeLink = isModeEnabled(config, 'variant')
        ? (lineage: string): To => {
              const search = datasetFilterSearchParams(base, config);
              search.set('signatureType', 'predefined');
              search.set('lineage', lineage);
              return { pathname: modePath(config.path, 'variant'), search: `?${search.toString()}` };
          }
        : undefined;

    return (
        <ModePageLayout
            sidebar={
                <FilterSidebar
                    withMeanProportion={false}
                    pageStateHandler={pageStateHandler}
                    base={base}
                    analysis={analysis}
                    setPageState={setPageState}
                >
                    {(analysis, setAnalysis) => (
                        <CooccurrenceFilter
                            pageState={analysis}
                            setPageState={setAnalysis}
                            config={config}
                            lineageTree={lineageTree}
                        />
                    )}
                </FilterSidebar>
            }
        >
            {isDefaultAmpliconPending ? undefined : isNothingSelected(analysis) ? (
                <NothingSelected title='No positions selected'>
                    {effectivePositionSource(analysis) === 'amplicon'
                        ? 'Please pick an amplicon in the filter panel — its variable positions are found automatically.'
                        : 'Please add at least one position in the filter panel.'}
                </NothingSelected>
            ) : isFilterPending ? undefined : (
                <CooccurrenceResult
                    base={base}
                    analysis={analysis}
                    filter={filter}
                    minShare={analysis.minShare ?? 0}
                    lineageTree={lineageTree}
                    manualModeLink={manualModeLink}
                    variantModeLink={variantModeLink}
                    clinicalLapis={isModeEnabled(config, 'variant') ? config.clinicalLapis : undefined}
                />
            )}
        </ModePageLayout>
    );
}
