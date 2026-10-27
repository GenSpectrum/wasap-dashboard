// zod 4 rather than the zod 3 of the rest of the app, because it parses the ~7000 nodes of the
// SARS-CoV-2 tree about ten times faster (~20 ms instead of ~200 ms), and the app waits for it
import { z } from 'zod/v4';

/* eslint-disable @typescript-eslint/naming-convention -- the field names of the Auspice JSON format */

/**
 * The parts of a node of a Nextclade reference tree (Auspice JSON v2) that the lineage tree needs.
 * The tree has much more per node (QC values, immune escape, …), which zod strips.
 */
export type NextcladeTreeNode = {
    name: string;
    node_attrs: Record<string, { value: string } | undefined>;
    branch_attrs?: {
        /** Mutations on the branch to this node, by gene; nucleotide mutations are under `nuc`. */
        mutations?: Record<string, string[]>;
    };
    children?: NextcladeTreeNode[];
};

export const NEXTCLADE_NUCLEOTIDE_KEY = 'nuc';
export const DESIGNATION_DATE_ATTRIBUTE = 'designation_date';

const attributeSchema = z.object({ value: z.string() }).optional();

/** The schema of a Nextclade reference tree, with the lineage (and clade) in the given node attributes. */
export function nextcladeTreeSchema(lineageAttribute: string, cladeAttribute?: string) {
    const nodeSchema: z.ZodType<NextcladeTreeNode> = z.object({
        name: z.string(),
        node_attrs: z.object({
            [lineageAttribute]: attributeSchema,
            [DESIGNATION_DATE_ATTRIBUTE]: attributeSchema,
            ...(cladeAttribute === undefined ? {} : { [cladeAttribute]: attributeSchema }),
        }),
        branch_attrs: z.object({ mutations: z.record(z.string(), z.array(z.string())).optional() }).optional(),
        get children() {
            return z.array(nodeSchema).optional();
        },
    });
    return z.object({ tree: nodeSchema });
}
