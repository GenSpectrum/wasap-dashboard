import { useQuery } from '@tanstack/react-query';
import { useParams } from 'react-router-dom';

import { NotFoundPage } from './NotFoundPage';
import { OrganismLayout, useOrganismLayoutContext } from '../components/layout/OrganismLayout';
import { CollectionPage } from '../components/modes/collection/CollectionPage';
import { CooccurrencePage } from '../components/modes/cooccurrence/CooccurrencePage';
import { DeconvolutionPage } from '../components/modes/deconvolution/DeconvolutionPage';
import { ManualPage } from '../components/modes/manual/ManualPage';
import { OverviewPage } from '../components/modes/overview/OverviewPage';
import { ResistancePage } from '../components/modes/resistance/ResistancePage';
import { UntrackedPage } from '../components/modes/untracked/UntrackedPage';
import { VariantExplorerPage } from '../components/modes/variantExplorer/VariantExplorerPage';
import { LoadingDisplay } from '../components/ui/LoadingDisplay';
import { NoDataDisplay } from '../components/ui/NoDataDisplay';
import { getAppConfig } from '../config/appConfig';
import { isModeEnabled, type WasapPageConfig } from '../config/wasapPageConfig';
import { resolveWasapConfig } from '../config/wastewaterOrganisms';
import { fetchLineageTree } from '../externalData/fileBased/lineageTree/fetchLineageTree';
import { getApiServiceForClientside } from '../externalData/genSpectrum/apiService';
import { fetchResistanceData, type ResistanceData } from '../externalData/genSpectrum/resistanceData';
import { getClientLogger } from '../logging';
import { getErrorLogMessage } from '../logging';
import { segmentToMode } from '../pageState/wasap/wasapModes';

const logger = getClientLogger('OrganismRoute');

const EMPTY_RESISTANCE_DATA: ResistanceData = { mutationAnnotations: [], displayMutationsBySet: {} };

/**
 * The `/:organismPath` route: resolves the per-organism config from the URL and fetches
 * resistance-mutation data, as well as the lineage tree. The page of the analysis mode
 * (see `ModeRoute`) is rendered inside the `OrganismLayout`.
 */
export function OrganismRoute() {
    const { organismPath } = useParams();
    const config = resolveWasapConfig(organismPath);

    if (config === undefined) {
        return <NoDataDisplay message={`Organism '${organismPath}' doesn't exist or isn't configured.`} />;
    }

    return <OrganismDashboard config={config} />;
}

function OrganismDashboard({ config }: { config: WasapPageConfig }) {
    // `config.genSpectrumOrganismName` stands in for `config` — it's 1:1 with it (one
    // static config per organism).
    // eslint-disable-next-line @tanstack/query/exhaustive-deps
    const { data, isPending } = useQuery({
        queryKey: ['resistanceData', config.genSpectrumOrganismName, getAppConfig().collectionsBackendUrl],
        queryFn: async () => {
            try {
                return await fetchResistanceData(config, getApiServiceForClientside());
            } catch (error) {
                // A resistance-data failure degrades to an empty set rather than failing the whole page.
                logger.error(
                    `Failed to fetch resistance data for WASAP page (organism: ${config.genSpectrumOrganismName}): ${getErrorLogMessage(error)}`,
                );
                return EMPTY_RESISTANCE_DATA;
            }
        },
    });

    const lineageTreeConfig = config.lineageTree;
    const lineageTreeQuery = useQuery({
        queryKey: ['lineageTree', config.genSpectrumOrganismName, lineageTreeConfig],
        queryFn: async () => {
            if (lineageTreeConfig === undefined) {
                return null;
            }
            try {
                return await fetchLineageTree(lineageTreeConfig);
            } catch (error) {
                // like the resistance data: the pages work without it, just with less to offer
                logger.error(
                    `Failed to fetch the lineage tree for WASAP page (organism: ${config.genSpectrumOrganismName}): ${getErrorLogMessage(error)}`,
                );
                return null;
            }
        },
        // the tree only changes when Nextclade publishes a new dataset, and it's costly to parse
        staleTime: Infinity,
        gcTime: Infinity,
    });

    if (isPending || lineageTreeQuery.isPending) {
        return <LoadingDisplay />;
    }

    return (
        <OrganismLayout
            config={config}
            resistanceData={data ?? EMPTY_RESISTANCE_DATA}
            lineageTree={lineageTreeQuery.data ?? undefined}
        />
    );
}

/** The index route of `/:organismPath`, and the landing page of the organism. */
export function OverviewRoute() {
    const { config } = useOrganismLayoutContext();
    return <OverviewPage amplicons={config.amplicons} />;
}

/**
 * The `/:organismPath/:mode` route: the page of the mode in the URL, or a 404 where the
 * segment isn't that of a mode this organism has enabled.
 */
export function ModeRoute() {
    const { config } = useOrganismLayoutContext();
    const { mode: segment } = useParams();

    switch (segmentToMode(segment)) {
        case 'manual':
            return isModeEnabled(config, 'manual') ? <ManualPage config={config} /> : <NotFoundPage />;
        case 'variant':
            return isModeEnabled(config, 'variant') ? <VariantExplorerPage config={config} /> : <NotFoundPage />;
        case 'resistance':
            return isModeEnabled(config, 'resistance') ? <ResistancePage config={config} /> : <NotFoundPage />;
        case 'untracked':
            return isModeEnabled(config, 'untracked') ? <UntrackedPage config={config} /> : <NotFoundPage />;
        case 'collection':
            return isModeEnabled(config, 'collection') ? <CollectionPage config={config} /> : <NotFoundPage />;
        case 'deconvolution':
            return isModeEnabled(config, 'deconvolution') ? <DeconvolutionPage config={config} /> : <NotFoundPage />;
        case 'cooccurrence':
            return isModeEnabled(config, 'cooccurrence') ? <CooccurrencePage config={config} /> : <NotFoundPage />;
        case undefined:
            return <NotFoundPage />;
    }
}
