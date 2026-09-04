import { type FC } from 'react';

import { NumberRangeFilter, type NumberRangeFilterProps } from '../preact/numberRangeFilter/number-range-filter';
import {
    type NumberRangeFilterChangedEvent,
    type NumberRangeValueChangedEvent,
} from '../preact/numberRangeFilter/NumberRangeFilterChangedEvent';
import { gsEventNames } from '../utils/gsEventNames';

export type GsNumberRangeFilterProps = Omit<
    NumberRangeFilterProps,
    'lapisField' | 'sliderMin' | 'sliderMax' | 'sliderStep' | 'width'
> & {
    lapisField?: NumberRangeFilterProps['lapisField'];
    sliderMin?: NumberRangeFilterProps['sliderMin'];
    sliderMax?: NumberRangeFilterProps['sliderMax'];
    sliderStep?: NumberRangeFilterProps['sliderStep'];
    width?: NumberRangeFilterProps['width'];
};

// Defaults reproduce the old gs-number-range-filter Lit component's @property field initializers.
export const GsNumberRangeFilter: FC<GsNumberRangeFilterProps> = ({
    lapisField = '',
    sliderMin = 0,
    sliderMax = 100,
    sliderStep = 1,
    width = '100%',
    ...rest
}) => (
    <NumberRangeFilter
        lapisField={lapisField}
        sliderMin={sliderMin}
        sliderMax={sliderMax}
        sliderStep={sliderStep}
        width={width}
        {...rest}
    />
);

declare global {
    interface HTMLElementEventMap {
        [gsEventNames.numberRangeFilterChanged]: NumberRangeFilterChangedEvent;
        [gsEventNames.numberRangeValueChanged]: NumberRangeValueChangedEvent;
    }
}
