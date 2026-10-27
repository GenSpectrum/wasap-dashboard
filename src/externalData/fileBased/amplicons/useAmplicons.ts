import { useQuery, type UseQueryResult } from '@tanstack/react-query';

import { primerBedUrl, type AmpliconsConfig } from './ampliconsConfig';
import { parsePrimerBed, type Amplicon } from './primerBed';

/**
 * The amplicons of an organism's primer scheme, fetched and parsed once (see `primerBed.ts` for why
 * in the browser). Nothing without a `config`, for an organism without a primer scheme.
 */
export function useAmplicons(config: AmpliconsConfig | undefined): UseQueryResult<Amplicon[]> {
    const url = config === undefined ? undefined : primerBedUrl(config);
    return useQuery({
        enabled: url !== undefined,
        queryKey: ['primer-bed', url],
        staleTime: Infinity,
        queryFn: async ({ signal }) => {
            if (url === undefined) {
                throw new Error('There is no primer scheme to fetch.');
            }
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
