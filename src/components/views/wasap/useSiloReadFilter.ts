import { useWasapLayoutContext } from './WasapLayout';
import { type SiloReadFilter } from '../../../dataLayer/queries';

/**
 * The filter to read the dataset of the page from SILO with: the location, and the sampling
 * date of the dataset filter. Pending while a preset of the sampling date (like "Most recent
 * 90 days") is still being turned into dates. `WasapLayout` has to be above.
 */
export function useSiloReadFilter(locationName: string | undefined) {
    const { samplingDate, isSamplingDatePending } = useWasapLayoutContext();

    const filter: SiloReadFilter = {
        ...(locationName && { locationName }),
        ...(samplingDate.dateFrom && { samplingDateFrom: samplingDate.dateFrom }),
        ...(samplingDate.dateTo && { samplingDateTo: samplingDate.dateTo }),
    };

    return { filter, isPending: isSamplingDatePending };
}
