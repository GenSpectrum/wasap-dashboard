import { NavLink, useParams, useSearchParams } from 'react-router-dom';

import { enabledAnalysisModes } from '../../config/wasapPageConfig';
import { resolveWasapConfig } from '../../config/wastewaterOrganisms';
import { datasetFilterSearchParams, parseDatasetFilter } from '../../pageState/wasap/baseFilter';
import { modeLabel, modePath } from '../../pageState/wasap/wasapModes';
import { ExplorationModeInfo } from '../InfoBlocks';
import { Modal } from '../shared/modal';

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
        <div className='flex flex-wrap items-center gap-1'>
            <nav aria-label='Analysis mode' className='flex flex-wrap items-center gap-1'>
                {enabledAnalysisModes(config).map((mode) => (
                    <NavLink
                        key={mode}
                        to={{ pathname: modePath(config.path, mode), search }}
                        className={({ isActive }) =>
                            `px-3 py-1 text-sm font-semibold ${isActive ? 'text-brand-700' : 'text-gray-700 hover:bg-stone-300'}`
                        }
                    >
                        {({ isActive }) => (
                            // The underline is on the text itself, not on the link: one on the link would run
                            // across its padding as well, wider than the label it marks.
                            <span
                                className={`border-b-[3px] pb-px ${isActive ? 'border-brand-700' : 'border-transparent'}`}
                            >
                                {modeLabel(mode)}
                            </span>
                        )}
                    </NavLink>
                ))}
            </nav>
            {/* Nudged down: the tabs have their underline below the text, which centers the row lower than the text. */}
            <Modal
                buttonClassName='translate-y-[3.5px] p-1 text-gray-700 hover:bg-stone-300'
                buttonAriaLabel='Show information about the analysis modes'
                modalContent={<ExplorationModeInfo />}
                size='large'
            >
                <span className='iconify mdi--help-circle-outline text-xl' />
            </Modal>
        </div>
    );
}
