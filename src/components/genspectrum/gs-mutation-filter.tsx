import { type FC } from 'react';

import { type MutationsFilter } from '../../types/dashboardComponents';
import { type gsEventNames } from '../../util/gsEventNames';
import { MutationFilter, type MutationFilterProps } from '../mutationFilter/mutation-filter';
import { ReferenceGenomesAwaiter } from '../shared/ReferenceGenomesAwaiter';

export type GsMutationFilterProps = Omit<MutationFilterProps, 'width'> & { width?: MutationFilterProps['width'] };

// width default reproduces the old gs-mutation-filter Lit component's @property field initializer.
export const GsMutationFilter: FC<GsMutationFilterProps> = ({ width = '100%', ...rest }) => (
    <ReferenceGenomesAwaiter>
        <MutationFilter width={width} {...rest} />
    </ReferenceGenomesAwaiter>
);

declare global {
    interface HTMLElementEventMap {
        [gsEventNames.mutationFilterChanged]: CustomEvent<MutationsFilter>;
    }
}
