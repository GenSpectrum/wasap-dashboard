import { useQuery, type UseQueryResult } from '@tanstack/react-query';

import { parseGeneAnnotation, type GeneRange } from './geneAnnotation';

/** EXPERIMENTAL: a dataset's gene nucleotide ranges, fetched and parsed once. `undefined` disables the query. */
export function useGeneAnnotation(url: string | undefined): UseQueryResult<GeneRange[]> {
    return useQuery({
        queryKey: ['genome-annotation', url],
        enabled: url !== undefined,
        staleTime: Infinity,
        queryFn: async ({ signal }) => {
            if (url === undefined) {
                throw new Error('useGeneAnnotation queryFn called with no url');
            }
            const response = await fetch(url, { signal });
            if (!response.ok) {
                throw new Error(
                    `Failed to fetch the genome annotation from ${url}: ${response.status} ${response.statusText}`,
                );
            }
            return parseGeneAnnotation(await response.text());
        },
    });
}
