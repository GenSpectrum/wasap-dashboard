import { ModePageStateHandler } from './ModePageStateHandler';
import { type OrganismConfigFor } from '../../config/organismConfig';
import { type CooccurrenceAnalysis, type PositionSource } from '../analysisFilter';
import { listParam, named, numberParam, optional, stringParam, sequenceTypeParam, tokenParam } from '../urlParams';

export class CooccurrencePageStateHandler extends ModePageStateHandler<CooccurrenceAnalysis> {
    constructor(protected readonly config: OrganismConfigFor<'cooccurrence'>) {
        super(config, 'cooccurrence');
    }

    // The min. share takes its place: the patterns' shares are what there is to filter by.
    protected readonly hasMeanProportion = false;

    protected readonly params = {
        sequenceType: sequenceTypeParam,
        // `list`, like the list of mutations of the manual mode, for positions picked one by one.
        positionSource: named('source', optional(tokenParam<PositionSource>({ manual: 'list', amplicon: 'amplicon' }))),
        positions: optional(listParam),
        anchorPosition: optional(stringParam),
        entropyCutoff: optional(numberParam({ min: 0 })),
        minShare: optional(numberParam({ min: 0, max: 1 })),
        panel: optional(listParam),
    };

    protected defaults(): CooccurrenceAnalysis {
        return {
            mode: 'cooccurrence',
            sequenceType: this.config.filterDefaults.cooccurrence.sequenceType,
            positionSource: undefined,
            positions: undefined,
            anchorPosition: undefined,
            entropyCutoff: undefined,
            minShare: this.config.filterDefaults.cooccurrence.minShare,
            panel: this.config.filterDefaults.cooccurrence.panel,
        };
    }
}
