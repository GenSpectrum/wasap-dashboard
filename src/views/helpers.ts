export const setSearchFromString = (
    search: URLSearchParams,
    name: string,
    value: string | undefined | null | string[],
) => {
    if (value !== null && value !== undefined && value !== '' && !Array.isArray(value)) {
        search.set(name, value);
    }
};

export const getStringFromSearch = (
    search: URLSearchParams | Map<string, string>,
    name: string,
): string | undefined => {
    return search.get(name) ?? undefined;
};
