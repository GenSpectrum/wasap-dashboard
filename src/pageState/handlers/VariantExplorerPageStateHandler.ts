import { ModePageStateHandler } from './ModePageStateHandler';
import { type OrganismConfigFor } from '../../config/organismConfig';
import { signatureTypeSchema, type VariantAnalysis, type VariantTimeFrame } from '../analysisFilter';
import {
    booleanParam,
    enumParam,
    listParam,
    named,
    numberParam,
    optional,
    stringParam,
    sequenceTypeParam,
    tokenParam,
} from '../urlParams';

export class VariantExplorerPageStateHandler extends ModePageStateHandler<VariantAnalysis> {
    constructor(protected readonly config: OrganismConfigFor<'variant'>) {
        super(config, 'variant');
    }

    // What isn't worth showing is left out by the mutations to exclude instead (`excludeNearlyFixed`, …).
    protected readonly hasMeanProportion = false;

    protected readonly params = {
        signatureType: enumParam(signatureTypeSchema),
        sequenceType: sequenceTypeParam,
        // computed signature
        variant: optional(stringParam),
        minProportion: numberParam({ min: 0, max: 1 }),
        minCount: numberParam({ min: 0, integer: true }),
        minJaccard: numberParam({ min: 0, max: 1 }),
        timeFrame: tokenParam<VariantTimeFrame>({ all: 'all', '6months': '6m', '3months': '3m' }),
        // predefined signature
        lineage: optional(stringParam),
        newMutationsOnly: optional(booleanParam),
        includeSublineagesForJaccard: named('jaccardSublineages', optional(booleanParam)),
        // either
        backgroundLineages: named('background', listParam),
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
