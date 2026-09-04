/**
 * Placeholder landing route for the scaffold (PR 1a).
 *
 * Replaced in PR 1c by the real `/:organism` route (`WasapRoute.tsx`), which
 * fetches resistance data and renders `<WasapPage>`.
 */
export function ScaffoldRoute() {
    return (
        <div className='rounded-box border border-base-300 p-8'>
            <h1 className='text-xl font-semibold'>Scaffold ready</h1>
            <p className='mt-2 text-sm text-base-content/70'>
                Vite + React + TypeScript, hash router, Tailwind v4 + daisyUI. The wastewater dashboard code lands on
                top of this in steps 1b and 1c.
            </p>
        </div>
    );
}
