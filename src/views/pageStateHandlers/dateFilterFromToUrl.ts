import { type DateRangeOption } from '../../components/dateRangeFilter/dateRangeOption';
import { CustomDateRangeLabel } from '../../types/DateWindow';

export const setSearchFromDateRange = (
    search: URLSearchParams,
    name: string,
    dateRange: DateRangeOption | undefined | null,
) => {
    if (dateRange !== null && dateRange !== undefined) {
        let serializedValue: string;
        if (dateRange.label === CustomDateRangeLabel) {
            serializedValue = `${dateRange.dateFrom ?? ''}--${dateRange.dateTo ?? ''}`;
        } else {
            serializedValue = dateRange.label;
        }
        search.set(name, serializedValue);
    }
};
