import { NavLink, useParams, useSearchParams } from 'react-router-dom';

import { ExplorationModeInfo } from './InfoBlocks';
import { enabledAnalysisModes } from '../config/wasapPageConfig';
import { resolveWasapConfig } from '../config/wastewaterOrganisms';
import { Modal } from './shared/modal';
import { datasetFilterSearchParams, parseDatasetFilter } from '../pageState/wasap/baseFilter';
import { modeLabel, modePath } from '../pageState/wasap/wasapModes';

/**
 * The menu to pick the analysis mode of the organism whose page is open, which is a page
 * each. Picking a mode goes there right away, taking the dataset filter along (but not the
 * mean proportion, which has a different default in each mode).
 *
 * It is in the header, which sits above the routes, so it finds the organism and the dataset
 * filter in the URL itself. There are no tabs where no organism is open, like on the landing page.
 */
export function WasapModeTabs() {
    const { organismPath } = useParams();
    const [searchParams] = useSearchParams();
    const config = resolveWasapConfig(organismPath);

    if (config === undefined) {
        return null;
    }

    const search = datasetFilterSearchParams(parseDatasetFilter(searchParams, config), config).toString();

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
