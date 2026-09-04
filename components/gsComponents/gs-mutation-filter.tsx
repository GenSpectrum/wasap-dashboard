import { type FC } from 'react';

import { ReferenceGenomesAwaiter } from '../preact/components/ReferenceGenomesAwaiter';
import { MutationFilter, type MutationFilterProps } from '../preact/mutationFilter/mutation-filter';

export type { MutationFilterProps as GsMutationFilterProps };

export const GsMutationFilter: FC<MutationFilterProps> = (props) => (
    <ReferenceGenomesAwaiter>
        <MutationFilter {...props} />
    </ReferenceGenomesAwaiter>
);
