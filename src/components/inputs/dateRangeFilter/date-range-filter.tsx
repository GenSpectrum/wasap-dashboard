import { useCallback, useEffect, useMemo, useState } from 'react';

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

const DateRangeFilterWithoutErrors = ({
    dateRangeOptions,
    value,
    placeholder,
    onDateRangeChange,
}: DateRangeFilterProps) => {
    const initialValues = useMemo(() => computeInitialValues(value, dateRangeOptions), [value, dateRangeOptions]);

    const getInitialState = useCallback(() => {
        if (!initialValues) {
            return null;
        }
        return initialValues.initialSelectedDateRange
            ? {
                  label: initialValues.initialSelectedDateRange,
                  dateFrom: initialValues.initialSelectedDateFrom,
                  dateTo: initialValues.initialSelectedDateTo,
              }
            : {
                  label: CUSTOM_OPTION,
                  dateFrom: initialValues.initialSelectedDateFrom,
                  dateTo: initialValues.initialSelectedDateTo,
              };
    }, [initialValues]);

    const customComboboxValue = { label: CUSTOM_OPTION };
    const [options, setOptions] = useState(
        getInitialState()?.label === CUSTOM_OPTION ? [...dateRangeOptions, customComboboxValue] : [...dateRangeOptions],
    );
    const [state, setState] = useState<DateRangeFilterState>(getInitialState());

    function updateState(newState: DateRangeFilterState) {
        setState(newState);
        notifyChange(newState);
    }

    useEffect(() => {
        setState(getInitialState());
    }, [getInitialState]);

    const onSelectChange = (option: DateRangeOption | null) => {
        updateState(
            option !== null
                ? {
                      label: option.label,
                      dateFrom: toMaybeDate(option.dateFrom),
                      dateTo: toMaybeDate(option.dateTo),
                  }
                : null,
        );
        if (option?.label !== CUSTOM_OPTION) {
            setOptions([...dateRangeOptions]);
        }
    };

    const onChangeDateFrom = (date: Date | undefined) => {
        if (date?.toDateString() === state?.dateFrom?.toDateString()) {
            return;
        }

        updateState({
            label: CUSTOM_OPTION,
            dateFrom: date,
            dateTo: state?.dateTo,
        });
        setOptions([...dateRangeOptions, customComboboxValue]);
    };

    const onChangeDateTo = (date: Date | undefined) => {
        if (date?.toDateString() === state?.dateTo?.toDateString()) {
            return;
        }

        updateState({
            label: CUSTOM_OPTION,
            dateFrom: state?.dateFrom,
            dateTo: date,
        });
        setOptions([...dateRangeOptions, customComboboxValue]);
    };

    const notifyChange = (state: DateRangeFilterState) => {
        if (state === null) {
            onDateRangeChange?.(null);
            return;
        }
        if (state.label === CUSTOM_OPTION) {
            onDateRangeChange?.({
                label: CUSTOM_OPTION,
                dateFrom: state.dateFrom !== undefined ? toYYYYMMDD(state.dateFrom) : undefined,
                dateTo: state.dateTo !== undefined ? toYYYYMMDD(state.dateTo) : undefined,
            });
            return;
        }
        const matchingOption = dateRangeOptions.find((option) => option.label === state.label);
        if (matchingOption === undefined) {
            throw new Error(`Invalid date range option: ${state.label}`);
        }
        onDateRangeChange?.(matchingOption);
    };

    return (
        <div className='grid grid-cols-[minmax(0,40fr)_minmax(0,30fr)_minmax(0,30fr)]'>
            <ClearableSelect
                items={options.map((item) => item.label)}
                placeholderText={placeholder}
                onChange={(value) => {
                    const dateRangeOption = options.find((item) => item.label === value);
                    onSelectChange(dateRangeOption ?? null);
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

function toMaybeDate(dateString: string | undefined) {
    return dateString ? new Date(dateString) : undefined;
}
