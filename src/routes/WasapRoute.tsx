import { useQuery } from '@tanstack/react-query';
import { useParams } from 'react-router-dom';

import { getClientLogger } from '../clientLogger';
import { DefaultModeRedirect, EnabledModeRoute } from './wasapModeRoutes';
import { NoDataDisplay } from '../components/shared/no-data-display';
import { WasapLayout, useWasapLayoutContext } from '../components/views/wasap/WasapLayout';
import { WasapPage } from '../components/views/wasap/WasapPage';
import { fetchResistanceData, type ResistanceData } from '../components/views/wasap/resistanceData';
import { getAppConfig } from '../config/appConfig';
import type { WasapPageConfig } from '../config/wasapPageConfig';
import { resolveWasapConfig } from '../config/wastewaterOrganisms';
import { getApiServiceForClientside } from '../externalData/genSpectrum/apiService';
import { Loading } from '../util/Loading';
import { getErrorLogMessage } from '../util/getErrorLogMessage';

const logger = getClientLogger('WasapRoute');

const EMPTY_RESISTANCE_DATA: ResistanceData = { mutationAnnotations: [], displayMutationsBySet: {} };

/**
 * The `/:organismPath` route. Replaces `Wasap.astro`: resolves
 * the per-organism config from the URL and fetches resistance-mutation data on the
 * client (Astro did this in page frontmatter). The page of the analysis mode
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

    if (isPending) {
        return <Loading />;
    }

    return <WasapLayout config={config} resistanceData={data ?? EMPTY_RESISTANCE_DATA} />;
}

/** The index route of `/:organismPath`. */
export function WasapDefaultModeRoute() {
    const { config } = useWasapLayoutContext();

    return <DefaultModeRedirect config={config} />;
}

/** The `/:organismPath/:mode` route. */
export function WasapModeRoute() {
    const { config } = useWasapLayoutContext();
    const { mode: segment } = useParams();

    return (
        <EnabledModeRoute config={config} segment={segment}>
            {(mode) => <WasapPage config={config} mode={mode} />}
        </EnabledModeRoute>
    );
}
