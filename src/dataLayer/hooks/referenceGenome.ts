/**
 * `useReferenceGenome` — a Tier-1 SILO read, as a TanStack Query hook.
 *
 * Reads the instance from context (`useConnection`), issues one query, and
 * hands back the parsed rows. The reference does not change while the page is
 * open, so it is fetched once per instance.
 */

import { useQuery, type UseQueryResult } from '@tanstack/react-query';

import { useConnection } from './connection';
import { readReferenceGenome, referenceGenomeQuery, type ReferenceGenome } from '../queries';

/** The names and lengths of the instance's segments and genes. */
export function useReferenceGenome(): UseQueryResult<ReferenceGenome> {
    const connection = useConnection();
    return useQuery({
        queryKey: ['silo', 'reference-genome', ...connection.key],
        queryFn: async ({ signal }) => {
            const { rows } = await connection.query(referenceGenomeQuery(), 'Reference genome', { signal });
            return readReferenceGenome(rows);
        },
        staleTime: Infinity,
    });
}
