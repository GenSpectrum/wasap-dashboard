import { Link } from 'react-router-dom';

import { AboutLink, ModeTabs } from './ModeTabs';
import { OrganismSelect } from './OrganismSelect';

/**
 * The header of every page: the title (a link to the landing page), the tabs to pick the analysis mode of the organism
 * that is open (if one is) in the middle, and the link to the about page and the organism selector
 * at the far end.
 */
export function AppHeader() {
    return (
        <header className='border-b-2 border-b-stone-300 bg-stone-200'>
            {/* The sides take the same width, so that the tabs are centered on the page. Where there isn't room, the tabs shrink and scroll. */}
            <div className='mx-auto grid w-full max-w-[110rem] grid-cols-[minmax(max-content,1fr)_minmax(0,auto)_minmax(max-content,1fr)] items-center gap-4 px-4 py-3 lg:px-6'>
                <Link to='/' className='flex flex-col justify-self-start leading-tight whitespace-nowrap'>
                    <span className='text-lg font-bold text-gray-900'>W-ASAP</span>
                    <span className='text-xs text-gray-600'>Wastewater Dashboard</span>
                </Link>
                {/* As tall as the grouped tabs even where there are none, so that the header keeps its height across pages. */}
                <div className='min-h-[3.25rem] min-w-0'>
                    <ModeTabs />
                </div>
                <div className='flex items-center gap-4 justify-self-end'>
                    <AboutLink />
                    <OrganismSelect />
                </div>
            </div>
        </header>
    );
}
