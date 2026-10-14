import { useWasapLayoutContext } from '../../components/pages/WasapLayout';
import { type SiloReadFilter } from '../../dataLayer/queries';

/**
 * The filter to read the dataset of the page from SILO with: the locations (none for all), and the sampling
 * date of the dataset filter. Pending while a preset of the sampling date (like "Most recent
 * 90 days") is still being turned into dates. `WasapLayout` has to be above.
 */
export function useSiloReadFilter(locationNames: string[]) {
    const { samplingDate, isSamplingDatePending } = useWasapLayoutContext();

    const filter: SiloReadFilter = {
        ...(locationNames.length > 0 && { locationNames: locationNames as [string, ...string[]] }),
        ...(samplingDate.dateFrom && { samplingDateFrom: samplingDate.dateFrom }),
        ...(samplingDate.dateTo && { samplingDateTo: samplingDate.dateTo }),
    };

    return { filter, isPending: isSamplingDatePending };
}
