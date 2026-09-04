import { Outlet } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

import { OrganismSelect } from './components/OrganismSelect';

/**
 * The frame every route sits in: a minimal header with the organism selector,
 * and the routed content. Replaces the dashboards site chrome (`BaseLayout` /
 * `DataPageLayout` / `Breadcrumbs`).
 */
export function AppShell() {
    return (
        <div className='flex min-h-full flex-col bg-base-100'>
            <header className='border-b border-base-300'>
                <div className='mx-auto flex w-full max-w-[110rem] flex-wrap items-center gap-x-4 gap-y-1 px-6 py-3'>
                    <span className='text-lg leading-tight font-semibold'>W-ASAP — Wastewater Dashboards</span>
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
