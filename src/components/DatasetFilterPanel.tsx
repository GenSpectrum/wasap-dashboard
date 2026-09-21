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
        <section aria-label='Filter dataset' className='flex flex-wrap items-start gap-x-6 gap-y-2 p-2'>
            <div className='w-64'>
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

            <div className='w-64'>
                <DynamicDateFilter
                    label='Sampling date'
                    generateOptions={recentDaysDateRangeOptions}
                    value={value.samplingDate}
                    onChange={(samplingDate) => onChange({ ...value, samplingDate })}
                />
            </div>

            <div className='w-56'>
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

            <div className='self-center text-sm'>
                <input
                    className='accent-primary'
                    type='checkbox'
                    id='excludeEmpty'
                    checked={value.excludeEmpty}
                    onChange={(e) => onChange({ ...value, excludeEmpty: e.target.checked })}
                />
                <label htmlFor='excludeEmpty' className='pl-2'>
                    Exclude empty date ranges
                </label>
            </div>
        </section>
    );
}
