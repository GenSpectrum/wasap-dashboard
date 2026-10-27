import { type UseQueryResult } from '@tanstack/react-query';
import { type ReactNode } from 'react';

import { type ReferenceGenome } from '../../dataLayer/queries';

/** The controls in `children` once the reference genome is loaded; until then a spinner, or the error. */
export function WithReferenceGenome({
    referenceGenome,
    children,
}: {
    referenceGenome: UseQueryResult<ReferenceGenome>;
    children: (referenceGenome: ReferenceGenome) => ReactNode;
}) {
    if (referenceGenome.isError) {
        return <span>Cannot fetch the reference genome. {referenceGenome.error.message}</span>;
    }
    if (referenceGenome.isPending) {
        return <div className='loading loading-spinner loading-md'>Loading...</div>;
    }
    return children(referenceGenome.data);
}
