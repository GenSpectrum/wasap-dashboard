import { DynamicDateFilter } from '../DynamicDateFilter';
import { LabeledField } from './utils/LabeledField';
import { RadioSelect } from './utils/RadioSelect';
import { type WasapPageConfig } from '../../../config/wasapPageConfig';
import { type WasapDatasetFilter } from '../../../pageState/wasap/wasapAnalysisFilter';
import { recentDaysDateRangeOptions } from '../../../util/recentDaysDateRangeOptions';
import { TextFilter } from '../../textFilter/text-filter';

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
    return (
        <section aria-label='Filter dataset' className='flex flex-wrap items-start gap-x-6 gap-y-2 p-2'>
            <div className='w-64'>
                <LabeledField label='Sampling location'>
                    <TextFilter
                        placeholderText='Sampling location'
                        field={config.locationNameField}
                        onInputChange={({ locationName }) => onChange({ ...value, locationName })}
                        value={value.locationName}
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
