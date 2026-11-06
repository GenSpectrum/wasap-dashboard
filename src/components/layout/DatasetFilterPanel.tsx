import { useId } from 'react';

import { recentDaysDateRangeOptions } from '../../domain/dateRange';
import { type DatasetFilter } from '../../pageState/analysisFilter';
import { SECTION_TITLE_CLASS } from '../filterSidebar/FilterSection';
import { DynamicDateFilter } from '../inputs/DynamicDateFilter';
import { LocationMultiSelect } from '../inputs/LocationMultiSelect';
import { SegmentedSelect } from '../inputs/SegmentedSelect';
import { HelpButton } from '../ui/HelpButton';

/**
 * Selects the dataset that is analyzed: locations, dates and how they are
 * grouped. It is the same for all the analysis modes, and changes apply right away.
 *
 * One heading for the whole row instead of a label per control, which would take a line of their own:
 * each control has an icon instead, and its name for screen readers.
 */
export function DatasetFilterPanel({
    value,
    onChange,
}: {
    value: DatasetFilter;
    onChange: (value: DatasetFilter) => void;
}) {
    const titleId = useId();

    return (
        <section aria-labelledby={titleId} className='px-4 pt-4 lg:px-6 lg:pt-6'>
            {/* One bar like the panels below, with the heading and the controls as its cells, which the controls fill
                (the dropdowns are made for it, Daily/Weekly is `embedded`). Stacked on a narrow page, in two rows on a
                middling one (the locations above the date and Daily/Weekly), in one row on a wide one. The date cell
                is as wide as its longest text (a preset and both dates): the locations take the rest, for when
                several are picked. */}
            <div className='grid border border-stone-300 bg-white md:grid-cols-[auto_minmax(0,1fr)_12rem] xl:grid-cols-[auto_minmax(0,1fr)_25rem_12rem]'>
                <div className='flex items-center gap-1.5 px-3.5 py-2 md:row-span-2 md:py-0 xl:row-span-1'>
                    <h2 id={titleId} className={SECTION_TITLE_CLASS}>
                        Dataset
                    </h2>
                    <HelpButton
                        info={<DatasetInfo />}
                        ariaLabel='Show information about the dataset'
                        size='small'
                        placement='bottom-start'
                    />
                </div>

                <div className={`${CELL} md:col-span-2 md:border-t-0 xl:col-span-1`}>
                    <LocationMultiSelect
                        label='Sampling locations'
                        icon='mdi--map-marker-outline'
                        value={value.locationNames}
                        onChange={(locationNames) => onChange({ ...value, locationNames })}
                    />
                </div>

                <div className={`${CELL} xl:border-t-0`}>
                    <DynamicDateFilter
                        label='Sampling date'
                        icon='mdi--calendar-blank-outline'
                        generateOptions={recentDaysDateRangeOptions}
                        value={value.samplingDate}
                        onChange={(samplingDate) => onChange({ ...value, samplingDate })}
                    />
                </div>

                <div className={`${CELL} xl:border-t-0`}>
                    <SegmentedSelect
                        label='Granularity'
                        icon='mdi--blur-linear'
                        embedded
                        value={value.granularity}
                        options={[
                            { value: 'day', label: 'Daily' },
                            { value: 'week', label: 'Weekly' },
                        ]}
                        onChange={(granularity) => onChange({ ...value, granularity })}
                    />
                </div>
            </div>
        </section>
    );
}

/** A cell of the bar, with a rule above it and, beside another cell, on its left. Which of them are drawn depends
 * on where the cell sits in the layout. 38px tall, so that a bar of one row is 40px with its border. */
const CELL = 'h-9 min-w-0 border-t border-stone-200 md:h-[2.375rem] md:border-l';

function DatasetInfo() {
    return (
        <div className='w-80 max-w-full space-y-2 text-sm font-normal text-gray-700'>
            <p className='text-gray-500 italic'>
                Location and date selection for which samples to include, as well as whether to show daily data or
                aggregate over weeks.
            </p>
        </div>
    );
}
