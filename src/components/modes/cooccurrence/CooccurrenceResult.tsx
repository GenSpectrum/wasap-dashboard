import { type To } from 'react-router-dom';

import { Cooccurrence } from './cooccurrence/Cooccurrence';
import { type ClinicalLapisSource } from './cooccurrence/usePanelLineageJaccards';
import { type RhydbReadFilter } from '../../../dataLayer/queries';
import { type LineageTree } from '../../../externalData/fileBased/lineageTree/lineageTree';
import {
    DEFAULT_ENTROPY_CUTOFF_BITS,
    effectivePositionSource,
    type BaseFilter,
    type CooccurrenceAnalysis,
} from '../../../pageState/wasap/analysisFilter';

/**
 * The co-occurrence bands of a mode that selects positions.
 */
export function CooccurrenceResult({
    base,
    analysis,
    filter,
    minShare,
    lineageTree,
    manualModeLink,
    variantModeLink,
    clinicalLapis,
}: {
    base: BaseFilter;
    analysis: CooccurrenceAnalysis;
    filter: RhydbReadFilter;
    /** Only patterns on at least this share of the reads are shown. */
    minShare: number;
    /** EXPERIMENTAL: enables the panel-of-lineages match, when the organism has a lineage tree. */
    lineageTree?: LineageTree;
    /** Opens a row's mutations in the manual mode, when it is enabled. */
    manualModeLink?: (mutations: string[]) => To;
    /** Opens a panel-match lineage in the variant explorer, when it is enabled. */
    variantModeLink?: (lineage: string) => To;
    /** The clinical sequences to compute the panel lineages' Jaccard indices in; none without. */
    clinicalLapis?: ClinicalLapisSource;
}) {
    const commonProps = {
        filter,
        sequenceType: analysis.sequenceType,
        granularity: base.granularity,
        pageSizes: [20, 50, 100, 250],
        minShare,
        panel: analysis.panel,
        lineageTree,
        manualModeLink,
        variantModeLink,
        clinicalLapis,
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
