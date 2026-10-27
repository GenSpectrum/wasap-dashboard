import { useQuery, type UseQueryResult } from '@tanstack/react-query';

import { fetchLineageTree } from './fetchLineageTree';
import type { LineageTree } from './lineageTree';
import type { LineageTreeConfig } from './lineageTreeConfig';
import { getClientLogger } from '../../../logging';
import { getErrorLogMessage } from '../../../logging';

const logger = getClientLogger('useLineageTree');

/**
 * The lineage tree of the config, fetched and built once. `null` for an organism without one, and
 * where it fails to load: the pages work without it, just with less to offer.
 */
export function useLineageTree(config: LineageTreeConfig | undefined): UseQueryResult<LineageTree | null> {
    return useQuery({
        queryKey: ['lineageTree', config],
        queryFn: async () => {
            if (config === undefined) {
                return null;
            }
            try {
                return await fetchLineageTree(config);
            } catch (error) {
                logger.error(`Failed to fetch the lineage tree from ${config.url}: ${getErrorLogMessage(error)}`);
                return null;
            }
        },
        // the tree only changes when Nextclade publishes a new dataset, and it's costly to parse
        staleTime: Infinity,
        gcTime: Infinity,
    });
}
