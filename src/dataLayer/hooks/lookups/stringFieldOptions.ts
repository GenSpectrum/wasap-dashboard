import { type UseQueryResult } from '@tanstack/react-query';

import { readNamedCounts, stringFieldValuesQuery, type NamedCount } from '../../queries';
import { useConnection, useRhydbSchema } from '../connection';
import { useRhydbQuery } from '../rhydbQuery';

/**
 * Every distinct value of a string column, with its read count, ordered by
 * name. Unfiltered and cheap (grouping a dictionary/indexed column) — a filter
 * dropdown offers every value the instance holds.
 */
export function useStringFieldOptions(field: string): UseQueryResult<NamedCount[]> {
    const connection = useConnection();
    const schema = useRhydbSchema();
    // `schema` stands in for `connection.key` (same memoized RhydbInstance).
    // eslint-disable-next-line @tanstack/query/exhaustive-deps
    return useRhydbQuery({
        queryKey: ['rhydb', 'string-field-options', ...connection.key, field],
        queryFn: async ({ signal }): Promise<NamedCount[]> => {
            const { rows } = await connection.query(stringFieldValuesQuery(schema, field), `Options for ${field}`, {
                signal,
            });
            return readNamedCounts(rows, field).sort((a, b) => a.name.localeCompare(b.name));
        },
    });
}
