import { useQuery, type UseQueryResult } from '@tanstack/react-query';

import { primerBedUrl, type AmpliconsConfig } from './ampliconsConfig';
import { parsePrimerBed, type Amplicon } from './primerBed';

/** The amplicons of an organism's primer scheme, fetched and parsed once (see `primerBed.ts` for why in the browser). */
export function useAmplicons(config: AmpliconsConfig): UseQueryResult<Amplicon[]> {
    const url = primerBedUrl(config);
    return useQuery({
        queryKey: ['primer-bed', url],
        staleTime: Infinity,
        queryFn: async ({ signal }) => {
            const response = await fetch(url, { signal });
            if (!response.ok) {
                throw new Error(
                    `Failed to fetch the primer scheme from ${url}: ${response.status} ${response.statusText}`,
                );
            }
            return parsePrimerBed(await response.text());
        },
    });
}
