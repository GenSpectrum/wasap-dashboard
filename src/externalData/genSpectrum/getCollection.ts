import type { ApiService } from './apiService';
import { collectionSchema } from './Collection';

export function getCollection(apiService: ApiService, id: string) {
    return apiService.get({ url: `/collections/${id}`, schema: collectionSchema });
}
