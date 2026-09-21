import { OrganismSelect } from './OrganismSelect';
import { WasapModeTabs } from './WasapModeTabs';

/**
 * The header of every page: the title, the tabs to pick the analysis mode of the
 * organism that is open (if one is), and the organism selector at the far end.
 */
export function AppHeader() {
    return (
        <header className='border-base-300 border-b'>
            <div className='mx-auto flex w-full max-w-[110rem] flex-wrap items-center gap-x-4 gap-y-1 px-6 py-3'>
                <span className='text-lg leading-tight font-semibold'>W-ASAP — Wastewater Dashboards</span>
                <WasapModeTabs />
                <div className='ml-auto'>
                    <OrganismSelect />
                </div>
            </div>
        </header>
    );
}
