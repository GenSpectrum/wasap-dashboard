import z from 'zod';

/**
 * pango-designation's `alias_key.json`: maps each alias prefix to what it stands for. That's a
 * lineage for an ordinary alias (`BA` → `B.1.1.529`), an empty string for `A` and `B`, and the
 * parent lineages for a recombinant (`XFG` → `LF.7`, `LP.8.1.2`, `LF.7`).
 */
export const aliasKeySchema = z.record(z.string(), z.union([z.string(), z.array(z.string())]));
export type AliasKey = z.infer<typeof aliasKeySchema>;

/**
 * The parents of each recombinant in the alias key.
 *
 * The alias key lists a parent once per segment of the genome it contributes, so a parent can show
 * up more than once (`XFG` → `LF.7`, `LP.8.1.2`, `LF.7`); here each parent is listed once, in the
 * order it first shows up. Older recombinants have parents like `BA.1*` (some sublineage of `BA.1`),
 * which become `BA.1`.
 */
export function parseRecombinantParents(aliasKey: AliasKey): Map<string, string[]> {
    const result = new Map<string, string[]>();
    for (const [recombinant, value] of Object.entries(aliasKey)) {
        if (Array.isArray(value)) {
            result.set(recombinant, [...new Set(value.map((parent) => parent.replace(/\*$/, '')))]);
        }
    }
    return result;
}
