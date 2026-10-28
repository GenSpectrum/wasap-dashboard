import { useParams } from 'react-router-dom';

import { NotFoundPage } from './NotFoundPage';
import { useOrganismLayoutContext } from '../components/layout/OrganismLayout';
import { CollectionPage } from '../components/modes/collection/CollectionPage';
import { CooccurrencePage } from '../components/modes/cooccurrence/CooccurrencePage';
import { DeconvolutionPage } from '../components/modes/deconvolution/DeconvolutionPage';
import { ManualPage } from '../components/modes/manual/ManualPage';
import { OverviewPage } from '../components/modes/overview/OverviewPage';
import { ResistancePage } from '../components/modes/resistance/ResistancePage';
import { UntrackedPage } from '../components/modes/untracked/UntrackedPage';
import { VariantExplorerPage } from '../components/modes/variantExplorer/VariantExplorerPage';
import { isModeEnabled } from '../config/organismConfig';
import { segmentToMode } from '../pageState/modes';

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
