import { NavLink } from 'react-router-dom';

import { ExplorationModeInfo } from './InfoBlocks';
import { enabledAnalysisModes, type WasapPageConfig } from '../../../config/wasapPageConfig';
import { datasetFilterSearchParams } from '../../../pageState/wasap/baseFilter';
import { type WasapDatasetFilter } from '../../../pageState/wasap/wasapAnalysisFilter';
import { modeLabel, modePath } from '../../../pageState/wasap/wasapModes';
import { Modal } from '../../shared/modal';

/**
 * The menu to pick the analysis mode, which is a page each. Picking a mode goes
 * there right away, taking the dataset filter along (but not the mean
 * proportion, which has a different default in each mode).
 */
export function WasapModeTabs({ config, dataset }: { config: WasapPageConfig; dataset: WasapDatasetFilter }) {
    const search = datasetFilterSearchParams(dataset, config).toString();

    return (
        <div className='flex items-center justify-between gap-2'>
            <nav aria-label='Analysis mode' className='tabs tabs-border'>
                {enabledAnalysisModes(config).map((mode) => (
                    <NavLink
                        key={mode}
                        to={{ pathname: modePath(config.path, mode), search }}
                        className={({ isActive }) => `tab ${isActive ? 'tab-active' : ''}`}
                    >
                        {modeLabel(mode)}
                    </NavLink>
                ))}
            </nav>
            <Modal
                buttonClassName='btn btn-xs'
                buttonAriaLabel='Show information about the analysis modes'
                modalContent={<ExplorationModeInfo />}
                size='large'
            >
                ?
            </Modal>
        </div>
    );
}
