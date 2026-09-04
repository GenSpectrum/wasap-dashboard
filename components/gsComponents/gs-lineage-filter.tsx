import { type FC } from 'react';

import { LineageFilter, type LineageFilterProps } from '../preact/lineageFilter/lineage-filter';
import {
    type LineageFilterChangedEvent,
    type LineageMultiFilterChangedEvent,
} from '../preact/lineageFilter/LineageFilterChangedEvent';
import { gsEventNames } from '../utils/gsEventNames';

export type GsLineageFilterProps = Omit<LineageFilterProps, 'lapisField' | 'lapisFilter' | 'width'> & {
    lapisField?: LineageFilterProps['lapisField'];
    lapisFilter?: LineageFilterProps['lapisFilter'];
    width?: LineageFilterProps['width'];
};

// Defaults reproduce the old gs-lineage-filter Lit component's @property field initializers.
export const GsLineageFilter: FC<GsLineageFilterProps> = ({
    lapisField = '',
    lapisFilter = {},
    width = '100%',
    ...rest
}) => <LineageFilter lapisField={lapisField} lapisFilter={lapisFilter} width={width} {...rest} />;

declare global {
    interface HTMLElementEventMap {
        [gsEventNames.lineageFilterChanged]: LineageFilterChangedEvent;
        [gsEventNames.lineageFilterMultiChanged]: LineageMultiFilterChangedEvent;
    }
}
