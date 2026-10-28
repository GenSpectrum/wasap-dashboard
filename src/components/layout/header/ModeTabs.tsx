import { useEffect, useRef } from 'react';
import { NavLink, useLocation, useParams, useSearchParams } from 'react-router-dom';

import { enabledAnalysisModes } from '../../../config/organismConfig';
import { resolveOrganismConfig } from '../../../config/wastewaterOrganisms';
import { datasetFilterSearchParams, parseDatasetFilter } from '../../../pageState/baseFilter';
import { modeLabel, modePath } from '../../../pageState/modes';
import { ExplorationModeInfo } from '../../filterSidebar/InfoBlocks';
import { Modal } from '../../ui/Modal';

/**
 * The menu to pick the analysis mode of the organism whose page is open, which is a page
 * each. Picking a mode goes there right away, taking the dataset filter along (but not the
 * mean proportion, which has a different default in each mode). The overview page is the
 * first tab, always there — unlike the modes, every organism has one.
 *
 * It is in the header, which sits above the routes, so it finds the organism and the dataset
 * filter in the URL itself. There are no tabs where no organism is open, like on the landing page.
 */
export function ModeTabs() {
    const { organismPath } = useParams();
    const [searchParams] = useSearchParams();
    const config = resolveOrganismConfig(organismPath);
    const navRef = useRef<HTMLElement>(null);
    const { pathname } = useLocation();

    // On a narrow page the row of tabs scrolls sideways, so the tab of the open page may be out of view.
    useEffect(() => {
        navRef.current?.querySelector('[aria-current="page"]')?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
    }, [pathname]);

    if (config === undefined) {
        return null;
    }

    const search = datasetFilterSearchParams(parseDatasetFilter(searchParams, config), config).toString();

    return (
        // On a narrow page, the tabs stay in one row that scrolls sideways, rather than wrapping into many.
        <div className='flex items-center gap-1 lg:flex-wrap'>
            <nav
                ref={navRef}
                aria-label='Analysis mode'
                className='flex min-w-0 items-center gap-1 overflow-x-auto lg:flex-wrap'
            >
                {/* No search params: the overview page doesn't read the dataset filter, unlike the modes. */}
                <Tab to={config.path} label='Overview' end />
                {enabledAnalysisModes(config).map((mode) => (
                    <Tab key={mode} to={{ pathname: modePath(config.path, mode), search }} label={modeLabel(mode)} />
                ))}
            </nav>
            {/* Nudged down: the tabs have their underline below the text, which centers the row lower than the text. */}
            <Modal
                buttonClassName='shrink-0 translate-y-[3.5px] p-1 text-gray-700 hover:bg-stone-300'
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
                `px-3 py-1 text-sm font-semibold whitespace-nowrap ${isActive ? 'text-brand-700' : 'text-gray-700 hover:bg-stone-300'}`
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
