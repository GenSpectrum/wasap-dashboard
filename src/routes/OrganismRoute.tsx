import { useParams } from 'react-router-dom';

import { NotFoundPage } from './NotFoundPage';
import { OrganismLayout, useOrganismLayoutContext } from '../components/layout/OrganismLayout';
import { CollectionPage } from '../components/modes/collection/CollectionPage';
import { CooccurrencePage } from '../components/modes/cooccurrence/CooccurrencePage';
import { DeconvolutionPage } from '../components/modes/deconvolution/DeconvolutionPage';
import { ManualPage } from '../components/modes/manual/ManualPage';
import { OverviewPage } from '../components/modes/overview/OverviewPage';
import { ResistancePage } from '../components/modes/resistance/ResistancePage';
import { UntrackedPage } from '../components/modes/untracked/UntrackedPage';
import { VariantExplorerPage } from '../components/modes/variantExplorer/VariantExplorerPage';
import { LoadingDisplay } from '../components/ui/LoadingDisplay';
import { NoDataDisplay } from '../components/ui/NoDataDisplay';
import { isModeEnabled, type OrganismConfig } from '../config/organismConfig';
import { resolveOrganismConfig } from '../config/wastewaterOrganisms';
import { useLineageTree } from '../externalData/fileBased/lineageTree/useLineageTree';
import { EMPTY_RESISTANCE_DATA, useResistanceData } from '../externalData/genSpectrum/useResistanceData';
import { segmentToMode } from '../pageState/modes';

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

/** The index route of `/:organismPath`, and the landing page of the organism. */
export function OverviewRoute() {
    const { config } = useOrganismLayoutContext();
    return <OverviewPage amplicons={config.amplicons} />;
}

/**
 * The `/:organismPath/:mode` route: the page of the mode in the URL, or a 404 where the
 * segment isn't that of a mode this organism has enabled.
 */
export function ModeRoute() {
    const { config } = useOrganismLayoutContext();
    const { mode: segment } = useParams();

    switch (segmentToMode(segment)) {
        case 'manual':
            return isModeEnabled(config, 'manual') ? <ManualPage config={config} /> : <NotFoundPage />;
        case 'variant':
            return isModeEnabled(config, 'variant') ? <VariantExplorerPage config={config} /> : <NotFoundPage />;
        case 'resistance':
            return isModeEnabled(config, 'resistance') ? <ResistancePage config={config} /> : <NotFoundPage />;
        case 'untracked':
            return isModeEnabled(config, 'untracked') ? <UntrackedPage config={config} /> : <NotFoundPage />;
        case 'collection':
            return isModeEnabled(config, 'collection') ? <CollectionPage config={config} /> : <NotFoundPage />;
        case 'deconvolution':
            return isModeEnabled(config, 'deconvolution') ? <DeconvolutionPage config={config} /> : <NotFoundPage />;
        case 'cooccurrence':
            return isModeEnabled(config, 'cooccurrence') ? <CooccurrencePage config={config} /> : <NotFoundPage />;
        case undefined:
            return <NotFoundPage />;
    }
}
