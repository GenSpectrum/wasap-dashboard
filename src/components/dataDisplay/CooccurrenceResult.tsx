import { type To } from 'react-router-dom';

import { Cooccurrence } from './cooccurrence/cooccurrence';
import { type SiloReadFilter } from '../../dataLayer/queries';
import { type LineageTree } from '../../lineageTree/lineageTree';
import {
    DEFAULT_ENTROPY_CUTOFF_BITS,
    effectivePositionSource,
    type WasapBaseFilter,
    type WasapCooccurrenceFilter,
} from '../../pageState/wasap/wasapAnalysisFilter';

/**
 * The co-occurrence bands of a mode that selects positions.
 */
export function CooccurrenceResult({
    base,
    analysis,
    filter,
    meanProportionInterval,
    lineageTree,
    manualModeLink,
    variantModeLink,
}: {
    base: WasapBaseFilter;
    analysis: WasapCooccurrenceFilter;
    filter: SiloReadFilter;
    meanProportionInterval: { min: number; max: number };
    /** EXPERIMENTAL: enables the panel-of-lineages match, when the organism has a lineage tree. */
    lineageTree?: LineageTree;
    /** Opens a row's mutations in the manual mode, when it is enabled. */
    manualModeLink?: (mutations: string[]) => To;
    /** Opens a panel-match lineage in the variant explorer, when it is enabled. */
    variantModeLink?: (lineage: string) => To;
}) {
    const commonProps = {
        filter,
        sequenceType: analysis.sequenceType,
        granularity: base.granularity,
        pageSizes: [20, 50, 100, 250],
        meanProportionInterval,
        panel: analysis.panel,
        lineageTree,
        manualModeLink,
        variantModeLink,
    };

    return effectivePositionSource(analysis) === 'amplicon' ? (
        <Cooccurrence
            {...commonProps}
            positionSource='amplicon'
            anchorPosition={analysis.anchorPosition ?? ''}
            entropyCutoff={analysis.entropyCutoff ?? DEFAULT_ENTROPY_CUTOFF_BITS}
        />
    ) : (
        <Cooccurrence {...commonProps} positionSource='manual' positions={analysis.positions ?? []} />
    );
}
