import { useEffect, useState } from 'react';

/**
 * For when state is supplied via a prop, and we need to update the internal
 * state when the prop value changes.
 */
export function useControlledState<S>(initialState: S) {
    const [state, setState] = useState(initialState);

    useEffect(() => {
        setState(initialState);
    }, [initialState]);

    return [state, setState] as const;
}
