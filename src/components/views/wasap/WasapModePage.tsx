import { WasapPage } from './WasapPage';
import { ManualPage } from './pages/ManualPage';
import { ResistancePage } from './pages/ResistancePage';
import { UntrackedPage } from './pages/UntrackedPage';
import { assertModeEnabled, type WasapPageConfig } from '../../../config/wasapPageConfig';
import { type WasapAnalysisMode } from '../../../pageState/wasap/wasapAnalysisFilter';

/**
 * The page of an analysis mode. The mode has to be enabled in the config (see `EnabledModeRoute`).
 */
export function WasapModePage({ config, mode }: { config: WasapPageConfig; mode: WasapAnalysisMode }) {
    switch (mode) {
        case 'manual':
            assertModeEnabled(config, 'manual');
            return <ManualPage config={config} />;
        case 'resistance':
            assertModeEnabled(config, 'resistance');
            return <ResistancePage config={config} />;
        case 'untracked':
            assertModeEnabled(config, 'untracked');
            return <UntrackedPage config={config} />;
        default:
            // The other modes are moving to pages of their own.
            return <WasapPage config={config} mode={mode} />;
    }
}
