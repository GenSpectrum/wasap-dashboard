import { useParams, useSearchParams } from 'react-router-dom';

import { resolveWasapConfig } from '../config/wastewaterOrganisms';
import { WasapModeTabs } from './pageStateSelectors/wasap/WasapModeTabs';
import { parseDatasetFilter } from '../pageState/wasap/baseFilter';

/**
 * The tabs to pick the analysis mode of the organism whose page is open, for the header
 * (which sits above the routes, so it finds the organism in the URL itself). There are
 * none where no organism is open, like on the landing page.
 */
export function OrganismModeTabs() {
    const { organismPath } = useParams();
    const [searchParams] = useSearchParams();
    const config = resolveWasapConfig(organismPath);

    if (config === undefined) {
        return null;
    }

    return <WasapModeTabs config={config} dataset={parseDatasetFilter(searchParams, config)} />;
}
