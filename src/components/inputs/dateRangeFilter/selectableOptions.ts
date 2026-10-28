import { type DateRangeOption } from '../../../domain/dateRange';

export const getSelectableOptions = (dateRangeOptions: DateRangeOption[]) => {
    return dateRangeOptions.map((customSelectOption) => {
        return { label: customSelectOption.label, value: customSelectOption.label };
    });
};
