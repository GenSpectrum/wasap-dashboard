import { type FC } from 'react';

import { LineageFilter, type LineageFilterProps } from '../lineageFilter/lineage-filter';
import {
    type LineageFilterChangedEvent,
    type LineageMultiFilterChangedEvent,
} from '../lineageFilter/LineageFilterChangedEvent';
import { gsEventNames } from '../../util/gsEventNames';

export type GsLineageFilterProps = Omit<LineageFilterProps, 'field' | 'width'> & {
    field?: LineageFilterProps['field'];
    width?: LineageFilterProps['width'];
};

// Defaults reproduce the old gs-lineage-filter Lit component's @property field initializers.
export const GsLineageFilter: FC<GsLineageFilterProps> = ({ field = '', width = '100%', ...rest }) => (
    <LineageFilter field={field} width={width} {...rest} />
);

declare global {
    interface HTMLElementEventMap {
        [gsEventNames.lineageFilterChanged]: LineageFilterChangedEvent;
        [gsEventNames.lineageFilterMultiChanged]: LineageMultiFilterChangedEvent;
    }
}
