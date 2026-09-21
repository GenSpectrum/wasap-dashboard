import { useCallback, useEffect, useMemo, useState } from 'react';
import z from 'zod';

import { computeInitialValues } from './computeInitialValues';
import { DatePicker } from './date-picker';
import { toYYYYMMDD } from './dateConversion';
import { type DateRangeOption, dateRangeOptionSchema, dateRangeValueSchema } from './dateRangeOption';
import { ErrorBoundary } from '../../shared/error-boundary';
import { ClearableSelect } from '../clearable-select';

const CUSTOM_OPTION = 'Custom';

const dateRangeFilterInnerPropsSchema = z.object({
    dateRangeOptions: z.array(dateRangeOptionSchema),
    value: dateRangeValueSchema,
    placeholder: z.string().optional(),
});

const dateRangeFilterPropsSchema = dateRangeFilterInnerPropsSchema.extend({
    width: z.string(),
});

export type DateRangeFilterInnerProps = z.infer<typeof dateRangeFilterInnerPropsSchema> & {
    onDateRangeChange?: (value: DateRangeOption | null) => void;
};

export type DateRangeFilterProps = Omit<z.infer<typeof dateRangeFilterPropsSchema>, 'width'> & {
    width?: string;
    onDateRangeChange?: (value: DateRangeOption | null) => void;
};

type DateRangeFilterState = {
    label: string;
    dateFrom?: Date;
    dateTo?: Date;
} | null;

// width default reproduces the old gs-date-range-filter Lit component's @property field initializer.
export const DateRangeFilter = ({ width = '100%', onDateRangeChange, ...innerProps }: DateRangeFilterProps) => {
    const size = { width, height: '3rem' };
    const validatedProps = { width, ...innerProps };

    return (
        <ErrorBoundary
            size={size}
            layout='horizontal'
            componentProps={validatedProps}
            schema={dateRangeFilterPropsSchema}
        >
            <div style={{ width }}>
                <DateRangeFilterInner {...innerProps} onDateRangeChange={onDateRangeChange} />
            </div>
        </ErrorBoundary>
    );
};

export const DateRangeFilterInner = ({
    dateRangeOptions,
    value,
    placeholder,
    onDateRangeChange,
}: DateRangeFilterInnerProps) => {
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
        <div className={'@container'}>
            <div className='flex min-w-[7.5rem] flex-col @md:flex-row'>
                <div className='grow'>
                    <ClearableSelect
                        items={options.map((item) => item.label)}
                        placeholderText={placeholder}
                        onChange={(value) => {
                            const dateRangeOption = options.find((item) => item.label === value);
                            onSelectChange(dateRangeOption ?? null);
                        }}
                        value={state?.label ?? null}
                        selectClassName={'rounded-t-md rounded-b-none @md:rounded-l-md @md:rounded-r-none'}
                    />
                </div>
                <div className={'@4xs:flex-row flex grow flex-col'}>
                    <DatePicker
                        className={'@4xs:rounded-bl-md min-w-[7.5rem] grow rounded-none @md:rounded-l-none'}
                        value={state?.dateFrom}
                        onChange={onChangeDateFrom}
                        maxDate={state?.dateTo}
                        placeholderText={'Date from'}
                    />
                    <DatePicker
                        className={
                            '@4xs:rounded-tr-none @4xs:rounded-l-none min-w-[7.5rem] grow rounded-t-none rounded-b-md @md:rounded-r-md'
                        }
                        value={state?.dateTo}
                        onChange={onChangeDateTo}
                        minDate={state?.dateFrom}
                        placeholderText={'Date to'}
                    />
                </div>
            </div>
        </div>
    );
};

function toMaybeDate(dateString: string | undefined) {
    return dateString ? new Date(dateString) : undefined;
}
