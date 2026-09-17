import { type Dispatch, type SetStateAction } from 'react';

import { LabeledField } from './utils/LabeledField';
import { RadioSelect } from './utils/RadioSelect';
import { type WasapBaseFilter } from '../../../pageState/wasap/wasapAnalysisFilter';
import { recentDaysDateRangeOptions } from '../../../util/recentDaysDateRangeOptions';
import { TextFilter } from '../../textFilter/text-filter';
import { DynamicDateFilter } from '../DynamicDateFilter';

/**
 * Location / date-range / granularity controls, rendered above the plot
 * instead of in the sidebar. The date column gets a double share
 * (grid-cols-[1fr_2fr_1fr_1fr]) because DateRangeFilter (inside
 * DynamicDateFilter) needs to be roughly 28rem wide before its own container
 * query switches it from stacked to side-by-side (select + two date pickers);
 * an even quarter-share is too narrow for that on most viewports. min-w-0 on
 * each column stops its content from forcing the column wider than its share.
 */
export function BaseFilterControls({
    locationNameField,
    baseFilterState,
    setBaseFilterState,
}: {
    locationNameField: string;
    baseFilterState: WasapBaseFilter;
    setBaseFilterState: Dispatch<SetStateAction<WasapBaseFilter>>;
}) {
    return (
        <div className='grid grid-cols-[1fr_2fr_1fr_1fr] items-start gap-6 p-6'>
            <div className='min-w-0'>
                <LabeledField label='Sampling location'>
                    <TextFilter
                        placeholderText='Sampling location'
                        field={locationNameField}
                        onInputChange={({ locationName }) => {
                            setBaseFilterState({ ...baseFilterState, locationName });
                        }}
                        value={baseFilterState.locationName}
                    />
                </LabeledField>
            </div>

            <div className='min-w-0'>
                <DynamicDateFilter
                    label='Sampling date'
                    generateOptions={recentDaysDateRangeOptions}
                    value={baseFilterState.samplingDate}
                    onChange={(newDateRange?) => setBaseFilterState({ ...baseFilterState, samplingDate: newDateRange })}
                />
            </div>
            <div className='min-w-0'>
                <RadioSelect
                    label='Granularity'
                    value={baseFilterState.granularity}
                    options={[
                        { value: 'day', label: 'Day' },
                        { value: 'week', label: 'Week' },
                    ]}
                    onChange={(val) => setBaseFilterState({ ...baseFilterState, granularity: val })}
                />
            </div>
            <div className='min-w-0 pt-7 text-sm whitespace-nowrap'>
                <input
                    className='accent-primary'
                    type='checkbox'
                    id='excludeEmpty'
                    checked={baseFilterState.excludeEmpty}
                    onChange={(e) => setBaseFilterState({ ...baseFilterState, excludeEmpty: e.target.checked })}
                />
                <label htmlFor='excludeEmpty' className='pl-2'>
                    Exclude empty date ranges
                </label>
            </div>
        </div>
    );
}
