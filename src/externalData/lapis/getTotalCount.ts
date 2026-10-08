import { z } from 'zod';

import { type LapisFilter } from '../../types/dashboardComponents';
import { lapisPost } from '../lapisApi/lapisApi';

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
