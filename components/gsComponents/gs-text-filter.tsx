import { type FC } from 'react';

import { TextFilter, type TextFilterProps } from '../react/textFilter/text-filter';
import { type TextFilterChangedEvent } from '../react/textFilter/TextFilterChangedEvent';
import { gsEventNames } from '../utils/gsEventNames';

export type GsTextFilterProps = Omit<TextFilterProps, 'lapisField' | 'lapisFilter' | 'width'> & {
    lapisField?: TextFilterProps['lapisField'];
    lapisFilter?: TextFilterProps['lapisFilter'];
    width?: TextFilterProps['width'];
};

// Defaults reproduce the old gs-text-filter Lit component's @property field initializers.
export const GsTextFilter: FC<GsTextFilterProps> = ({ lapisField = '', lapisFilter = {}, width = '100%', ...rest }) => (
    <TextFilter lapisField={lapisField} lapisFilter={lapisFilter} width={width} {...rest} />
);

declare global {
    interface HTMLElementEventMap {
        [gsEventNames.textFilterChanged]: TextFilterChangedEvent;
    }
}
