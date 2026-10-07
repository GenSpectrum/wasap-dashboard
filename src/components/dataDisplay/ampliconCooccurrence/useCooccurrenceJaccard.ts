import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';

import { type CooccurrenceRow } from '../../../dataLayer/hooks/ampliconCooccurrence';
import { getClusterJaccards, type ClusterJaccardSource } from '../../../externalData/lapis/getClusterJaccards';

/**
 * The Jaccard index of the lineage and each row's cluster (the sequences with all of its
 * mutations) in the clinical sequences, by row label; `undefined` without a `source`. All of them
 * from one request (`getClusterJaccards`), `isLoading` until it is answered.
 */
export function useCooccurrenceJaccard(
    rows: CooccurrenceRow[],
    source: ClusterJaccardSource | undefined,
): { jaccardIndices: Partial<Record<string, number>> | undefined; isLoading: boolean } {
    const clusters = useMemo(() => rows.map((row) => row.cluster.map((mutation) => mutation.code)), [rows]);

    const { data, isPending } = useQuery({
        enabled: source !== undefined && clusters.length > 0,
        queryKey: ['cluster-jaccards', source, clusters],
        staleTime: Infinity,
        queryFn: () => getClusterJaccards(source!, clusters),
    });

    const jaccardIndices = useMemo(
        () =>
            source === undefined
                ? undefined
                : Object.fromEntries(
                      data === undefined ? [] : rows.map((row, index) => [row.label, data[index]] as const),
                  ),
        [source, rows, data],
    );
    return { jaccardIndices, isLoading: source !== undefined && clusters.length > 0 && isPending };
}
