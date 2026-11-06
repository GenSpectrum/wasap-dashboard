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
        // One group: each date field overlaps the field before it by its border, so that they share one line. In a
        // flex row, unlike grid columns, each overlap moves the fields after it too. The dates share what the
        // preset leaves.
        <div className='flex'>
            <select
                className='select min-w-0 flex-[0_0_40%]'
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
            <div className={JOINED}>
                <DatePicker
                    className='w-full'
                    value={dateFrom}
                    onChange={(date) => onChange({ label: CUSTOM_DATE_RANGE_LABEL, dateFrom: date, dateTo })}
                    maxDate={dateTo}
                    placeholderText={'Date from'}
                />
            </div>
            <div className={JOINED}>
                <DatePicker
                    className='w-full'
                    value={dateTo}
                    onChange={(date) => onChange({ label: CUSTOM_DATE_RANGE_LABEL, dateFrom, dateTo: date })}
                    minDate={dateFrom}
                    placeholderText={'Date to'}
                />
            </div>
        </div>
    );
}

/** A field after the first: its left border on the right border of the one before it, above it while focused. */
const JOINED = 'relative -ml-px min-w-0 flex-1 focus-within:z-10';
