/**
 * The lineage / variant picker's option list, from clinical LAPIS.
 *
 * `useLineageOptions` reads the clinical-LAPIS client from context
 * (`useLapisClient`) and assembles the autocomplete list: every lineage, its
 * wildcard form (`BA.3.2.1` and `BA.3.2.1*`), and the wildcard prefixes of
 * aliased lineages (`BA.3.2*`), each with a read count that for a wildcard
 * includes its sublineages.
 */

import { useQuery, type UseQueryResult } from '@tanstack/react-query';

import { useLapisClient } from '../lapis/LapisClientContext';
import type { LapisClient } from '../lapis/client';
import type { LineageDefinitionResponse } from '../lapisApi/LineageDefinition';

export type LineageItem = { lineage: string; count: number };

export function useLineageOptions(field: string): UseQueryResult<LineageItem[]> {
    const client = useLapisClient();
    // `client.url` stands in for `client` — it's memoized per url (see
    // `useLapisClient`), so it fully determines the client's behaviour.
    // eslint-disable-next-line @tanstack/query/exhaustive-deps
    return useQuery({
        queryKey: ['lapis', 'lineage-options', client.url, field],
        queryFn: ({ signal }) => fetchLineageOptions(client, field, signal),
    });
}

async function fetchLineageOptions(client: LapisClient, field: string, signal?: AbortSignal): Promise<LineageItem[]> {
    const [counts, definitions] = await Promise.all([
        client.aggregate(field, { signal }),
        client.lineageDefinition(field, { signal }),
    ]);
    const countsByLineage = new Map(counts.map((entry) => [entry.value, entry.count]));
    return assembleLineageOptions(countsByLineage, definitions);
}

/** Pure: the option list from the counts and the definition DAG. */
export function assembleLineageOptions(
    countsByLineage: Map<string, number>,
    lineageDefinitions: LineageDefinitionResponse,
): LineageItem[] {
    const { lineageTree, aliasMapping } = buildLineageTree(lineageDefinitions);
    const prefixToLineage = findMissingPrefixMappings(lineageTree, aliasMapping);

    const actualLineageItems = Array.from(lineageTree.keys()).flatMap((lineage) => [
        { lineage, count: countsByLineage.get(lineage) ?? 0 },
        { lineage: `${lineage}*`, count: getCountsIncludingSublineages(lineage, lineageTree, countsByLineage) },
    ]);

    const prefixAliasItems = Array.from(prefixToLineage.entries()).map(([prefix, actualLineage]) => ({
        lineage: `${prefix}*`,
        count: getCountsIncludingSublineages(actualLineage, lineageTree, countsByLineage),
    }));

    // Sort so an asterisk comes before a period for the same prefix.
    return [...actualLineageItems, ...prefixAliasItems].sort((a, b) => {
        const aKey = a.lineage.replace(/\*/g, ' ');
        const bKey = b.lineage.replace(/\*/g, ' ');
        return aKey.localeCompare(bKey);
    });
}

function buildLineageTree(lineageDefinitions: LineageDefinitionResponse) {
    const lineageTree = new Map<string, { children: string[] }>();
    const aliasMapping = new Map<string, string[]>();

    Object.entries(lineageDefinitions).forEach(([lineage, definition]) => {
        if (!lineageTree.has(lineage)) {
            lineageTree.set(lineage, { children: [] });
        }

        if (definition.aliases && definition.aliases.length > 0) {
            aliasMapping.set(lineage, definition.aliases);
        }

        definition.parents?.forEach((parent) => {
            const parentChildren = lineageTree.get(parent)?.children;
            const newParentChildren = parentChildren ? [...parentChildren, lineage] : [lineage];
            lineageTree.set(parent, { children: newParentChildren });
        });
    });

    return { lineageTree, aliasMapping };
}

function getCountsIncludingSublineages(
    lineage: string,
    lineageTree: Map<string, { children: string[] }>,
    countsByLineage: Map<string, number>,
): number {
    const descendants = getAllDescendants(lineage, lineageTree);
    const countOfChildren = [...descendants].reduce((sum, child) => sum + (countsByLineage.get(child) ?? 0), 0);
    const countLineage = countsByLineage.get(lineage) ?? 0;
    return countOfChildren + countLineage;
}

function getAllDescendants(lineage: string, lineageTree: Map<string, { children: string[] }>): Set<string> {
    const children = lineageTree.get(lineage)?.children ?? [];
    const childrenOfChildren = children.flatMap((child) => getAllDescendants(child, lineageTree));
    return new Set([...children, ...childrenOfChildren.flatMap((child) => Array.from(child))]);
}

/**
 * Prefixes (e.g. "BA.3.2" for "BA.3.2.1") that are not in the lineageTree but
 * do appear as an alias, mapped back to a lineage that is in the tree
 * (e.g. "BA.3.2" -> "B.1.1.529.3.2").
 */
function findMissingPrefixMappings(
    lineageTree: Map<string, { children: string[] }>,
    aliasMapping: Map<string, string[]>,
): Map<string, string> {
    const lineages = Array.from(lineageTree.keys());
    const lineagesSet = new Set(lineages);

    const allPrefixes = lineages.flatMap((lineage) => {
        const parts = lineage.split('.');
        return parts.map((_, i) => parts.slice(0, i + 1).join('.'));
    });

    const missingPrefixes = new Set(allPrefixes.filter((prefix) => !lineagesSet.has(prefix)));

    const reverseAliasMapping = new Map<string, string>();
    aliasMapping.forEach((aliases, lineage) => {
        aliases.forEach((alias) => {
            reverseAliasMapping.set(alias, lineage);
        });
    });

    const prefixToLineage = new Map<string, string>();
    missingPrefixes.forEach((prefix) => {
        const actualLineage = reverseAliasMapping.get(prefix);
        if (actualLineage) {
            prefixToLineage.set(prefix, actualLineage);
        }
    });

    return prefixToLineage;
}
