import { Link, useParams } from 'react-router-dom';

import { ModeMenu } from './ModeMenu';
import { AboutLink, ModeTabs } from './ModeTabs';
import { OrganismSelect } from './OrganismSelect';
import { resolveOrganismConfig } from '../../../config/wastewaterOrganisms';

/**
 * The header of every page: the title (a link to the landing page), the navigation between the pages of
 * the organism that is open (if one is), and the link to the about page and the organism selector at the far end.
 *
 * On a wide page, the navigation is the mode tabs, in the middle. On a narrower one, where they don't fit,
 * it is the `ModeMenu` next to the title instead, which has the about page in it as well.
 */
export function AppHeader() {
    const { organismPath } = useParams();
    const isOrganismOpen = resolveOrganismConfig(organismPath) !== undefined;

    return (
        <header className='relative border-b-2 border-b-stone-300 bg-stone-200'>
            {/* On a wide page, the sides take the same width, so that the tabs are centered on the page. */}
            <div className='mx-auto flex w-full max-w-[110rem] items-center gap-3 px-4 py-3 sm:gap-4 lg:px-6 xl:grid xl:grid-cols-[minmax(max-content,1fr)_auto_minmax(max-content,1fr)]'>
                <Link to='/' className='flex flex-col justify-self-start leading-tight whitespace-nowrap'>
                    <span className='text-lg font-bold text-gray-900'>W-ASAP</span>
                    {/* Not on a phone, where the menu and the organism selector need the room. */}
                    <span className='hidden text-xs text-gray-600 sm:inline'>Wastewater Dashboard</span>
                </Link>
                {/* As tall as the grouped tabs even where there are none, so that the header keeps its height across pages. */}
                <div className='hidden min-h-[3.25rem] xl:block'>
                    <ModeTabs />
                </div>
                <div className='min-w-0 xl:hidden'>
                    <ModeMenu />
                </div>
                <div className='ml-auto flex shrink-0 items-center gap-4 justify-self-end'>
                    <div className={isOrganismOpen ? 'hidden xl:block' : ''}>
                        <AboutLink />
                    </div>
                    <OrganismSelect />
                </div>
            </div>
        </header>
    );
}
