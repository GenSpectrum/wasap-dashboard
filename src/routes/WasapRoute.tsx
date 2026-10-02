import { useQuery } from '@tanstack/react-query';
import { useParams } from 'react-router-dom';

import { getClientLogger } from '../clientLogger';
import { NotFoundPage } from './NotFoundPage';
import { NoDataDisplay } from '../components/shared/no-data-display';
import { WasapLayout, useWasapLayoutContext } from '../components/views/wasap/WasapLayout';
import { CollectionPage } from '../components/views/wasap/pages/CollectionPage';
import { DeconvolutionPage } from '../components/views/wasap/pages/DeconvolutionPage';
import { ManualPage } from '../components/views/wasap/pages/ManualPage';
import { OverviewPage } from '../components/views/wasap/pages/OverviewPage';
import { ResistancePage } from '../components/views/wasap/pages/ResistancePage';
import { UntrackedPage } from '../components/views/wasap/pages/UntrackedPage';
import { VariantExplorerPage } from '../components/views/wasap/pages/VariantExplorerPage';
import { fetchResistanceData, type ResistanceData } from '../components/views/wasap/resistanceData';
import { getAppConfig } from '../config/appConfig';
import { isModeEnabled, type WasapPageConfig } from '../config/wasapPageConfig';
import { resolveWasapConfig } from '../config/wastewaterOrganisms';
import { getApiServiceForClientside } from '../externalData/genSpectrum/apiService';
import { fetchLineageTree } from '../lineageTree/fetchLineageTree';
import { segmentToMode } from '../pageState/wasap/wasapModes';
import { Loading } from '../util/Loading';
import { getErrorLogMessage } from '../util/getErrorLogMessage';

const logger = getClientLogger('WasapRoute');

const EMPTY_RESISTANCE_DATA: ResistanceData = { mutationAnnotations: [], displayMutationsBySet: {} };

/**
 * The `/:organismPath` route. Replaces `Wasap.astro`: resolves
 * the per-organism config from the URL and fetches resistance-mutation data on the
 * client (Astro did this in page frontmatter), as well as the lineage tree. The page of the analysis mode
 * (see `WasapModeRoute`) is rendered inside the `WasapLayout`.
 */
export function WasapRoute() {
    const { organismPath } = useParams();
    const config = resolveWasapConfig(organismPath);

    if (config === undefined) {
        return <NoDataDisplay message={`Organism '${organismPath}' doesn't exist or isn't configured.`} />;
    }

    return <WasapDashboard config={config} />;
}

function WasapDashboard({ config }: { config: WasapPageConfig }) {
    // `config.genSpectrumOrganismName` stands in for `config` — it's 1:1 with it (one
    // static config per organism).
    // eslint-disable-next-line @tanstack/query/exhaustive-deps
    const { data, isPending } = useQuery({
        queryKey: ['resistanceData', config.genSpectrumOrganismName, getAppConfig().collectionsBackendUrl],
        queryFn: async () => {
            try {
                return await fetchResistanceData(config, getApiServiceForClientside());
            } catch (error) {
                // Matches Wasap.astro: a resistance-data failure degrades to an
                // empty set rather than failing the whole page.
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
        return <Loading />;
    }

    return (
        <WasapLayout
            config={config}
            resistanceData={data ?? EMPTY_RESISTANCE_DATA}
            lineageTree={lineageTreeQuery.data ?? undefined}
        />
    );
}

/** The index route of `/:organismPath`, and the landing page of the organism. */
export function WasapOverviewRoute() {
    const { config } = useWasapLayoutContext();
    return <OverviewPage amplicons={config.amplicons} />;
}

/**
 * The `/:organismPath/:mode` route: the page of the mode in the URL, or a 404 where the
 * segment isn't that of a mode this organism has enabled.
 */
export function WasapModeRoute() {
    const { config } = useWasapLayoutContext();
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
        case undefined:
            return <NotFoundPage />;
    }
}
