import { useParams, useSearchParams } from 'react-router-dom';

import { isModeEnabled } from '../../../config/organismConfig';
import { resolveOrganismConfig } from '../../../config/wastewaterOrganisms';
import { type AnalysisMode } from '../../../pageState/analysisFilter';
import { datasetFilterSearchParams, parseDatasetFilter } from '../../../pageState/baseFilter';
import { MODE_GROUPS, modeIcon, modeLabel, modePath } from '../../../pageState/modes';

export const OVERVIEW_ICON = 'mdi--view-dashboard-outline';
export const ABOUT_ICON = 'mdi--information-outline';

export type ModeLink = {
    mode: AnalysisMode;
    to: { pathname: string; search: string };
    label: string;
    icon: string;
};

export type ModeNavigation = {
    /** The overview page, without search params: it doesn't read the dataset filter, unlike the modes. */
    overviewPath: string;
    /** The groups of `MODE_GROUPS` with their enabled modes, leaving out those without any. */
    groups: { label?: string; links: ModeLink[] }[];
};

/**
 * The pages of the organism that is open, for the navigation to list: the overview, and the modes in their
 * groups. The links to the modes take the dataset filter along (but not the mean proportion, which has a
 * different default in each mode). `undefined` where no organism is open, like on the landing page.
 *
 * The navigation is in the header, which sits above the routes, so it finds the organism and the dataset
 * filter in the URL itself.
 */
export function useModeNavigation(): ModeNavigation | undefined {
    const { organismPath } = useParams();
    const [searchParams] = useSearchParams();
    const config = resolveOrganismConfig(organismPath);

    if (config === undefined) {
        return undefined;
    }

    const search = datasetFilterSearchParams(parseDatasetFilter(searchParams, config), config).toString();

    return {
        overviewPath: config.path,
        groups: MODE_GROUPS.map(({ label, modes }) => ({
            label,
            links: modes
                .filter((mode) => isModeEnabled(config, mode))
                .map((mode) => ({
                    mode,
                    to: { pathname: modePath(config.path, mode), search },
                    label: modeLabel(mode),
                    icon: modeIcon(mode),
                })),
        })).filter((group) => group.links.length > 0),
    };
}

/** The about page: under the organism that is open, so that its navigation stays; on the landing page, the one without. */
export function useAboutPath(): string {
    const { organismPath } = useParams();
    const config = resolveOrganismConfig(organismPath);
    return config === undefined ? '/about' : `${config.path}/about`;
}
