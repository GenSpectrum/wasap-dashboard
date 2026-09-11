import { useQuery } from '@tanstack/react-query';
import { Navigate, useParams } from 'react-router-dom';

import { getBackendServiceForClientside } from '../backendApi/backendService';
import { getClientLogger } from '../clientLogger';
import { getAppConfig } from '../config/appConfig';
import { listWastewaterOrganisms, resolveUnresolvedOrganism, resolveWasapConfig } from '../config/wastewaterOrganisms';
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
 *
 * The organism list is now `config.json`'s `organisms` array (`appConfig.ts`),
 * not a hardcoded three — so an unresolvable `:organismPath` can mean either
 * "typo, redirect to the default" (today's behaviour) or "this deployment has
 * no organisms configured at all", which needs an actual empty state rather
 * than redirecting forever to a default that will never resolve either.
 */
export function WasapRoute() {
    const { organismPath } = useParams();
    const config = resolveWasapConfig(organismPath);

    if (config !== undefined) {
        return <WasapDashboard config={config} />;
    }

    const outcome = resolveUnresolvedOrganism(listWastewaterOrganisms(), organismPath);
    if (outcome.type === 'empty') {
        return <NoDataDisplay message='No wastewater dashboards are configured for this deployment.' />;
    }
    return <Navigate to={`/swiss-wastewater/${outcome.pathSegment}`} replace />;
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
