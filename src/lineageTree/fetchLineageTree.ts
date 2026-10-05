import { aliasKeySchema, parseRecombinantParents } from './aliasKey';
import { buildLineageTree, type LineageTree } from './lineageTree';
import type { LineageTreeConfig } from './lineageTreeConfig';
import { nextcladeTreeSchema } from './nextcladeTree';
import { getClientLogger } from '../clientLogger';
import { getErrorLogMessage } from '../util/getErrorLogMessage';

const logger = getClientLogger('fetchLineageTree');

/**
 * Fetches the Nextclade reference tree of the config and builds the lineage tree from it, with the
 * parents of recombinants from the alias key, if the config has one.
 */
export async function fetchLineageTree(config: LineageTreeConfig): Promise<LineageTree> {
    const [tree, recombinantParents] = await Promise.all([
        fetchNextcladeTree(config),
        config.aliasKeyUrl === undefined ? new Map<string, string[]>() : fetchRecombinantParents(config.aliasKeyUrl),
    ]);
    return buildLineageTree(tree, config.lineageAttribute, recombinantParents);
}

async function fetchNextcladeTree(config: LineageTreeConfig) {
    const response = await fetch(config.url);
    if (!response.ok) {
        throw new Error(
            `Failed to fetch the Nextclade tree from ${config.url}: ${response.status} ${response.statusText}`,
        );
    }
    return nextcladeTreeSchema(config.lineageAttribute).parse(await response.json()).tree;
}

/** Without the alias key, the tree is still useful, just without the parents of recombinants. */
async function fetchRecombinantParents(url: string): Promise<Map<string, string[]>> {
    try {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`${response.status} ${response.statusText}`);
        }
        return parseRecombinantParents(aliasKeySchema.parse(await response.json()));
    } catch (error) {
        logger.error(`Failed to fetch the alias key from ${url}: ${getErrorLogMessage(error)}`);
        return new Map();
    }
}
