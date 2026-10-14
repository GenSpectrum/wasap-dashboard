import { useMemo } from 'react';
import { type To } from 'react-router-dom';

import { ModePageLayout } from './ModePageLayout';
import { useWasapLayoutContext } from './WasapLayout';
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

export function CooccurrencePage({ config }: { config: WasapPageConfigFor<'cooccurrence'> }) {
    const pageStateHandler = useMemo(() => new CooccurrencePageStateHandler(config), [config]);
    const {
        pageState: { base, analysis },
        setPageState,
    } = usePageState(pageStateHandler);
    const { lineageTree } = useWasapLayoutContext();
    const { filter, isPending: isFilterPending } = useSiloReadFilter(base.locationName);
    const meanProportionInterval = useMemo(
        () => ({ min: base.meanProportion.lower, max: base.meanProportion.upper }),
        [base.meanProportion.lower, base.meanProportion.upper],
    );

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
            {isNothingSelected(analysis) ? (
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
                    meanProportionInterval={meanProportionInterval}
                    lineageTree={lineageTree}
                    manualModeLink={manualModeLink}
                    variantModeLink={variantModeLink}
                />
            )}
        </ModePageLayout>
    );
}
