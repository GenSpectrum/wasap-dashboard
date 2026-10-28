import { type UseQueryResult } from '@tanstack/react-query';

import { readReferenceGenome, referenceGenomeQuery, type ReferenceGenome } from '../../queries';
import { useConnection } from '../connection';
import { useRhydbQuery } from '../rhydbQuery';

/** The names, symbols and lengths of the instance's segments and genes. */
export function useReferenceGenome(): UseQueryResult<ReferenceGenome> {
    const connection = useConnection();
    return useRhydbQuery({
        queryKey: ['rhydb', 'reference-genome', ...connection.key],
        queryFn: async ({ signal }) => {
            const { rows } = await connection.query(referenceGenomeQuery(), 'Reference genome', { signal });
            return readReferenceGenome(rows);
        },
        // the reference does not change while the page is open, so it is fetched once per instance
        staleTime: Infinity,
    });
}
