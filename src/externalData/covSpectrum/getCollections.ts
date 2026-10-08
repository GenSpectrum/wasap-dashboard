import { getJson } from './getJson';
import { collectionsRawResponseSchema, type CollectionRaw } from './types';
import { getClientLogger } from '../../clientLogger';

const logger = getClientLogger('getCollections');

/**
 * Fetches the list of variant collections from the CoV-Spectrum API.
 * Collections are returned sorted by ID in ascending order.
 *
 * @param covSpectrumApiBaseUrl The base URL of the CoV-Spectrum API (e.g., 'https://cov-spectrum.org/api/v2')
 * @param titleFilter Optional string to filter collections by title (case-insensitive substring match)
 * @param signal Aborts the request
 * @returns A promise that resolves to an array of Collection objects
 * @throws Error if the request fails or response validation fails
 */
export async function getCollections(
    covSpectrumApiBaseUrl: string,
    titleFilter?: string,
    signal?: AbortSignal,
): Promise<CollectionRaw[]> {
    const url = `${covSpectrumApiBaseUrl}/resource/collection`;

    let response: unknown;
    try {
        response = await getJson(url, signal);
    } catch (error) {
        if (signal?.aborted === true) {
            throw error;
        }
        const message = `Failed to fetch collections: ${error instanceof Error ? error.message : String(error)}`;
        logger.error(message);
        throw new Error(message, { cause: error });
    }

    const parsedResponse = collectionsRawResponseSchema.safeParse(response);
    if (parsedResponse.success) {
        // Sort by ID to ensure consistent ordering
        let collections = parsedResponse.data.sort((c1, c2) => c1.id - c2.id);

        // Apply title filter if provided
        if (titleFilter !== undefined) {
            const lowerFilter = titleFilter.toLowerCase();
            collections = collections.filter((collection) => collection.title.toLowerCase().includes(lowerFilter));
        }

        return collections;
    }

    const message = `Failed to parse collections response: ${JSON.stringify(parsedResponse.error)} (was ${JSON.stringify(response)})`;
    logger.error(message);
    throw new Error(message);
}
