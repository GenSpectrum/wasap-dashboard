import { type FC } from 'react';

import { DateRangeFilter, type DateRangeFilterProps } from '../preact/dateRangeFilter/date-range-filter';
import { type DateRangeOptionChangedEvent } from '../preact/dateRangeFilter/dateRangeOption';
import { gsEventNames } from '../utils/gsEventNames';

export type GsDateRangeFilterProps = Omit<DateRangeFilterProps, 'dateRangeOptions' | 'value' | 'width'> & {
    dateRangeOptions?: DateRangeFilterProps['dateRangeOptions'];
    value?: DateRangeFilterProps['value'];
    width?: DateRangeFilterProps['width'];
};

// Defaults reproduce the old gs-date-range-filter Lit component's @property field initializers.
export const GsDateRangeFilter: FC<GsDateRangeFilterProps> = ({
    dateRangeOptions = [],
    value = null,
    width = '100%',
    ...rest
}) => <DateRangeFilter dateRangeOptions={dateRangeOptions} value={value} width={width} {...rest} />;

declare global {
    interface HTMLElementEventMap {
        [gsEventNames.dateRangeFilterChanged]: CustomEvent<Record<string, string>>;
        [gsEventNames.dateRangeOptionChanged]: DateRangeOptionChangedEvent;
    }
}
