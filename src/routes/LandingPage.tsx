import { Link } from 'react-router-dom';

import { listWastewaterOrganisms } from '../config/wastewaterOrganisms';

/**
 * The `/` route: pick an organism to open its dashboard. Replaces the old
 * auto-redirect to a hardcoded default organism.
 */
export function LandingPage() {
    const organisms = listWastewaterOrganisms();

    return (
        <div className='mx-auto max-w-3xl p-6'>
            <h1 className='mb-6 text-2xl font-semibold'>Choose an organism</h1>
            <ul className='grid gap-4 sm:grid-cols-3'>
                {organisms.map((entry) => (
                    <li key={entry.pathSegment}>
                        <Link
                            to={`/${entry.pathSegment}`}
                            className='border-base-300 hover:border-primary hover:bg-base-200 block h-full border p-4 transition-colors'
                        >
                            <div className='font-semibold'>{entry.config.name}</div>
                        </Link>
                    </li>
                ))}
            </ul>
            <p className='mt-8 text-gray-700'>
                Welcome to the Swiss W-ASAP instance, a highly interactive dashboard for exploring and analyzing viral
                sequencing data obtained from wastewater. More information can be found on the{' '}
                <Link className='link' to='/about'>
                    About page
                </Link>
                . The code is open-source and available on{' '}
                <a className='link' href='https://github.com/GenSpectrum/wasap-dashboard'>
                    GitHub
                </a>
                .
            </p>
        </div>
    );
}
