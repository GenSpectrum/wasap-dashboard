import { useQuery } from '@tanstack/react-query';

import { getCladeLineages } from './getCladeLineages';
import { getMutations } from './getMutations';
import { getClientLogger } from '../../clientLogger';
import { type WasapPageConfigFor } from '../../config/wasapPageConfig';
import type { WasapUntrackedFilter } from '../../pageState/wasap/wasapAnalysisFilter';
import { getErrorLogMessage } from '../../util/getErrorLogMessage';

const logger = getClientLogger('useUntrackedMutations');

/** The mutations of the untracked page: those in the wastewater, but not in the variants to exclude. */
export function useUntrackedMutations(config: WasapPageConfigFor<'untracked'>, analysis: WasapUntrackedFilter) {
    // `config.genSpectrumOrganismName` stands in for `config` — it's 1:1 with it.
    // eslint-disable-next-line @tanstack/query/exhaustive-deps
    return useQuery({
        queryKey: ['untrackedMutations', config.genSpectrumOrganismName, analysis],
        queryFn: ({ signal }) =>
            fetchUntrackedMutations(config, analysis, signal).catch((error: unknown) => {
                if (!signal.aborted) {
                    logger.error(`Failed to fetch the untracked mutations: ${getErrorLogMessage(error)}`);
                }
                throw error;
            }),
    });
}

export async function fetchUntrackedMutations(
    config: WasapPageConfigFor<'untracked'>,
    analysis: WasapUntrackedFilter,
    signal?: AbortSignal,
): Promise<string[]> {
    const variantsToExclude =
        analysis.excludeSet === 'custom'
            ? analysis.excludeVariants
            : await getCladeLineages(
                  config.clinicalLapis.lapisBaseUrl,
                  config.clinicalLapis.cladeField,
                  config.clinicalLapis.lineageField,
                  true,
                  signal,
              ).then((r) => Object.values(r));
    if (variantsToExclude === undefined) {
        return [];
    }
    const [excludeMutations, allMuts] = await Promise.all([
        Promise.all(
            variantsToExclude.map((variant) =>
                getMutations(
                    config.clinicalLapis.lapisBaseUrl,
                    analysis.sequenceType,
                    {
                        [config.clinicalLapis.lineageField]: variant,
                    },
                    0.8,
                    9,
                    signal,
                ),
            ),
        ).then((r) => r.flat()),
        getMutations(config.lapisBaseUrl, analysis.sequenceType, undefined, 0.05, 5, signal),
    ]);
    return allMuts.filter((m) => !excludeMutations.includes(m));
}
