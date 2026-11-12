import { useParams } from 'react-router-dom';

import { ModeMenu } from './ModeMenu';
import { AboutLink, ModeTabs } from './ModeTabs';
import { OrganismSelect } from './OrganismSelect';
import { resolveOrganismConfig } from '../../../config/wastewaterOrganisms';

/**
 * The header of every page: the navigation between the pages of the organism that is open (if one is),
 * on the left, and the link to the about page and the organism selector at the far end.
 *
 * On a wide page, the navigation is the mode tabs. On a narrower one, where they don't fit,
 * it is the `ModeMenu` instead, which has the about page in it as well.
 */
export function AppHeader() {
    const { organismPath } = useParams();
    const isOrganismOpen = resolveOrganismConfig(organismPath) !== undefined;

    return (
        <header className='relative border-b border-stone-300 bg-stone-200'>
            <div className='flex w-full items-center gap-3 px-4 py-3 sm:gap-4 lg:px-6'>
                {/* As tall as the trays of tabs even where there are none, so that the header keeps its height across pages. */}
                <div className='nav:block hidden min-h-8'>
                    <ModeTabs />
                </div>
                <div className='nav:hidden min-w-0'>
                    <ModeMenu />
                </div>
                <div className='ml-auto flex shrink-0 items-center gap-4'>
                    <div className={isOrganismOpen ? 'nav:block hidden' : ''}>
                        <AboutLink />
                    </div>
                    <OrganismSelect />
                </div>
            </div>
        </header>
    );
}
