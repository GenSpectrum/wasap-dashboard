import { createContext, useContext, type RefObject } from 'react';

// Set by the top-level component that owns the fullscreen-able container
// (see ResizeContainer usage in mutations-over-time.tsx / queries-over-time.tsx),
// consumed by <Fullscreen /> further down the tree.
export const FullscreenTargetContext = createContext<RefObject<HTMLDivElement | null> | null>(null);

export function useFullscreenTarget() {
    return useContext(FullscreenTargetContext);
}
