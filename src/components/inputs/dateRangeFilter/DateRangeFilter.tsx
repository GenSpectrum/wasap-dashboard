import { useMemo } from 'react';

import { DatePicker } from './DatePicker';
import { computeInitialValues } from './computeInitialValues';
import { toYYYYMMDD } from './dateConversion';
import { type DateRangeOption, type DateRangeValue } from '../../../domain/dateRange';
import { ErrorBoundary } from '../../ui/ErrorBoundary';

const CUSTOM_OPTION = 'Custom';
const NOTHING_SELECTED = '__undefined__';

export type DateRangeFilterProps = {
    dateRangeOptions: DateRangeOption[];
    value: DateRangeValue;
    placeholder?: string;
    onDateRangeChange?: (value: DateRangeOption) => void;
};

type DateRangeFilterState = {
    label: string;
    dateFrom?: Date;
    dateTo?: Date;
} | null;

export const DateRangeFilter = (props: DateRangeFilterProps) => (
    <ErrorBoundary layout='horizontal' resetKeys={[props.value, props.dateRangeOptions]}>
        <DateRangeFilterWithoutErrors {...props} />
    </ErrorBoundary>
);

/** What is chosen: a preset by its label, or a custom range (`CUSTOM_OPTION`). Derived from `value` alone. */
function toState(value: DateRangeValue, dateRangeOptions: DateRangeOption[]): DateRangeFilterState {
    const initialValues = computeInitialValues(value, dateRangeOptions);
    if (!initialValues) {
        return null;
    }
    return {
        label: initialValues.initialSelectedDateRange ?? CUSTOM_OPTION,
        dateFrom: initialValues.initialSelectedDateFrom,
        dateTo: initialValues.initialSelectedDateTo,
    };
}

const DateRangeFilterWithoutErrors = ({
    dateRangeOptions,
    value,
    placeholder,
    onDateRangeChange,
}: DateRangeFilterProps) => {
    const state = useMemo(() => toState(value, dateRangeOptions), [value, dateRangeOptions]);
    // "Custom" is only an option while a custom range is chosen: it can't be picked, only typed.
    const options = state?.label === CUSTOM_OPTION ? [...dateRangeOptions, { label: CUSTOM_OPTION }] : dateRangeOptions;

    const dateFrom = state?.dateFrom !== undefined ? toYYYYMMDD(state.dateFrom) : undefined;
    const dateTo = state?.dateTo !== undefined ? toYYYYMMDD(state.dateTo) : undefined;

    return (
        <div className='grid grid-cols-[minmax(0,40fr)_minmax(0,30fr)_minmax(0,30fr)]'>
            <select
                className='select w-full'
                value={state?.label ?? NOTHING_SELECTED}
                onChange={(event) => {
                    const option = dateRangeOptions.find((item) => item.label === event.currentTarget.value);
                    if (option !== undefined) {
                        onDateRangeChange?.(option);
                    }
                }}
            >
                <option value={NOTHING_SELECTED} disabled>
                    {placeholder ?? 'Select an option'}
                </option>
                {options.map(({ label }) => (
                    <option key={label} value={label}>
                        {label}
                    </option>
                ))}
            </select>
            <DatePicker
                className='w-full'
                value={dateFrom}
                onChange={(date) => onDateRangeChange?.({ label: CUSTOM_OPTION, dateFrom: date, dateTo })}
                maxDate={dateTo}
                placeholderText={'Date from'}
            />
            <DatePicker
                className='w-full'
                value={dateTo}
                onChange={(date) => onDateRangeChange?.({ label: CUSTOM_OPTION, dateFrom, dateTo: date })}
                minDate={dateFrom}
                placeholderText={'Date to'}
            />
        </div>
    );
};
