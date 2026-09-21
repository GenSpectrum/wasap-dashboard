import { Outlet } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

import { OrganismSelect } from './components/OrganismSelect';
import { WasapModeTabs } from './components/pageStateSelectors/wasap/WasapModeTabs';

/**
 * The frame every route sits in: a minimal header with the analysis mode tabs
 * and the organism selector, and the routed content. Replaces the dashboards site chrome (`BaseLayout` /
 * `Breadcrumbs`).
 */
export function AppShell() {
    return (
        <div className='bg-base-100 flex min-h-full flex-col'>
            <header className='border-base-300 border-b'>
                <div className='mx-auto flex w-full max-w-[110rem] flex-wrap items-center gap-x-4 gap-y-1 px-6 py-3'>
                    <span className='text-lg leading-tight font-semibold'>W-ASAP — Wastewater Dashboards</span>
                    <WasapModeTabs />
                    <div className='ml-auto'>
                        <OrganismSelect />
                    </div>
                </div>
            </header>

            <main className='mx-auto w-full max-w-[110rem] flex-1 px-6 py-6'>
                <Outlet />
            </main>

            <ToastContainer position='bottom-right' />
        </div>
    );
}
