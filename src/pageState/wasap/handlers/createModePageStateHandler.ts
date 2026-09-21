import { CollectionPageStateHandler } from './CollectionPageStateHandler';
import { CovSpectrumCollectionPageStateHandler } from './CovSpectrumCollectionPageStateHandler';
import { ManualPageStateHandler } from './ManualPageStateHandler';
import { ResistancePageStateHandler } from './ResistancePageStateHandler';
import { UntrackedPageStateHandler } from './UntrackedPageStateHandler';
import { VariantExplorerPageStateHandler } from './VariantExplorerPageStateHandler';
import { isModeEnabled, type WasapPageConfig } from '../../../config/wasapPageConfig';
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
            return new ManualPageStateHandler(narrow(config, 'manual'));
        case 'variant':
            return new VariantExplorerPageStateHandler(narrow(config, 'variant'));
        case 'resistance':
            return new ResistancePageStateHandler(narrow(config, 'resistance'));
        case 'untracked':
            return new UntrackedPageStateHandler(narrow(config, 'untracked'));
        case 'covSpectrumCollection':
            return new CovSpectrumCollectionPageStateHandler(narrow(config, 'covSpectrumCollection'));
        case 'collection':
            return new CollectionPageStateHandler(narrow(config, 'collection'));
    }
}

function narrow<Mode extends WasapAnalysisMode>(config: WasapPageConfig, mode: Mode) {
    if (!isModeEnabled(config, mode)) {
        throw Error(`The '${mode}' analysis mode is not enabled.`);
    }
    return config;
}
