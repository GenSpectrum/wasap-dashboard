import { ModePageStateHandler } from './ModePageStateHandler';
import { type OrganismConfigFor } from '../../config/organismConfig';
import { sequenceTypeSchema } from '../../domain/mutations';
import { signatureTypeSchema, variantTimeFrameSchema, type VariantAnalysis } from '../analysisFilter';
import { booleanParam, enumParam, listParam, numberParam, optional, stringParam } from '../urlParams';

export class VariantExplorerPageStateHandler extends ModePageStateHandler<VariantAnalysis> {
    constructor(protected readonly config: OrganismConfigFor<'variant'>) {
        super(config, 'variant');
    }

    // What isn't worth showing is left out by the mutations to exclude instead (`excludeNearlyFixed`, …).
    protected readonly hasMeanProportion = false;

    protected readonly params = {
        signatureType: enumParam(signatureTypeSchema),
        sequenceType: enumParam(sequenceTypeSchema),
        // computed signature
        variant: optional(stringParam),
        minProportion: numberParam({ min: 0, max: 1 }),
        minCount: numberParam({ min: 0, integer: true }),
        minJaccard: numberParam({ min: 0, max: 1 }),
        timeFrame: enumParam(variantTimeFrameSchema),
        // predefined signature
        lineage: optional(stringParam),
        newMutationsOnly: optional(booleanParam),
        includeSublineagesForJaccard: optional(booleanParam),
        // either
        backgroundLineages: listParam,
        excludeNearlyFixed: optional(booleanParam),
        excludeDeletions: optional(booleanParam),
    };

    protected defaults(): VariantAnalysis {
        const defaults = this.config.filterDefaults.variant;
        return {
            ...defaults,
            newMutationsOnly: false,
            backgroundLineages: defaults.backgroundLineages ?? [],
            excludeNearlyFixed: true,
            excludeDeletions: true,
        };
    }
}
