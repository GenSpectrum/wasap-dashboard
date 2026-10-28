import { useParams } from 'react-router-dom';

import { OrganismLayout } from '../components/layout/OrganismLayout';
import { LoadingDisplay } from '../components/ui/LoadingDisplay';
import { NoDataDisplay } from '../components/ui/NoDataDisplay';
import type { OrganismConfig } from '../config/organismConfig';
import { resolveOrganismConfig } from '../config/wastewaterOrganisms';
import { useLineageTree } from '../externalData/fileBased/lineageTree/useLineageTree';
import { EMPTY_RESISTANCE_DATA, useResistanceData } from '../externalData/genSpectrum/useResistanceData';

/**
 * The `/:organismPath` route: resolves the per-organism config from the URL and fetches
 * resistance-mutation data, as well as the lineage tree. The page of the analysis mode
 * (see `ModeRoute`) is rendered inside the `OrganismLayout`.
 */
export function OrganismRoute() {
    const { organismPath } = useParams();
    const config = resolveOrganismConfig(organismPath);

    if (config === undefined) {
        return <NoDataDisplay message={`Organism '${organismPath}' doesn't exist or isn't configured.`} />;
    }

    return <OrganismDashboard config={config} />;
}

function OrganismDashboard({ config }: { config: OrganismConfig }) {
    const resistanceData = useResistanceData(config);
    const lineageTree = useLineageTree(config.lineageTree);

    if (resistanceData.isPending || lineageTree.isPending) {
        return <LoadingDisplay />;
    }

    return (
        <OrganismLayout
            config={config}
            resistanceData={resistanceData.data ?? EMPTY_RESISTANCE_DATA}
            lineageTree={lineageTree.data ?? undefined}
        />
    );
}
