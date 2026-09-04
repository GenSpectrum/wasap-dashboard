import { type MutationType, gsEventNames } from 'wasap-components/util';
import { useEffect, useRef } from 'react';
import { GsMutationFilter as MutationFilterComponent } from 'wasap-components/gsComponents/gs-mutation-filter';

export type MutationFilter = {
    nucleotideMutations: string[];
    aminoAcidMutations: string[];
    nucleotideInsertions: string[];
    aminoAcidInsertions: string[];
};

export function GsMutationFilter({
    initialValue,
    width,
    enabledMutationTypes,
    onMutationChange,
}: {
    width?: string;
    initialValue?: MutationFilter | string[] | undefined;
    enabledMutationTypes?: MutationType[];
    onMutationChange: (mutationFilter: MutationFilter | undefined) => void;
}) {
    const mutationFilterRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const currentMutationFilterRef = mutationFilterRef.current;
        if (!currentMutationFilterRef) {
            return;
        }

        const handleMutationFilterChange = (event: CustomEvent) => {
            onMutationChange(event.detail);
        };
        currentMutationFilterRef.addEventListener(gsEventNames.mutationFilterChanged, handleMutationFilterChange);

        return () => {
            currentMutationFilterRef.removeEventListener(
                gsEventNames.mutationFilterChanged,
                handleMutationFilterChange,
            );
        };
    }, [onMutationChange]);

    // See GsTextFilter.tsx for why listening on a wrapping div still catches the same event.
    return (
        <label className='form-control'>
            <div className='label'>
                <span className='label-text'>Mutations</span>
            </div>
            <div ref={mutationFilterRef}>
                <MutationFilterComponent
                    width={width}
                    initialValue={initialValue ?? []}
                    enabledMutationTypes={enabledMutationTypes}
                />
            </div>
        </label>
    );
}
