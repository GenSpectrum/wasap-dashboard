import { type FC } from 'react';

import { type gsEventNames } from '../../util/gsEventNames';
import { type TextFilterChangedEvent } from '../textFilter/TextFilterChangedEvent';
import { TextFilter, type TextFilterProps } from '../textFilter/text-filter';

export type GsTextFilterProps = Omit<TextFilterProps, 'field' | 'width'> & {
    field?: TextFilterProps['field'];
    width?: TextFilterProps['width'];
};

// Defaults reproduce the old gs-text-filter Lit component's @property field initializers.
export const GsTextFilter: FC<GsTextFilterProps> = ({ field = '', width = '100%', ...rest }) => (
    <TextFilter field={field} width={width} {...rest} />
);

declare global {
    interface HTMLElementEventMap {
        [gsEventNames.textFilterChanged]: TextFilterChangedEvent;
    }
}
