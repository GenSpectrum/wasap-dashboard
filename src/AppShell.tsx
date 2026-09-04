import { Outlet } from 'react-router-dom';

/**
 * The frame every route sits in: a minimal header and the routed content.
 *
 * This replaces the dashboards site chrome (`BaseLayout` / `DataPageLayout` /
 * `Breadcrumbs`). Step 1c adds the organism dropdown to the header
 * (`02-step-1-standalone-repo.md` §1.3–1.4); for now it is just the title.
 */
export function AppShell() {
    return (
        <div className='flex min-h-full flex-col bg-base-100'>
            <header className='border-b border-base-300'>
                <div className='mx-auto flex w-full max-w-[110rem] flex-wrap items-center gap-x-4 gap-y-1 px-6 py-3'>
                    <span className='text-lg leading-tight font-semibold'>W-ASAP — Wastewater Dashboards</span>
                    {/* Step 1c: <OrganismSelect> goes here. */}
                </div>
            </header>

            <main className='mx-auto w-full max-w-[110rem] flex-1 px-6 py-6'>
                <Outlet />
            </main>
        </div>
    );
}
