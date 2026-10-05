import z from 'zod';

/**
 * Where the lineage tree of an organism comes from: a Nextclade reference tree (an Auspice JSON,
 * like nextclade_data's `sars-cov-2/wuhan-hu-1/orfs/tree.json`), and the node attribute in it that
 * holds the lineage of a node (`Nextclade_pango` for SARS-CoV-2, `clade_membership` for RSV).
 *
 * The tree doesn't know the parents of recombinants; for Pango lineages they come from
 * pango-designation's `alias_key.json` at `aliasKeyUrl`.
 *
 * `cladeAttribute` is the node attribute with a coarser clade (`clade_nextstrain` for SARS-CoV-2);
 * the lineages that start a clade serve as landmarks in the tree.
 */
export const lineageTreeConfigSchema = z.object({
    url: z.string().min(1),
    lineageAttribute: z.string().min(1),
    aliasKeyUrl: z.string().min(1).optional(),
    cladeAttribute: z.string().min(1).optional(),
});
export type LineageTreeConfig = z.infer<typeof lineageTreeConfigSchema>;
