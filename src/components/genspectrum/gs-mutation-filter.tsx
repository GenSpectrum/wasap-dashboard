import { type FC } from 'react';

import { ReferenceGenomesAwaiter } from '../shared/ReferenceGenomesAwaiter';
import { MutationFilter, type MutationFilterProps } from '../mutationFilter/mutation-filter';
import { type MutationsFilter } from '../../types/dashboardComponents';
import { gsEventNames } from '../../util/gsEventNames';

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
