import { NavLink } from 'react-router-dom';

import { ABOUT_ICON, OVERVIEW_ICON, useAboutPath, useModeNavigation } from './modeNavigation';

/**
 * The tabs to pick the analysis mode of the organism whose page is open, which is a page
 * each, on a wide page (a narrow one has the `ModeMenu` instead). The overview page is the
 * first tab, always there — unlike the modes, every organism has one. The modes come in their
 * groups, each with its label (if it has one) above its tabs and some space in front.
 * There are no tabs where no organism is open, like on the landing page.
 */
export function ModeTabs() {
    const navigation = useModeNavigation();

    if (navigation === undefined) {
        return null;
    }

    return (
        // Aligned at the bottom: the groups have their label above their tabs, so that all tabs are in one line.
        // As much space below as the labels take above, so that the line of tabs is in the middle of the nav.
        <nav aria-label='Analysis mode' className='flex items-end pb-2.5'>
            <Tab to={navigation.overviewPath} label='Overview' icon={OVERVIEW_ICON} end />
            {navigation.groups.map(({ label, links }) => (
                <div
                    key={links.map((link) => link.mode).join()}
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
                        {links.map((link) => (
                            <Tab key={link.mode} to={link.to} label={link.label} icon={link.icon} />
                        ))}
                    </div>
                </div>
            ))}
        </nav>
    );
}

/**
 * The link to the about page, looking like a tab. It is not among the tabs: it is about the
 * dashboard, not an analysis.
 */
export function AboutLink() {
    return <Tab to={useAboutPath()} label='About' icon={ABOUT_ICON} />;
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
