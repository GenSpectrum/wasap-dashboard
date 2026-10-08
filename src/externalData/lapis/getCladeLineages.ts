import { lapisPost } from '../lapisApi/lapisApi';
import { aggregatedResponse } from '../lapisApi/lapisTypes';

/**
 * Finds the lineage definition belonging to clades, by looking for the lineage that is most
 * commonly associated with each clade.
 * Returns a map, mapping all clades found in the data to their respective lineage.
 */
export async function getCladeLineages(
    baseUrl: string,
    cladeField: string,
    lineageField: string,
    withAsterisk = false,
    signal?: AbortSignal,
): Promise<Record<string, string>> {
    const body = {
        fields: [cladeField, lineageField],
        orderBy: [cladeField, { field: 'count', type: 'descending' }],
    };
    const response = await lapisPost(baseUrl, '/sample/aggregated', body, aggregatedResponse, 'clade lineages', signal);

    const mapping: Record<string, string> = {};

    for (const row of response.data) {
        const clade = row[cladeField];
        const lineage = row[lineageField];

        if (clade === null || lineage === null || clade === 'recombinant') {
            continue;
        }

        if (typeof clade !== 'string' || typeof lineage !== 'string') {
            throw new Error(`Unexpected row types in clade lineages response: ${JSON.stringify(row)}`);
        }

        if (!(clade in mapping)) {
            mapping[clade] = withAsterisk ? `${lineage}*` : lineage;
        }
    }

    return mapping;
}
