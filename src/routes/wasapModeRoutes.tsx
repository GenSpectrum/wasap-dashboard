import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';

import { NoDataDisplay } from '../components/shared/no-data-display';
import { getDefaultAnalysisMode, isModeEnabled, type WasapPageConfig } from '../config/wasapPageConfig';
import type { WasapAnalysisMode } from '../pageState/wasap/wasapAnalysisFilter';
import { modePath, segmentToMode } from '../pageState/wasap/wasapModes';

/**
 * The bare URL of an organism (like `/covid`), which goes to the page of its
 * default mode. The search params (a shared base filter, say) are kept.
 */
export function DefaultModeRedirect({ config }: { config: WasapPageConfig }) {
    const { search } = useLocation();
    const mode = getDefaultAnalysisMode(config);

    if (mode === undefined) {
        return <NoDataDisplay message={`No analysis mode is enabled for '${config.name}'.`} />;
    }

    return <Navigate to={{ pathname: modePath(config.path, mode), search }} replace />;
}

/**
 * The page of the mode in the URL (`/covid/:mode`), or the default mode's page
 * if that is not the segment of a mode, or the mode is not enabled here.
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
        return <DefaultModeRedirect config={config} />;
    }

    return children(mode);
}
