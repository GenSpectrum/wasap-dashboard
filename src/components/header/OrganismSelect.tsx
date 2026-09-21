import { useNavigate, useParams } from 'react-router-dom';

import { listWastewaterOrganisms } from '../../config/wastewaterOrganisms';

/**
 * Replaces Astro's per-page routing: pick an organism, navigate to its route.
 * The "Upload your own data" entry mentioned in the plan (step 3) will slot in
 * here once there's a WASM-SILO client to point it at.
 */
export function OrganismSelect() {
    const navigate = useNavigate();
    const { organismPath } = useParams();
    const organisms = listWastewaterOrganisms();

    return (
        <select
            className='select select-bordered select-sm'
            aria-label='Organism'
            value={organismPath ?? ''}
            onChange={(event) => void navigate(`/${event.target.value}`)}
        >
            {organisms.map((entry) => (
                <option key={entry.pathSegment} value={entry.pathSegment}>
                    {entry.config.name}
                </option>
            ))}
        </select>
    );
}
