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
        <div className='bg-base-100 flex min-h-full flex-col'>
            <AppHeader />

            <main className='mx-auto w-full max-w-[110rem] flex-1 px-6 py-6'>
                <Outlet />
            </main>

            <ToastContainer position='bottom-right' />
        </div>
    );
}
