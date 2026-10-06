import { type Amplicon } from './primerBed';
import { DeletionClass, SubstitutionClass } from '../util/mutations';

export type AmpliconMutation = SubstitutionClass | DeletionClass;

export type AmpliconMutations = {
    amplicon: Amplicon;
    /** Sorted by position, then code. */
    mutations: AmpliconMutation[];
};

/**
 * Groups nucleotide mutation codes (`C241T`, `A28271-`) by the amplicon whose insert they are in,
 * in genome order. Only amplicons with at least one of the mutations are returned.
 *
 * A mutation in the overlap of two neighbouring inserts goes to both: either amplicon's reads cover
 * it. Codes that are not nucleotide substitutions or deletions (insertions, amino acid mutations),
 * and positions outside every insert (in a primer, or beyond the scheme), are left out; they are in
 * `outside`.
 */
export function mutationsByAmplicon(
    codes: readonly string[],
    amplicons: readonly Amplicon[],
): { groups: AmpliconMutations[]; outside: string[] } {
    const mutations = new Map<Amplicon, AmpliconMutation[]>();
    const outside: string[] = [];
    for (const code of codes) {
        const mutation = parseNucleotideMutation(code);
        const containing =
            mutation === null
                ? []
                : amplicons.filter(
                      (amplicon) =>
                          amplicon.insertStart <= mutation.position && mutation.position <= amplicon.insertEnd,
                  );
        if (mutation === null || containing.length === 0) {
            outside.push(code);
            continue;
        }
        for (const amplicon of containing) {
            mutations.set(amplicon, [...(mutations.get(amplicon) ?? []), mutation]);
        }
    }
    const groups = amplicons.flatMap((amplicon) => {
        const ofAmplicon = mutations.get(amplicon);
        if (ofAmplicon === undefined) {
            return [];
        }
        const sorted = [...ofAmplicon].sort((a, b) => a.position - b.position || a.code.localeCompare(b.code));
        return [{ amplicon, mutations: sorted }];
    });
    return { groups, outside };
}

function parseNucleotideMutation(code: string): AmpliconMutation | null {
    const mutation = DeletionClass.parse(code) ?? SubstitutionClass.parse(code);
    return mutation === null || mutation.segment !== undefined ? null : mutation;
}
