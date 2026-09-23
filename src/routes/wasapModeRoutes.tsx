import type { ReactNode } from 'react';

import { NotFoundPage } from './NotFoundPage';
import { isModeEnabled, type WasapPageConfig } from '../config/wasapPageConfig';
import type { WasapAnalysisMode } from '../pageState/wasap/wasapAnalysisFilter';
import { segmentToMode } from '../pageState/wasap/wasapModes';

/**
 * The page of the mode in the URL (`/covid/:mode`), or a 404 where that segment isn't the
 * segment of a mode this organism has enabled.
 */
export function EnabledModeRoute({
    config,
    segment,
    children,
}: {
    config: WasapPageConfig;
    segment: string | undefined;
    children: (mode: WasapAnalysisMode) => ReactNode;
}) {
    const mode = segmentToMode(segment);

    if (mode === undefined || !isModeEnabled(config, mode)) {
        return <NotFoundPage />;
    }

    return children(mode);
}
