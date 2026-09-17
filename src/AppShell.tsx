import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

import { OrganismSelect } from './components/OrganismSelect';
import {
    AnalysisModeBarContext,
    modeLabel,
    type AnalysisModeBarState,
} from './components/pageStateSelectors/wasap/AnalysisModeBarContext';
import { ExplorationModeInfo } from './components/pageStateSelectors/wasap/InfoBlocks';
import { Modal } from './components/shared/modal';

/**
 * The frame every route sits in: a minimal header with the organism selector,
 * and the routed content. Replaces the dashboards site chrome (`BaseLayout` /
 * `Breadcrumbs`).
 */
export function AppShell() {
    const [modeBarState, setModeBarState] = useState<AnalysisModeBarState | undefined>(undefined);

    return (
        <AnalysisModeBarContext.Provider value={{ state: modeBarState, setState: setModeBarState }}>
            <div className='flex min-h-full flex-col bg-stone-100'>
                <header className='border-b-brand-500 border-b-2 bg-stone-200'>
                    <div className='mx-auto flex w-full max-w-[110rem] flex-wrap items-center gap-x-4 gap-y-2 px-6 py-3'>
                        <span className='text-brand-900 text-lg leading-tight font-bold'>
                            W-ASAP — Wastewater Dashboards
                        </span>
                        {modeBarState && <AnalysisModeButtons state={modeBarState} />}
                        <div className='ml-auto'>
                            <OrganismSelect />
                        </div>
                    </div>
                </header>

                <main className='mx-auto flex w-full max-w-[110rem] flex-1 flex-col'>
                    <Outlet />
                </main>

                <ToastContainer position='bottom-right' />
            </div>
        </AnalysisModeBarContext.Provider>
    );
}

function AnalysisModeButtons({ state }: { state: AnalysisModeBarState }) {
    const { mode, setMode, availableModes } = state;

    return (
        <div className='flex flex-wrap items-center gap-1'>
            {availableModes.map((candidateMode) => (
                <button
                    key={candidateMode}
                    type='button'
                    onClick={() => setMode(candidateMode)}
                    className={
                        candidateMode === mode
                            ? 'bg-brand-700 rounded-md px-3 py-1 text-sm font-semibold text-white'
                            : 'text-brand-900 rounded-md px-3 py-1 text-sm font-semibold hover:bg-stone-300'
                    }
                >
                    {modeLabel(candidateMode)}
                </button>
            ))}
            <Modal
                buttonClassName='text-brand-900 hover:bg-stone-300 rounded-md px-3 py-1 text-sm font-semibold'
                buttonAriaLabel='Help: exploration modes explained'
                modalContent={<ExplorationModeInfo />}
                size='large'
            >
                Help
            </Modal>
        </div>
    );
}
