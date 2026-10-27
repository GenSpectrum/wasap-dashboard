import { type OrganismConfig } from '../../config/organismConfig';
import { type DatasetFilter } from '../../pageState/wasap/analysisFilter';
import { recentDaysDateRangeOptions } from '../../util/recentDaysDateRangeOptions';
import { DynamicDateFilter } from '../inputs/DynamicDateFilter';
import { LabeledField } from '../inputs/LabeledField';
import { LocationMultiSelect } from '../inputs/LocationMultiSelect';
import { RadioSelect } from '../inputs/RadioSelect';

/**
 * Selects the dataset that is analyzed: locations, dates and how they are
 * grouped. It is the same for all the analysis modes, and changes apply right away.
 */
export function DatasetFilterPanel({
    config,
    value,
    onChange,
}: {
    config: Pick<OrganismConfig, 'locationNameField'>;
    value: DatasetFilter;
    onChange: (value: DatasetFilter) => void;
}) {
    return (
        // The date column is the widest: the select and the two dates of the date filter are in one row, which
        // needs about 24rem. The flex bases are what the columns wrap at on a narrow page.
        <section aria-label='Filter dataset' className='flex flex-wrap items-start gap-x-6 gap-y-4 p-6'>
            <div className='min-w-0 flex-[1_1_11rem]'>
                <LabeledField label='Sampling locations'>
                    <LocationMultiSelect
                        field={config.locationNameField}
                        value={value.locationNames}
                        onChange={(locationNames) => onChange({ ...value, locationNames })}
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
        </section>
    );
}
