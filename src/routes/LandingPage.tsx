import { Link } from 'react-router-dom';

import { listWastewaterOrganisms } from '../config/wastewaterOrganisms';

/**
 * The `/` route: pick an organism to open its dashboard. Replaces the old
 * auto-redirect to a hardcoded default organism.
 */
export function LandingPage() {
    const organisms = listWastewaterOrganisms();

    return (
        <div className='mx-auto max-w-3xl'>
            <h1 className='mb-6 text-2xl font-semibold'>Choose an organism</h1>
            <ul className='grid gap-4 sm:grid-cols-2'>
                {organisms.map((entry) => (
                    <li key={entry.pathSegment}>
                        <Link
                            to={`/${entry.pathSegment}`}
                            className='border-base-300 hover:border-primary hover:bg-base-200 block h-full border p-4 transition-colors'
                        >
                            <div className='font-semibold'>{entry.config.name}</div>
                            <div className='text-base-content/70 mt-1 text-sm'>{entry.config.description}</div>
                        </Link>
                    </li>
                ))}
            </ul>
        </div>
    );
}
