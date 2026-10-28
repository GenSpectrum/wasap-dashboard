import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import { z } from 'zod';

import { lapisPost } from './http';
import { type LapisFilter } from './lapisTypes';

const lapisTotalCountSchema = z.object({
    data: z.tuple([z.object({ count: z.number() })]),
});

/** The number of sequences `lapisFilter` matches in the LAPIS at `lapisUrl`. */
export function useTotalCount(lapisUrl: string, lapisFilter: LapisFilter): UseQueryResult<number> {
    return useQuery({
        queryKey: ['lapis', 'total-count', lapisUrl, lapisFilter],
        queryFn: ({ signal }) => getTotalCount(lapisUrl, lapisFilter, signal),
    });
}

export async function getTotalCount(lapisUrl: string, lapisFilter: LapisFilter, signal?: AbortSignal) {
    const response = await lapisPost(
        lapisUrl,
        '/sample/aggregated',
        lapisFilter,
        lapisTotalCountSchema,
        'the sequence count',
        signal,
    );
    return response.data[0].count;
}
