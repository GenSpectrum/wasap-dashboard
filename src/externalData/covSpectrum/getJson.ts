/** GETs `url` and returns its JSON; throws if the request fails or the status isn't 2xx. */
export async function getJson(url: string, signal?: AbortSignal): Promise<unknown> {
    const response = await fetch(url, { signal });
    if (!response.ok) {
        throw new Error(`${response.status} ${response.statusText}`.trim());
    }
    return (await response.json()) as unknown;
}
