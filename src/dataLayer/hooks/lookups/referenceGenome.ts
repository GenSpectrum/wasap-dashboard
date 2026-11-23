import { type UseQueryResult } from '@tanstack/react-query';

import {
    readReferenceGenome,
    readTableColumns,
    referenceGenomeQuery,
    tableColumnsQuery,
    type ReferenceGenome,
} from '../../queries';
import type { Connection } from '../../transport/connection';
import { useConnection } from '../connection';
import { useRhydbQuery } from '../rhydbQuery';

/** The names, symbols and lengths of the table's segments and genes. */
export function useReferenceGenome(): UseQueryResult<ReferenceGenome> {
    const connection = useConnection();
    // `connection.key` is the connection's identity (its url and table).
    // eslint-disable-next-line @tanstack/query/exhaustive-deps
    return useRhydbQuery({
        queryKey: ['rhydb', 'reference-genome', ...connection.key],
        queryFn: ({ signal }) => fetchReferenceGenome(connection, signal),
        // the reference does not change while the page is open, so it is fetched once per table
        staleTime: Infinity,
    });
}

async function fetchReferenceGenome(connection: Connection, signal: AbortSignal): Promise<ReferenceGenome> {
    const [reference, columns] = await Promise.all([
        connection.query(referenceGenomeQuery(), 'Reference genome', { signal }),
        connection.query(tableColumnsQuery(connection.table), 'Reference genome', { signal }),
    ]);
    return readReferenceGenome(reference.rows, connection.table, readTableColumns(columns.rows));
}
