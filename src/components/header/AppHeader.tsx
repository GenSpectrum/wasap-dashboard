import { OrganismSelect } from './OrganismSelect';
import { WasapModeTabs } from './WasapModeTabs';

/**
 * The header of every page: the title, the tabs to pick the analysis mode of the
 * organism that is open (if one is), and the organism selector at the far end.
 */
export function AppHeader() {
    return (
        <header className='border-b-2 border-b-stone-300 bg-stone-200'>
            <div className='mx-auto flex w-full max-w-[110rem] flex-wrap items-center gap-x-4 gap-y-2 px-6 py-3'>
                {/*
                  Fixed width so that the text of the first tab lines up with the content of the
                  dataset filter row below: the sidebar is 300px wide (see ModePageLayout) plus the
                  24px padding of what is in it, which is 324px from the left of the page container.
                  This block starts 24px in (the px-6 above), then the gap-x-4 adds 16px and the tab
                  has 12px (px-3) of padding before its text, so the block is 324 - 24 - 16 - 12 = 272px.
                */}
                <div className='flex w-[272px] shrink-0 flex-col leading-tight'>
                    <span className='text-lg font-bold text-gray-900'>W-ASAP</span>
                    <span className='text-xs text-gray-600'>Wastewater Dashboard</span>
                </div>
                <WasapModeTabs />
                <div className='ml-auto'>
                    <OrganismSelect />
                </div>
            </div>
        </header>
    );
}
