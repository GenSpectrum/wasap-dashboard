/** Rendered in place of a `/:organismPath/:mode` URL whose mode segment isn't one this organism has. */
export function NotFoundPage() {
    return (
        <div className='flex h-full w-full items-center justify-center border border-stone-300 bg-white p-8'>
            <div className='text-center'>
                <h1 className='text-lg font-semibold'>Page not found</h1>
                <p className='text-sm'>There is no page at this address.</p>
            </div>
        </div>
    );
}
