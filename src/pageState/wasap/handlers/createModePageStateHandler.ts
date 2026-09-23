import { CollectionPageStateHandler } from './CollectionPageStateHandler';
import { ManualPageStateHandler } from './ManualPageStateHandler';
import { ResistancePageStateHandler } from './ResistancePageStateHandler';
import { UntrackedPageStateHandler } from './UntrackedPageStateHandler';
import { VariantExplorerPageStateHandler } from './VariantExplorerPageStateHandler';
import { assertModeEnabled, type WasapPageConfig } from '../../../config/wasapPageConfig';
import { type PageStateHandler } from '../../PageStateHandler';
import { type WasapAnalysisMode, type WasapFilter } from '../wasapAnalysisFilter';

/**
 * The page state handler of the given mode, for when the mode is not known
 * statically (a page that knows its mode creates the handler itself).
 */
export function createModePageStateHandler(
    config: WasapPageConfig,
    mode: WasapAnalysisMode,
): PageStateHandler<WasapFilter> {
    switch (mode) {
        case 'manual':
            return new ManualPageStateHandler(narrowed(config, 'manual'));
        case 'variant':
            return new VariantExplorerPageStateHandler(narrowed(config, 'variant'));
        case 'resistance':
            return new ResistancePageStateHandler(narrowed(config, 'resistance'));
        case 'untracked':
            return new UntrackedPageStateHandler(narrowed(config, 'untracked'));
        case 'collection':
            return new CollectionPageStateHandler(narrowed(config, 'collection'));
    }
}

function narrowed<Mode extends WasapAnalysisMode>(config: WasapPageConfig, mode: Mode) {
    assertModeEnabled(config, mode);
    return config;
}
