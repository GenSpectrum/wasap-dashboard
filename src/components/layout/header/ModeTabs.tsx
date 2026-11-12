import { type ReactNode } from 'react';
import { NavLink } from 'react-router-dom';

import { ABOUT_ICON, OVERVIEW_ICON, useAboutPath, useModeNavigation } from './modeNavigation';

/**
 * The tabs to pick the analysis mode of the organism whose page is open, which is a page
 * each, on a wide page (a narrow one has the `ModeMenu` instead). The overview page is the
 * first tab, always there — unlike the modes, every organism has one. Each group of tabs sits
 * in a grey tray of its own, the overview as well, with the label of the group (if it has one)
 * in front of it. There are no tabs where no organism is open, like on the landing page.
 */
export function ModeTabs() {
    const navigation = useModeNavigation();

    if (navigation === undefined) {
        return null;
    }

    return (
        <nav aria-label='Analysis mode' className='flex items-center gap-4'>
            <Tray>
                <Tab to={navigation.overviewPath} label='Overview' icon={OVERVIEW_ICON} end />
            </Tray>
            {navigation.groups.map(({ label, links }) => (
                <div
                    key={links.map((link) => link.mode).join()}
                    role={label === undefined ? undefined : 'group'}
                    aria-label={label}
                    className='flex shrink-0 items-center gap-1'
                >
                    {label !== undefined && (
                        <span className='px-2 text-[10px] leading-none font-semibold tracking-wide text-gray-500 uppercase'>
                            {label}
                        </span>
                    )}
                    <Tray>
                        {links.map((link) => (
                            <Tab key={link.mode} to={link.to} label={link.label} icon={link.icon} />
                        ))}
                    </Tray>
                </div>
            ))}
        </nav>
    );
}

function Tray({ children }: { children: ReactNode }) {
    return <div className='flex items-center overflow-hidden rounded-xs bg-stone-100'>{children}</div>;
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
        // The bar under the active tab is an inset shadow, not a border: it takes no room, so that the tab doesn't move.
        <NavLink
            to={to}
            end={end}
            className={({ isActive }) =>
                `flex items-center gap-1.5 px-3 py-1.5 text-sm font-semibold whitespace-nowrap ${isActive ? 'text-brand-700 bg-white shadow-[inset_0_-2px_0_var(--color-brand-700)]' : 'text-gray-700 hover:bg-stone-50'}`
            }
        >
            <span className={`iconify ${icon} shrink-0 text-base`} />
            {label}
        </NavLink>
    );
}
