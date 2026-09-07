import { type FC } from 'react';

import { TextFilter, type TextFilterProps } from '../react/textFilter/text-filter';
import { type TextFilterChangedEvent } from '../react/textFilter/TextFilterChangedEvent';
import { gsEventNames } from '../utils/gsEventNames';

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
