import { useMemo } from 'react';

import { type CooccurrenceRow } from '../../../../dataLayer/hooks/analyses/ampliconCooccurrence';
import { useClusterJaccards, type ClusterJaccardSource } from '../../../../externalData/lapis/getClusterJaccards';

/**
 * The Jaccard index of the lineage and each row's cluster (the sequences with at least `atLeast` of
 * its mutations) in the clinical sequences, by row label; `undefined` without a `source`, and when
 * there are no clinical sequences of the lineage, so no index is known and no row is to be left
 * out for one. All of them from one request (`getClusterJaccards`), `isLoading` until it is answered.
 */
export function useCooccurrenceJaccard(
    rows: CooccurrenceRow[],
    source: ClusterJaccardSource | undefined,
): { jaccardIndices: Partial<Record<string, number>> | undefined; isLoading: boolean } {
    const clusters = useMemo(
        () => rows.map((row) => ({ codes: row.cluster.map((mutation) => mutation.code), atLeast: row.atLeast })),
        [rows],
    );

    const { data, isPending } = useClusterJaccards(source, clusters);

    const jaccardIndices = useMemo(() => {
        if (source === undefined || data?.every((index) => index === undefined) === true) {
            return undefined;
        }
        return Object.fromEntries(
            data === undefined ? [] : rows.map((row, index) => [row.label, data[index]] as const),
        );
    }, [source, rows, data]);
    return { jaccardIndices, isLoading: source !== undefined && clusters.length > 0 && isPending };
}
