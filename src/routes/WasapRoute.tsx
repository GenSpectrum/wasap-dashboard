import { useQuery } from '@tanstack/react-query';
import { useParams } from 'react-router-dom';

import { getBackendServiceForClientside } from '../backendApi/backendService';
import { getClientLogger } from '../clientLogger';
import { getAppConfig } from '../config/appConfig';
import { resolveWasapConfig } from '../config/wastewaterOrganisms';
import { NoDataDisplay } from '../components/shared/no-data-display';
import { fetchResistanceData, type ResistanceData } from '../components/views/wasap/resistanceData';
import { WasapPage } from '../components/views/wasap/WasapPage';
import type { WasapPageConfig } from '../components/views/wasap/wasapPageConfig';
import { getErrorLogMessage } from '../util/getErrorLogMessage';
import { Loading } from '../util/Loading';

const logger = getClientLogger('WasapRoute');

const EMPTY_RESISTANCE_DATA: ResistanceData = { mutationAnnotations: [], displayMutationsBySet: {} };

/**
 * The `/swiss-wastewater/:organismPath` route. Replaces `Wasap.astro`: resolves
 * the per-organism config from the URL, fetches resistance-mutation data on the
 * client (Astro did this in page frontmatter), and renders `<WasapPage>`.
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
    const { data, isPending } = useQuery({
        queryKey: ['resistanceData', config.internalName, getAppConfig().collectionsBackendUrl],
        queryFn: async () => {
            try {
                return await fetchResistanceData(config, getBackendServiceForClientside());
            } catch (error) {
                // Matches Wasap.astro: a resistance-data failure degrades to an
                // empty set rather than failing the whole page.
                logger.error(
                    `Failed to fetch resistance data for WASAP page (organism: ${config.internalName}): ${getErrorLogMessage(error)}`,
                );
                return EMPTY_RESISTANCE_DATA;
            }
        },
    });

    if (isPending) {
        return <Loading />;
    }

    return <WasapPage config={config} resistanceData={data ?? EMPTY_RESISTANCE_DATA} />;
}
