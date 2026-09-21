import { collectionSchema } from './Collection';
import type { ApiService } from './apiService';

export function getCollection(apiService: ApiService, id: string) {
    return apiService.get({ url: `/collections/${id}`, schema: collectionSchema });
}
