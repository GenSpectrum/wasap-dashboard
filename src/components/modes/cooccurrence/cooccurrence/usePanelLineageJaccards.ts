import { useQueries } from '@tanstack/react-query';
import { useMemo } from 'react';

import { type OrganismConfigFor } from '../../../../config/organismConfig';
import { getClusterJaccards } from '../../../../externalData/lapis/getClusterJaccards';

/** The clinical sequences to compute the Jaccard indices in: the variant mode's. */
export type ClinicalLapisSource = OrganismConfigFor<'variant'>['clinicalLapis'];

/** A row, with its mutations and the panel lineages to compute the Jaccard index of with them. */
export type PanelJaccardRow = { rowKey: string; codes: readonly string[]; lineages: readonly string[] };

/** `rowKey -> lineage -> Jaccard index`, `undefined` for a lineage without clinical sequences. */
export type PanelJaccards = Map<string, Map<string, number | undefined>>;

/**
 * The Jaccard index of each row's lineages (with their sublineages) and its mutations (the clinical
 * sequences with all of them); `undefined` without a `source`. Rows without mutations get none. One
 * request per lineage (`getClusterJaccards`), with the rows it is one of; `pendingLineages` until
 * a lineage's is answered, and lineages whose request failed are left out.
 */
export function usePanelLineageJaccards(
    rows: readonly PanelJaccardRow[],
    source: ClinicalLapisSource | undefined,
): { jaccards: PanelJaccards | undefined; pendingLineages: ReadonlySet<string> } {
    const rowsByLineage = useMemo(
        () => (source === undefined ? new Map<string, PanelJaccardRow[]>() : groupByLineage(rows)),
        [rows, source],
    );

    const { data, isPending } = useQueries({
        combine: dataByLineage,
        queries: [...rowsByLineage].map(([lineage, lineageRows]) => {
            const clusters = lineageRows.map(({ codes }) => ({ codes, atLeast: codes.length }));
            return {
                queryKey: ['panel-lineage-jaccards', source, lineage, clusters],
                staleTime: Infinity,
                queryFn: ({ signal }: { signal: AbortSignal }) =>
                    getClusterJaccards(
                        {
                            lapisBaseUrl: source!.lapisBaseUrl,
                            lineageQuery: `${source!.lineageField}=${lineage}*`,
                            dateField: source!.dateField,
                            dateFrom: undefined,
                        },
                        clusters,
                        signal,
                    ),
            };
        }),
    });

    const jaccards = useMemo(
        () => (source === undefined ? undefined : jaccardsByRow(rowsByLineage, data)),
        [source, rowsByLineage, data],
    );
    const pendingLineages = useMemo(
        () => new Set([...rowsByLineage.keys()].filter((_, index) => isPending[index])),
        [rowsByLineage, isPending],
    );

    return { jaccards, pendingLineages };
}

/** lineage -> the rows with mutations it is one of, in the order of `rows` (exported for tests). */
export function groupByLineage(rows: readonly PanelJaccardRow[]): Map<string, PanelJaccardRow[]> {
    const result = new Map<string, PanelJaccardRow[]>();
    for (const row of rows) {
        if (row.codes.length === 0) {
            continue;
        }
        for (const lineage of row.lineages) {
            result.set(lineage, [...(result.get(lineage) ?? []), row]);
        }
    }
    return result;
}

/**
 * The indices of each lineage's rows (`indices`, in the order of `rowsByLineage`, `undefined` for
 * those not there yet) by row (exported for tests).
 */
export function jaccardsByRow(
    rowsByLineage: ReadonlyMap<string, readonly PanelJaccardRow[]>,
    indices: readonly (readonly (number | undefined)[] | undefined)[],
): PanelJaccards {
    const byRow: PanelJaccards = new Map();
    [...rowsByLineage].forEach(([lineage, lineageRows], lineageIndex) => {
        const lineageIndices = indices[lineageIndex];
        if (lineageIndices === undefined) {
            return;
        }
        lineageRows.forEach(({ rowKey }, rowIndex) => {
            const index = lineageIndices[rowIndex];
            byRow.set(rowKey, (byRow.get(rowKey) ?? new Map<string, number | undefined>()).set(lineage, index));
        });
    });
    return byRow;
}

/** Module-level, so `useQueries` keeps its result between renders while the queries stay the same. */
function dataByLineage(results: { data?: (number | undefined)[]; isPending: boolean }[]) {
    return { data: results.map((result) => result.data), isPending: results.map((result) => result.isPending) };
}
