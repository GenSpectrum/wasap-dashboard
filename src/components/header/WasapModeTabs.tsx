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
 * mean proportion, which has a different default in each mode). The overview page is the
 * first tab, always there — unlike the modes, every organism has one.
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
                {/* No search params: the overview page doesn't read the dataset filter, unlike the modes. */}
                <Tab to={config.path} label='Overview' end />
                {enabledAnalysisModes(config).map((mode) => (
                    <Tab key={mode} to={{ pathname: modePath(config.path, mode), search }} label={modeLabel(mode)} />
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

function Tab({ to, label, end }: { to: string | { pathname: string; search: string }; label: string; end?: boolean }) {
    return (
        <NavLink
            to={to}
            end={end}
            className={({ isActive }) =>
                `px-3 py-1 text-sm font-semibold ${isActive ? 'text-brand-700' : 'text-gray-700 hover:bg-stone-300'}`
            }
        >
            {({ isActive }) => (
                // The underline is on the text itself, not on the link: one on the link would run
                // across its padding as well, wider than the label it marks.
                <span className={`border-b-[3px] pb-px ${isActive ? 'border-brand-700' : 'border-transparent'}`}>
                    {label}
                </span>
            )}
        </NavLink>
    );
}
