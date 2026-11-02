import { useEffect, useRef } from 'react';
import { NavLink, useLocation, useParams, useSearchParams } from 'react-router-dom';

import { isModeEnabled } from '../../../config/organismConfig';
import { resolveOrganismConfig } from '../../../config/wastewaterOrganisms';
import { type AnalysisMode } from '../../../pageState/analysisFilter';
import { datasetFilterSearchParams, parseDatasetFilter } from '../../../pageState/baseFilter';
import { MODE_GROUPS, modeLabel, modePath } from '../../../pageState/modes';

// Spelled out in full, so that Tailwind finds the icon classes in the source.
const MODE_ICONS = {
    deconvolution: 'mdi--chart-areaspline',
    variant: 'wasap--mutation-row',
    cooccurrence: 'mdi--set-center',
    resistance: 'mdi--shield-outline',
    untracked: 'mdi--radar',
    manual: 'mdi--pencil-outline',
    collection: 'mdi--folder-multiple-outline',
} as const satisfies Record<AnalysisMode, string>;

/**
 * The menu to pick the analysis mode of the organism whose page is open, which is a page
 * each. Picking a mode goes there right away, taking the dataset filter along (but not the
 * mean proportion, which has a different default in each mode). The overview page is the
 * first tab, always there — unlike the modes, every organism has one. The modes come in their
 * groups, each with its label (if it has one) above its tabs and some space in front.
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
        // Where the page is too narrow, the tabs stay in one row that scrolls sideways, rather than wrapping into many.
        // Aligned at the bottom: the groups have their label above their tabs, so that all tabs are in one line.
        // As much space below as the labels take above, so that the line of tabs is in the middle of the nav.
        <nav ref={navRef} aria-label='Analysis mode' className='flex min-w-0 items-end overflow-x-auto pb-2.5'>
            {/* No search params: the overview page doesn't read the dataset filter, unlike the modes. */}
            <Tab to={config.path} label='Overview' icon='mdi--view-dashboard-outline' end />
            {MODE_GROUPS.map(({ label, modes }) => {
                const enabledModes = modes.filter((mode) => isModeEnabled(config, mode));
                if (enabledModes.length === 0) {
                    return null;
                }
                return (
                    <div
                        key={modes.join()}
                        role={label === undefined ? undefined : 'group'}
                        aria-label={label}
                        className='ml-6 flex shrink-0 flex-col'
                    >
                        {label !== undefined && (
                            <span className='px-2 text-[10px] leading-none font-semibold tracking-wide text-gray-500 uppercase'>
                                {label}
                            </span>
                        )}
                        <div className='flex items-center'>
                            {enabledModes.map((mode) => (
                                <Tab
                                    key={mode}
                                    to={{ pathname: modePath(config.path, mode), search }}
                                    label={modeLabel(mode)}
                                    icon={MODE_ICONS[mode]}
                                />
                            ))}
                        </div>
                    </div>
                );
            })}
        </nav>
    );
}

/**
 * The link to the about page of the organism that is open, looking like a tab. It is not among the
 * tabs: it is about the dashboard, not an analysis. None where no organism is open.
 */
export function AboutLink() {
    const { organismPath } = useParams();
    const config = resolveOrganismConfig(organismPath);
    if (config === undefined) {
        return null;
    }
    return <Tab to={`${config.path}/about`} label='About' icon='mdi--information-outline' />;
}

function Tab({
    to,
    label,
    icon,
    end,
}: {
    to: string | { pathname: string; search: string };
    label: string;
    icon: string;
    end?: boolean;
}) {
    return (
        <NavLink
            to={to}
            end={end}
            className={({ isActive }) =>
                `flex items-center gap-1.5 px-2 py-1 text-sm font-semibold whitespace-nowrap ${isActive ? 'text-brand-700' : 'text-gray-700 hover:bg-stone-300'}`
            }
        >
            {({ isActive }) => (
                // The underline is on the text itself, not on the link: one on the link would run
                // across its padding as well, wider than the label it marks.
                <>
                    <span className={`iconify ${icon} shrink-0 text-base`} />
                    <span className={`border-b-[3px] pb-px ${isActive ? 'border-brand-700' : 'border-transparent'}`}>
                        {label}
                    </span>
                </>
            )}
        </NavLink>
    );
}
