import { useMemo } from 'react';

import { computeInitialValues } from './computeInitialValues';
import { DatePicker } from './date-picker';
import { toYYYYMMDD } from './dateConversion';
import { type DateRangeOption, type DateRangeValue } from './dateRangeOption';
import { ErrorBoundary } from '../../shared/error-boundary';
import { ClearableSelect } from '../clearable-select';

const CUSTOM_OPTION = 'Custom';

export type DateRangeFilterProps = {
    dateRangeOptions: DateRangeOption[];
    value: DateRangeValue;
    placeholder?: string;
    onDateRangeChange?: (value: DateRangeOption | null) => void;
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

    const changeCustomRange = (dateFrom: Date | undefined, dateTo: Date | undefined) => {
        onDateRangeChange?.({
            label: CUSTOM_OPTION,
            dateFrom: dateFrom !== undefined ? toYYYYMMDD(dateFrom) : undefined,
            dateTo: dateTo !== undefined ? toYYYYMMDD(dateTo) : undefined,
        });
    };

    const onChangeDateFrom = (date: Date | undefined) => {
        if (date?.toDateString() !== state?.dateFrom?.toDateString()) {
            changeCustomRange(date, state?.dateTo);
        }
    };

    const onChangeDateTo = (date: Date | undefined) => {
        if (date?.toDateString() !== state?.dateTo?.toDateString()) {
            changeCustomRange(state?.dateFrom, date);
        }
    };

    return (
        <div className='grid grid-cols-[minmax(0,40fr)_minmax(0,30fr)_minmax(0,30fr)]'>
            <ClearableSelect
                items={options.map((item) => item.label)}
                placeholderText={placeholder}
                onChange={(label) => {
                    if (label === null) {
                        onDateRangeChange?.(null);
                        return;
                    }
                    const option = dateRangeOptions.find((item) => item.label === label);
                    if (option !== undefined) {
                        onDateRangeChange?.(option);
                    }
                }}
                value={state?.label ?? null}
                className='w-full'
            />
            <DatePicker
                className='w-full'
                value={state?.dateFrom}
                onChange={onChangeDateFrom}
                maxDate={state?.dateTo}
                placeholderText={'Date from'}
            />
            <DatePicker
                className='w-full'
                value={state?.dateTo}
                onChange={onChangeDateTo}
                minDate={state?.dateFrom}
                placeholderText={'Date to'}
            />
        </div>
    );
};
