import { useId, useRef, useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';

import { ABOUT_ICON, type ModeNavigation, OVERVIEW_ICON, useAboutPath, useModeNavigation } from './modeNavigation';
import { useCloseOnClickOutside, useCloseOnEsc } from '../../ui/floatingUiHooks';

/**
 * The navigation of a narrow page, in place of the `ModeTabs`: a button that names the page that is open,
 * and opens a list of all of them below the header — the overview, the modes in their groups and the about
 * page. Picking one goes there and closes the list. Nothing where no organism is open, like on the landing page.
 *
 * The list is placed against the header, which has to be `relative`.
 */
export function ModeMenu() {
    const navigation = useModeNavigation();
    const aboutPath = useAboutPath();
    const { pathname } = useLocation();
    const [isOpen, setIsOpen] = useState(false);
    const buttonRef = useRef<HTMLButtonElement>(null);
    const listRef = useRef<HTMLElement>(null);
    const listId = useId();

    useCloseOnClickOutside(listRef, buttonRef, setIsOpen);
    useCloseOnEsc(setIsOpen);

    if (navigation === undefined) {
        return null;
    }

    const close = () => setIsOpen(false);

    return (
        <>
            <button
                ref={buttonRef}
                type='button'
                className='flex max-w-full items-center gap-1.5 border border-stone-300 bg-white px-2.5 py-1.5 text-sm font-semibold whitespace-nowrap text-gray-800 hover:bg-stone-100'
                aria-expanded={isOpen}
                aria-controls={listId}
                onClick={() => setIsOpen((wasOpen) => !wasOpen)}
            >
                <span className='iconify mdi--menu shrink-0 text-lg' />
                {/* Cut short on the narrowest phones, rather than pushing the organism selector out. */}
                <span className='truncate'>{currentPageLabel(navigation, pathname, aboutPath)}</span>
                <span
                    className={`iconify hidden shrink-0 text-lg text-gray-500 sm:inline-block ${isOpen ? 'mdi--chevron-up' : 'mdi--chevron-down'}`}
                />
            </button>
            {isOpen && (
                <nav
                    ref={listRef}
                    id={listId}
                    aria-label='Analysis mode'
                    className='absolute top-full right-0 left-0 z-20 border-b-2 border-stone-300 bg-white py-2 shadow-lg sm:right-auto sm:left-4 sm:w-80 sm:border-x-2 lg:left-6'
                >
                    <MenuLink to={navigation.overviewPath} label='Overview' icon={OVERVIEW_ICON} onClick={close} end />
                    {navigation.groups.map(({ label, links }) => (
                        <div
                            key={links.map((link) => link.mode).join()}
                            role={label === undefined ? undefined : 'group'}
                            aria-label={label}
                            className='mt-2'
                        >
                            {label !== undefined && (
                                <div className='px-4 pt-1 pb-0.5 text-[10px] font-semibold tracking-wide text-gray-500 uppercase'>
                                    {label}
                                </div>
                            )}
                            {links.map((link) => (
                                <MenuLink
                                    key={link.mode}
                                    to={link.to}
                                    label={link.label}
                                    icon={link.icon}
                                    onClick={close}
                                />
                            ))}
                        </div>
                    ))}
                    <hr className='my-2 border-stone-200' />
                    <MenuLink to={aboutPath} label='About' icon={ABOUT_ICON} onClick={close} />
                </nav>
            )}
        </>
    );
}

/** What the button says: the label of the page that is open, or just "Menu" for one that isn't in it. */
function currentPageLabel(navigation: ModeNavigation, pathname: string, aboutPath: string) {
    if (pathname === navigation.overviewPath) {
        return 'Overview';
    }
    if (pathname === aboutPath) {
        return 'About';
    }
    const link = navigation.groups.flatMap((group) => group.links).find((link) => link.to.pathname === pathname);
    return link?.label ?? 'Menu';
}

function MenuLink({
    to,
    label,
    icon,
    onClick,
    end,
}: {
    to: string | { pathname: string; search: string };
    label: string;
    icon: string;
    onClick: () => void;
    end?: boolean;
}) {
    return (
        <NavLink
            to={to}
            end={end}
            onClick={onClick}
            className={({ isActive }) =>
                `flex items-center gap-2.5 border-l-[3px] px-4 py-2 text-sm font-semibold ${isActive ? 'border-brand-700 text-brand-700 bg-stone-100' : 'border-transparent text-gray-700 hover:bg-stone-100'}`
            }
        >
            <span className={`iconify ${icon} shrink-0 text-lg`} />
            {label}
        </NavLink>
    );
}
