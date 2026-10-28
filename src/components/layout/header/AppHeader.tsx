import { ModeTabs } from './ModeTabs';
import { OrganismSelect } from './OrganismSelect';

/**
 * The header of every page: the title, the tabs to pick the analysis mode of the
 * organism that is open (if one is), and the organism selector at the far end.
 */
export function AppHeader() {
    return (
        <header className='border-b-2 border-b-stone-300 bg-stone-200'>
            {/* Below lg, the tabs get a row of their own under the title and the organism selector. */}
            <div className='mx-auto grid w-full max-w-[110rem] grid-cols-[1fr_auto] items-center gap-x-4 gap-y-2 px-4 py-3 lg:grid-cols-[1fr_auto_1fr] lg:px-6'>
                <div className='flex flex-col justify-self-start leading-tight'>
                    <span className='text-lg font-bold text-gray-900'>W-ASAP</span>
                    <span className='text-xs text-gray-600'>Wastewater Dashboard</span>
                </div>
                <div className='order-last col-span-2 min-w-0 lg:order-none lg:col-span-1 lg:justify-self-center'>
                    <ModeTabs />
                </div>
                <div className='justify-self-end'>
                    <OrganismSelect />
                </div>
            </div>
        </header>
    );
}
