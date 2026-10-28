import { z } from 'zod';

import { lapisPost } from './http';
import { type LapisFilter } from './lapisTypes';

const lapisTotalCountSchema = z.object({
    data: z.tuple([z.object({ count: z.number() })]),
});

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
