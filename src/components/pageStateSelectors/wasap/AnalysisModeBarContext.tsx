import { createContext, useContext, useEffect } from 'react';

import type { WasapAnalysisMode } from '../../../pageState/wasap/wasapAnalysisFilter';

export type AnalysisModeBarState = {
    mode: WasapAnalysisMode;
    setMode: (mode: WasapAnalysisMode) => void;
    availableModes: WasapAnalysisMode[];
};

/**
 * Lets the mode-selection buttons live in `AppShell`'s header while the mode
 * state itself stays owned by `WasapPageStateSelector`, deep inside the routed
 * content. `Outlet` context only flows downward (layout route -> child route),
 * so the child publishes its state up into this context instead of the header
 * owning it directly — the header has no config to compute available modes
 * from a page it isn't rendering.
 */
export const AnalysisModeBarContext = createContext<
    | {
          state: AnalysisModeBarState | undefined;
          setState: (state: AnalysisModeBarState | undefined) => void;
      }
    | undefined
>(undefined);

/** Called by the page that owns the mode state, to publish it to the header. */
export function useRegisterAnalysisModeBar(state: AnalysisModeBarState) {
    const ctx = useContext(AnalysisModeBarContext);
    const { setMode, mode } = state;
    const availableModesKey = state.availableModes.join(',');

    useEffect(() => {
        ctx?.setState({ mode, setMode, availableModes: availableModesKey.split(',') as WasapAnalysisMode[] });
        return () => ctx?.setState(undefined);
        // `ctx` (the Provider's context value) is deliberately excluded: it's a
        // fresh object on every AppShell render, and depending on it would loop
        // (effect -> setState -> AppShell re-render -> new ctx -> effect...).
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [mode, setMode, availableModesKey]);
}

export function modeLabel(mode: WasapAnalysisMode): string {
    switch (mode) {
        case 'manual':
            return 'Manual';
        case 'resistance':
            return 'Resistance Mutations';
        case 'variant':
            return 'Variant Explorer';
        case 'untracked':
            return 'Untracked Mutations';
        case 'covSpectrumCollection':
            return 'CovSpectrum Collection';
        case 'collection':
            return 'Collection';
    }
}
