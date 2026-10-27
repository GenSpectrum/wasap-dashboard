/**
 * EXPERIMENTAL: which lineages of a configured panel (see the config's `deconvolutionPanel`,
 * same concept) carry the exact symbols a co-occurrence pattern has at the queried
 * positions. Answers "is this prevalent combination one we already expect from the panel, or
 * something the panel doesn't explain" without a clinical LAPIS lookup — everything needed is
 * already in the lineage tree loaded for the deconvolution mode.
 *
 * Works for both sequence types, but differently: nucleotide reuses `lineageSignatures` (the same
 * signature the deconvolution mode fits against); amino acid reads `getLineageSignature` directly,
 * since `lineageSignatures` is nucleotide-only (deconvolution never needed amino acid codes) — see
 * `lineageTree.ts`'s `Mutations.aminoAcid`. Either way, only meaningful with the queried
 * positions' reference symbols known (the amplicon-anchor position source, which already fetches
 * them for the entropy calculation) — without a reference, "this lineage has no mutation here"
 * can't be turned into "so it carries the reference base" and compared.
 */

import { lineageSignatures } from './lineageSignatures';
import { getLineageSignature, type LineageTree } from '../externalData/fileBased/lineageTree/lineageTree';
import { type SequenceType } from '../types/dashboardComponents';
import { SubstitutionClass } from '../util/mutations';

const NUCLEOTIDE_SUBSTITUTION = /^[ACGT](\d+)([ACGT])$/;

/** `label -> symbol` for every lineage of the panel that's in the tree, keyed by lineage name. */
export function lineagePanelSymbols(
    lineageTree: LineageTree,
    panel: readonly string[],
    positionLabels: readonly string[],
    referenceSymbols: Record<string, string | undefined>,
    sequenceType: SequenceType,
): Map<string, Record<string, string>> {
    const mutationsByLineage =
        sequenceType === 'nucleotide'
            ? nucleotideMutationsByLineage(lineageTree, panel)
            : aminoAcidMutationsByLineage(lineageTree, panel);

    const result = new Map<string, Record<string, string>>();
    for (const [lineage, mutationByLabel] of mutationsByLineage) {
        const symbols: Record<string, string> = {};
        for (const label of positionLabels) {
            const reference = referenceSymbols[label];
            if (reference === undefined) {
                continue;
            }
            symbols[label] = mutationByLabel.get(label) ?? reference;
        }
        result.set(lineage, symbols);
    }
    return result;
}

/** `label` (a bare position, as `nucleotideSubstitutions` codes it) `-> new symbol`, per lineage. */
function nucleotideMutationsByLineage(
    lineageTree: LineageTree,
    panel: readonly string[],
): Map<string, Map<string, string>> {
    const { signatures } = lineageSignatures(lineageTree, panel);
    const result = new Map<string, Map<string, string>>();
    for (const [lineage, mutations] of Object.entries(signatures)) {
        const mutationByLabel = new Map<string, string>();
        for (const mutation of mutations) {
            const match = NUCLEOTIDE_SUBSTITUTION.exec(mutation);
            if (match !== null) {
                mutationByLabel.set(match[1], match[2]);
            }
        }
        result.set(lineage, mutationByLabel);
    }
    return result;
}

/** `label` (`gene:codon`, matching `labelFor`) `-> new symbol`, per lineage. */
function aminoAcidMutationsByLineage(
    lineageTree: LineageTree,
    panel: readonly string[],
): Map<string, Map<string, string>> {
    const result = new Map<string, Map<string, string>>();
    for (const name of panel) {
        const lineage = lineageTree.lineages.get(name);
        if (lineage === undefined) {
            continue;
        }
        const mutationByLabel = new Map<string, string>();
        for (const code of getLineageSignature(lineage).aminoAcid) {
            const substitution = SubstitutionClass.parse(code);
            if (substitution?.segment === undefined || substitution.substitutionValue === undefined) {
                continue;
            }
            mutationByLabel.set(`${substitution.segment}:${substitution.position}`, substitution.substitutionValue);
        }
        result.set(name, mutationByLabel);
    }
    return result;
}

/** The names of every panel lineage whose symbols match `patternSymbols` at every given position. */
export function matchingPanelLineages(
    panelSymbols: ReadonlyMap<string, Record<string, string>>,
    positionLabels: readonly string[],
    patternSymbols: Record<string, string>,
): string[] {
    return [...panelSymbols.entries()]
        .filter(([, symbols]) => positionLabels.every((label) => symbols[label] === patternSymbols[label]))
        .map(([lineage]) => lineage);
}
