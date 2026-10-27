import { useWasapLayoutContext } from '../../components/pages/WasapLayout';
import { type RhydbReadFilter } from '../../dataLayer/queries';

/**
 * The filter to read the dataset of the page from RhyDB with: the locations (none for all), and the sampling
 * date of the dataset filter. Pending while a preset of the sampling date (like "Most recent
 * 90 days") is still being turned into dates. `WasapLayout` has to be above.
 */
export function useRhydbReadFilter(locationNames: string[]) {
    const { samplingDate, isSamplingDatePending } = useWasapLayoutContext();

    const filter: RhydbReadFilter = {
        ...(locationNames.length > 0 && { locationNames: locationNames as [string, ...string[]] }),
        ...(samplingDate.dateFrom && { samplingDateFrom: samplingDate.dateFrom }),
        ...(samplingDate.dateTo && { samplingDateTo: samplingDate.dateTo }),
    };

    return { filter, isPending: isSamplingDatePending };
}
