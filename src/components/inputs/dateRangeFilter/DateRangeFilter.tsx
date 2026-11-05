import { DatePicker } from './DatePicker';
import { CUSTOM_DATE_RANGE_LABEL, type DateRangeOption } from '../../../domain/dateRange';

/**
 * A preset, and the dates from and to. `value` has its dates (see `resolveDateRange`); editing a date
 * makes it a custom range.
 */
export function DateRangeFilter({
    dateRangeOptions,
    value,
    onChange,
}: {
    dateRangeOptions: DateRangeOption[];
    value: DateRangeOption;
    onChange: (value: DateRangeOption) => void;
}) {
    const { label, dateFrom, dateTo } = value;
    // "Custom" is only an option while a custom range is chosen: it can't be picked, only typed.
    const labels = dateRangeOptions.map((option) => option.label);
    if (label === CUSTOM_DATE_RANGE_LABEL) {
        labels.push(CUSTOM_DATE_RANGE_LABEL);
    }

    return (
        <div className='grid grid-cols-[minmax(0,40fr)_minmax(0,30fr)_minmax(0,30fr)]'>
            <select
                className='select w-full'
                value={label}
                onChange={(event) => {
                    const option = dateRangeOptions.find((item) => item.label === event.currentTarget.value);
                    if (option !== undefined) {
                        onChange(option);
                    }
                }}
            >
                {labels.map((optionLabel) => (
                    <option key={optionLabel} value={optionLabel}>
                        {optionLabel}
                    </option>
                ))}
            </select>
            <DatePicker
                className='w-full'
                value={dateFrom}
                onChange={(date) => onChange({ label: CUSTOM_DATE_RANGE_LABEL, dateFrom: date, dateTo })}
                maxDate={dateTo}
                placeholderText={'Date from'}
            />
            <DatePicker
                className='w-full'
                value={dateTo}
                onChange={(date) => onChange({ label: CUSTOM_DATE_RANGE_LABEL, dateFrom, dateTo: date })}
                minDate={dateFrom}
                placeholderText={'Date to'}
            />
        </div>
    );
}
