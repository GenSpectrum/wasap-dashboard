import { Outlet } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

import { AppHeader } from './components/header/AppHeader';

/**
 * The frame every route sits in: the header, and the routed content. Replaces
 * the dashboards site chrome (`BaseLayout` / `Breadcrumbs`).
 */
export function AppShell() {
    return (
        <div className='flex min-h-full flex-col bg-stone-100'>
            <AppHeader />

            <main className='mx-auto flex w-full max-w-[110rem] flex-1 flex-col'>
                <Outlet />
            </main>

            <ToastContainer position='bottom-right' />
        </div>
    );
}
