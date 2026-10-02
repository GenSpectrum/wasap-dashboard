import { type AmpliconsConfig } from '../../amplicons/ampliconsConfig';
import { LocationOverviewTable } from '../dataDisplay/LocationOverviewTable';
import { MedianAmpliconCoverageHeatmap } from '../dataDisplay/MedianAmpliconCoverageHeatmap';
import { OverviewStats } from '../dataDisplay/OverviewStats';
import { SamplesOverTimePlot } from '../dataDisplay/SamplesOverTimePlot';

/**
 * The landing page of an organism: whole-instance stats, which location was sampled on which
 * date and from which batch, and a table of every sampling location. Unfiltered, always — there
 * is no dataset filter (location/date/granularity) here, unlike the analysis mode pages, since
 * scoping to one location would defeat a page whose point is to list every location. It doesn't
 * use `ModePageLayout` for the same reason: there is no sidebar filter to lay out next to.
 *
 * With a primer scheme (`amplicons`), also the median amplicon coverage per location and week, a proxy of the viral load.
 */
export function OverviewPage({ amplicons }: { amplicons?: AmpliconsConfig }) {
    return (
        <div className='flex-1 space-y-6 bg-stone-50 p-6'>
            <OverviewStats />
            <SamplesOverTimePlot />
            {amplicons === undefined ? (
                <LocationOverviewTable />
            ) : (
                // Side by side where there is room for both, the table first.
                <div className='grid items-start gap-6 xl:grid-cols-2'>
                    <LocationOverviewTable />
                    <MedianAmpliconCoverageHeatmap amplicons={amplicons} />
                </div>
            )}
        </div>
    );
}
