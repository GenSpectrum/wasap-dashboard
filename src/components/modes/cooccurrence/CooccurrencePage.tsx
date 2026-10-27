import { useMemo } from 'react';
import { type To } from 'react-router-dom';

import { CooccurrenceFilter } from './CooccurrenceFilter';
import { CooccurrenceResult } from './CooccurrenceResult';
import { isModeEnabled, type OrganismConfigFor } from '../../../config/organismConfig';
import { type Amplicon } from '../../../externalData/fileBased/amplicons/primerBed';
import { ampliconAnchor } from '../../../externalData/fileBased/amplicons/samplingPositions';
import { useAmplicons } from '../../../externalData/fileBased/amplicons/useAmplicons';
import { effectivePositionSource, type CooccurrenceAnalysis } from '../../../pageState/analysisFilter';
import { datasetFilterSearchParams } from '../../../pageState/baseFilter';
import { CooccurrencePageStateHandler } from '../../../pageState/handlers/CooccurrencePageStateHandler';
import { modePath } from '../../../pageState/modes';
import { usePageState } from '../../../pageState/usePageState';
import { useRhydbReadFilter } from '../../../pageState/useRhydbReadFilter';
import { FilterSidebar } from '../../filterSidebar/FilterSidebar';
import { ModePageLayout } from '../../layout/ModePageLayout';
import { NothingSelected } from '../../layout/NothingSelected';
import { useOrganismLayoutContext } from '../../layout/OrganismLayout';

function isNothingSelected(analysis: CooccurrenceAnalysis): boolean {
    return effectivePositionSource(analysis) === 'amplicon'
        ? (analysis.anchorPosition?.length ?? 0) === 0
        : (analysis.positions?.length ?? 0) === 0;
}

/** Whether the config's default amplicon is to be picked: when nothing else is (exported for tests). */
export function usesDefaultAmplicon(analysis: CooccurrenceAnalysis, defaultAmplicon: number | undefined): boolean {
    return (
        defaultAmplicon !== undefined &&
        analysis.sequenceType === 'nucleotide' &&
        effectivePositionSource(analysis) === 'amplicon' &&
        isNothingSelected(analysis)
    );
}

/** The analysis with the default amplicon picked, if it is in the primer scheme (exported for tests). */
export function withDefaultAmplicon(
    analysis: CooccurrenceAnalysis,
    defaultAmplicon: number,
    amplicons: Amplicon[],
): CooccurrenceAnalysis {
    const amplicon = amplicons.find(({ number }) => number === defaultAmplicon);
    return amplicon === undefined ? analysis : { ...analysis, anchorPosition: ampliconAnchor(amplicon, amplicons) };
}

/**
 * The analysis with the config's default amplicon picked, when nothing else is; pending while the
 * primer scheme loads, to find the amplicon in.
 */
function useWithDefaultAmplicon(analysis: CooccurrenceAnalysis, config: OrganismConfigFor<'cooccurrence'>) {
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

export function CooccurrencePage({ config }: { config: OrganismConfigFor<'cooccurrence'> }) {
    const pageStateHandler = useMemo(() => new CooccurrencePageStateHandler(config), [config]);
    const {
        pageState: { base, analysis: urlAnalysis },
        setPageState,
    } = usePageState(pageStateHandler);
    const { analysis, isPending: isDefaultAmpliconPending } = useWithDefaultAmplicon(urlAnalysis, config);
    const { lineageTree } = useOrganismLayoutContext();
    const { filter, isPending: isFilterPending } = useRhydbReadFilter(base.locationNames);

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
