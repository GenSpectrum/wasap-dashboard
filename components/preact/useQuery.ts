import { useEffect, useRef, useState } from 'react';

export function useQuery<Data>(fetchDataCallback: () => Promise<Data>, dependencies: unknown[]) {
    const [data, setData] = useState<Data | null>(null);
    const [error, setError] = useState<Error | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    const stableDependencies = useDeepCompareMemoize(dependencies);

    useEffect(() => {
        const fetchData = async () => {
            setIsLoading(true);
            try {
                const result = await fetchDataCallback();
                setData(result);
                setError(null);
            } catch (error) {
                setError(error as Error);
            } finally {
                setIsLoading(false);
            }
        };

        void fetchData();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, stableDependencies);

    if (isLoading) {
        return { isLoading: true } as const;
    }

    if (error !== null) {
        return { error, isLoading: false as const };
    }

    return { data: data!, error: null, isLoading: false as const };
}

// Returns a dependency array that keeps the same reference across renders as long as its
// contents are deep-equal, so it can be passed straight into useEffect's dependency array.
// Callers pass dependency arrays built fresh each render (e.g. `[lapisFilter, ...]` where
// `lapisFilter` is a plain object), so comparing by reference would refetch on every render.
function useDeepCompareMemoize<T extends unknown[]>(dependencies: T): T {
    const ref = useRef(dependencies);
    if (!deepEqual(ref.current, dependencies)) {
        ref.current = dependencies;
    }
    return ref.current;
}

function deepEqual(a: unknown, b: unknown): boolean {
    if (Object.is(a, b)) {
        return true;
    }

    if (typeof a !== 'object' || typeof b !== 'object' || a === null || b === null) {
        return false;
    }

    if (Array.isArray(a) || Array.isArray(b)) {
        return Array.isArray(a) && Array.isArray(b) && a.length === b.length && a.every((v, i) => deepEqual(v, b[i]));
    }

    const aRecord = a as Record<string, unknown>;
    const bRecord = b as Record<string, unknown>;
    const aKeys = Object.keys(aRecord);
    const bKeys = Object.keys(bRecord);
    return aKeys.length === bKeys.length && aKeys.every((key) => deepEqual(aRecord[key], bRecord[key]));
}
