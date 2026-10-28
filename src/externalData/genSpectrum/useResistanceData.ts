import { useQuery, type UseQueryResult } from '@tanstack/react-query';

import { getApiServiceForClientside } from './apiService';
import { fetchResistanceData, type ResistanceData } from './resistanceData';
import { getAppConfig } from '../../config/appConfig';
import type { OrganismConfig } from '../../config/organismConfig';
import { getClientLogger } from '../../logging';
import { getErrorLogMessage } from '../../logging';

const logger = getClientLogger('useResistanceData');

export const EMPTY_RESISTANCE_DATA: ResistanceData = { mutationAnnotations: [], displayMutationsBySet: {} };

/**
 * The resistance mutations of the organism, from the collections backend. A failure degrades to
 * `EMPTY_RESISTANCE_DATA` rather than failing the whole page.
 */
export function useResistanceData(config: OrganismConfig): UseQueryResult<ResistanceData> {
    // `config.genSpectrumOrganismName` stands in for `config` — it's 1:1 with it (one
    // static config per organism).
    // eslint-disable-next-line @tanstack/query/exhaustive-deps
    return useQuery({
        queryKey: ['resistanceData', config.genSpectrumOrganismName, getAppConfig().collectionsBackendUrl],
        queryFn: async () => {
            try {
                return await fetchResistanceData(config, getApiServiceForClientside());
            } catch (error) {
                logger.error(
                    `Failed to fetch resistance data for WASAP page (organism: ${config.genSpectrumOrganismName}): ${getErrorLogMessage(error)}`,
                );
                return EMPTY_RESISTANCE_DATA;
            }
        },
    });
}
