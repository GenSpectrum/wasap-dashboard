import { z } from 'zod';

import type { ApiService } from './apiService';
import { collectionSummarySchema } from '../../types/Collection';

export function getCollections(
    apiService: ApiService,
    {
        organism,
        userId,
        excludeSystemCollections,
        tags,
    }: { organism?: string; userId?: number; excludeSystemCollections?: boolean; tags?: string | string[] } = {},
) {
    const requestParams: Record<string, string | string[]> = {};
    if (organism !== undefined) {
        requestParams.organism = organism;
    }
    if (userId !== undefined) {
        requestParams.userId = String(userId);
    }
    if (excludeSystemCollections !== undefined) {
        requestParams.excludeSystemCollections = String(excludeSystemCollections);
    }
    if (tags !== undefined) {
        requestParams.tags = tags;
    }
    return apiService.get({
        url: '/collections',
        requestParams: Object.keys(requestParams).length > 0 ? requestParams : undefined,
        schema: z.array(collectionSummarySchema),
    });
}
