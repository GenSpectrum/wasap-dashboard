import { ModePageStateHandler } from './ModePageStateHandler';
import { type OrganismConfigFor } from '../../config/organismConfig';
import { sequenceTypeSchema } from '../../util/mutations';
import { positionSourceSchema, type CooccurrenceAnalysis } from '../analysisFilter';
import { enumParam, listParam, numberParam, optional, stringParam } from '../urlParams';

export class CooccurrencePageStateHandler extends ModePageStateHandler<CooccurrenceAnalysis> {
    constructor(protected readonly config: OrganismConfigFor<'cooccurrence'>) {
        super(config, 'cooccurrence');
    }

    // The min. share takes its place: the patterns' shares are what there is to filter by.
    protected readonly hasMeanProportion = false;

    protected readonly params = {
        sequenceType: enumParam(sequenceTypeSchema),
        positionSource: optional(enumParam(positionSourceSchema)),
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
