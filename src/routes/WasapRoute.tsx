import { useQuery } from '@tanstack/react-query';
import { Outlet, useOutletContext, useParams } from 'react-router-dom';

import { getClientLogger } from '../clientLogger';
import { DefaultModeRedirect, EnabledModeRoute } from './wasapModeRoutes';
import { NoDataDisplay } from '../components/shared/no-data-display';
import { WasapPage } from '../components/views/wasap/WasapPage';
import { fetchResistanceData, type ResistanceData } from '../components/views/wasap/resistanceData';
import { getAppConfig } from '../config/appConfig';
import type { WasapPageConfig } from '../config/wasapPageConfig';
import { resolveWasapConfig } from '../config/wastewaterOrganisms';
import { getApiServiceForClientside } from '../externalData/genSpectrum/apiService';
import { Loading } from '../util/Loading';
import { getErrorLogMessage } from '../util/getErrorLogMessage';

const logger = getClientLogger('WasapRoute');

/** What `WasapRoute` hands down to the pages of the modes. */
type WasapRouteContext = {
    config: WasapPageConfig;
    resistanceData: ResistanceData;
};

const EMPTY_RESISTANCE_DATA: ResistanceData = { mutationAnnotations: [], displayMutationsBySet: {} };

/**
 * The `/:organismPath` route. Replaces `Wasap.astro`: resolves
 * the per-organism config from the URL and fetches resistance-mutation data on the
 * client (Astro did this in page frontmatter). The page of the analysis mode
 * (see `WasapModeRoute`) is rendered inside, and gets both through the outlet context.
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

    if (isPending) {
        return <Loading />;
    }

    const context: WasapRouteContext = { config, resistanceData: data ?? EMPTY_RESISTANCE_DATA };

    return <Outlet context={context} />;
}

/** The index route of `/:organismPath`. */
export function WasapDefaultModeRoute() {
    const { config } = useOutletContext<WasapRouteContext>();

    return <DefaultModeRedirect config={config} />;
}

/** The `/:organismPath/:mode` route. */
export function WasapModeRoute() {
    const { config, resistanceData } = useOutletContext<WasapRouteContext>();
    const { mode: segment } = useParams();

    return (
        <EnabledModeRoute config={config} segment={segment}>
            {(mode) => <WasapPage config={config} resistanceData={resistanceData} mode={mode} />}
        </EnabledModeRoute>
    );
}
