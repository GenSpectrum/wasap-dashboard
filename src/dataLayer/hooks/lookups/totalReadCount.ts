import { type UseQueryResult } from '@tanstack/react-query';

import { normalizeFilter, readTotalCount, totalReadCountQuery, type RhydbReadFilter } from '../../queries';
import { useConnection, useRhydbSchema } from '../connection';
import { useRhydbQuery } from '../rhydbQuery';

/** Total reads the filter admits. Also the "is the instance answering" probe. */
export function useTotalReadCount(filter: RhydbReadFilter = {}): UseQueryResult<number> {
    const connection = useConnection();
    const schema = useRhydbSchema();
    const normalized = normalizeFilter(filter);
    // `schema` stands in for `connection.key` (same memoized RhydbInstance);
    // `normalized` stands in for `filter` — a pure derivation of it,
    // deliberately used instead so equivalent filters share a cache entry.
    // eslint-disable-next-line @tanstack/query/exhaustive-deps
    return useRhydbQuery({
        queryKey: ['rhydb', 'total-read-count', ...connection.key, normalized],
        queryFn: async ({ signal }) => {
            const { rows } = await connection.query(totalReadCountQuery(schema, normalized), 'Total read count', {
                signal,
            });
            return readTotalCount(rows);
        },
    });
}
