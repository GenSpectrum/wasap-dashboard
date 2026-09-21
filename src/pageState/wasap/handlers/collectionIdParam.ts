import { getStringFromSearch, setSearchFromString } from '../../urlSearchParams';

/** Both collection modes are told which collection to show with `collectionId`. */
export function parseCollectionId(search: URLSearchParams): number | undefined {
    const collectionId = getStringFromSearch(search, 'collectionId');
    return collectionId !== undefined ? Number(collectionId) : undefined;
}

export function setCollectionIdSearchParam(search: URLSearchParams, collectionId: number | undefined) {
    setSearchFromString(search, 'collectionId', collectionId !== undefined ? String(collectionId) : undefined);
}
