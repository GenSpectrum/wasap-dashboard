import { LocationOverviewTable } from '../LocationOverviewTable';
import { OverviewStats } from '../OverviewStats';

/**
 * The landing page of an organism: whole-instance stats and a table of every sampling location.
 * Unfiltered, always — there is no dataset filter (location/date/granularity) here, unlike the
 * analysis mode pages, since scoping to one location would defeat a page whose point is to list
 * every location. It doesn't use `ModePageLayout` for the same reason: there is no sidebar filter
 * to lay out next to.
 */
export function OverviewPage() {
    return (
        <div className='flex-1 space-y-6 bg-stone-50 p-6'>
            <OverviewStats />
            <LocationOverviewTable />
        </div>
    );
}
