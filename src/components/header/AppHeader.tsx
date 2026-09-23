import { OrganismSelect } from './OrganismSelect';
import { WasapModeTabs } from './WasapModeTabs';

/**
 * The header of every page: the title, the tabs to pick the analysis mode of the
 * organism that is open (if one is), and the organism selector at the far end.
 */
export function AppHeader() {
    return (
        <header className='border-b-2 border-b-stone-300 bg-stone-200'>
            <div className='mx-auto grid w-full max-w-[110rem] grid-cols-[1fr_auto_1fr] items-center gap-x-4 gap-y-2 px-6 py-3'>
                <div className='flex flex-col justify-self-start leading-tight'>
                    <span className='text-lg font-bold text-gray-900'>W-ASAP</span>
                    <span className='text-xs text-gray-600'>Wastewater Dashboard</span>
                </div>
                <div className='justify-self-center'>
                    <WasapModeTabs />
                </div>
                <div className='justify-self-end'>
                    <OrganismSelect />
                </div>
            </div>
        </header>
    );
}
