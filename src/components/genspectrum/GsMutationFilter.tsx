import { type MutationType, gsEventNames } from 'wasap-components/util';
import { useEffect, useRef } from 'react';
import { GsMutationFilter as MutationFilterComponent } from './gs-mutation-filter';

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

    // This was a <label> wrapping the whole thing, unlabeled by a `for`/`id` pair. Behind a
    // shadow-DOM custom element that was inert — a <label> only implicitly associates with a
    // control that's its light-DOM descendant, and the shadow boundary excluded the combobox
    // inside from that. Without shadow DOM, the wrap silently became a real (and wrong) implicit
    // label on the combobox, which is why it — not the "Mutations" text — picked up "Mutations" as
    // its accessible name, and other pages' controls started colliding with it in
    // accessible-name-based test/a11y-tooling queries. A plain <div> (same daisyUI classes, purely
    // visual) restores "not actually a label" instead of "accidentally the wrong one".
    //
    // See GsTextFilter.tsx for why listening on a wrapping div still catches the same event.
    return (
        <div className='form-control'>
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
        </div>
    );
}
