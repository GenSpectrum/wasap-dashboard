import { useState } from 'react';

import { type WasapPageConfig } from '../config/wasapPageConfig';
import { type WasapDatasetFilter } from '../pageState/wasap/wasapAnalysisFilter';
import { recentDaysDateRangeOptions } from '../util/recentDaysDateRangeOptions';
import { DynamicDateFilter } from './inputs/DynamicDateFilter';
import { LabeledField } from './inputs/LabeledField';
import { RadioSelect } from './inputs/RadioSelect';
import { TextFilter } from './inputs/textFilter/text-filter';

/**
 * Selects the dataset that is analyzed: location, dates and how they are
 * grouped. It is the same for all the analysis modes, and changes apply right away.
 */
export function DatasetFilterPanel({
    config,
    value,
    onChange,
}: {
    config: Pick<WasapPageConfig, 'locationNameField'>;
    value: WasapDatasetFilter;
    onChange: (value: WasapDatasetFilter) => void;
}) {
    // Clearing the location is only a step towards picking another one. It is not applied, since a
    // URL without a location means the default location, which would fill the field again right away.
    // So the field stays empty until a location is picked (or the location in the URL changes).
    const [clearedLocation, setClearedLocation] = useState<{ from: string | undefined }>();
    const isLocationCleared = clearedLocation !== undefined && clearedLocation.from === value.locationName;

    return (
        // The date column is the widest: the select and the two dates of the date filter are in one row, which
        // needs about 24rem. The flex bases are what the columns wrap at on a narrow page. The checkbox is
        // aligned to the bottom, so that it sits next to the inputs, also when it wraps onto a row of its own.
        <section aria-label='Filter dataset' className='flex flex-wrap items-start gap-x-6 gap-y-4 p-6'>
            <div className='min-w-0 flex-[1_1_11rem]'>
                <LabeledField label='Sampling location'>
                    <TextFilter
                        placeholderText='Sampling location'
                        field={config.locationNameField}
                        onInputChange={({ locationName }) => {
                            if (locationName === undefined) {
                                setClearedLocation({ from: value.locationName });
                                return;
                            }
                            setClearedLocation(undefined);
                            onChange({ ...value, locationName });
                        }}
                        value={isLocationCleared ? undefined : value.locationName}
                    />
                </LabeledField>
            </div>

            <div className='min-w-0 flex-[2_1_24rem]'>
                <DynamicDateFilter
                    label='Sampling date'
                    generateOptions={recentDaysDateRangeOptions}
                    value={value.samplingDate}
                    onChange={(samplingDate) => onChange({ ...value, samplingDate })}
                />
            </div>

            <div className='min-w-0 flex-[1_1_9rem]'>
                <RadioSelect
                    label='Granularity'
                    value={value.granularity}
                    options={[
                        { value: 'day', label: 'Day' },
                        { value: 'week', label: 'Week' },
                    ]}
                    onChange={(granularity) => onChange({ ...value, granularity })}
                />
            </div>

            <div className='self-end pb-2.5 text-sm whitespace-nowrap'>
                <input
                    className='accent-primary'
                    type='checkbox'
                    id='excludeEmpty'
                    checked={value.excludeEmpty}
                    onChange={(e) => onChange({ ...value, excludeEmpty: e.target.checked })}
                />
                <label htmlFor='excludeEmpty' className='pl-2'>
                    Hide empty dates
                </label>
            </div>
        </section>
    );
}
