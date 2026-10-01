import { buildLineageTree, type LineageTree } from './lineageTree';
import type { LineageTreeConfig } from './lineageTreeConfig';
import { nextcladeTreeSchema } from './nextcladeTree';

/** Fetches the Nextclade reference tree of the config and builds the lineage tree from it. */
export async function fetchLineageTree(config: LineageTreeConfig): Promise<LineageTree> {
    const response = await fetch(config.url);
    if (!response.ok) {
        throw new Error(
            `Failed to fetch the Nextclade tree from ${config.url}: ${response.status} ${response.statusText}`,
        );
    }
    const { tree } = nextcladeTreeSchema(config.lineageAttribute).parse(await response.json());
    return buildLineageTree(tree, config.lineageAttribute);
}
