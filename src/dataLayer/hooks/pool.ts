/**
 * Run tasks with a bounded number running at once, stopping at the first failure.
 *
 * For a list whose length comes from the data, so a larger instance means a
 * longer queue rather than more requests at once.
 *
 * Each task is handed a signal that is aborted when any task fails or the
 * caller's own signal fires, so the rest are never sent.
 */
export async function pool<T, R>(
    items: T[],
    concurrency: number,
    run: (item: T, index: number, signal: AbortSignal) => Promise<R>,
    signal?: AbortSignal,
): Promise<R[]> {
    const controller = new AbortController();
    const abort = () => controller.abort();
    signal?.addEventListener('abort', abort);

    const results = new Array<R>(items.length);
    let next = 0;
    const worker = async () => {
        while (!controller.signal.aborted) {
            const index = next++;
            if (index >= items.length) {
                return;
            }
            results[index] = await run(items[index], index, controller.signal);
        }
    };

    try {
        await Promise.all(Array.from({ length: Math.min(concurrency, Math.max(items.length, 1)) }, worker));
    } catch (cause) {
        controller.abort();
        throw cause;
    } finally {
        signal?.removeEventListener('abort', abort);
    }
    return results;
}
