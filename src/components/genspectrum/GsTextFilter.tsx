import { gsEventNames, type LapisFilter } from 'wasap-components/util';
import { useEffect, useRef } from 'react';
import { GsTextFilter as TextFilter } from 'wasap-components/gsComponents/gs-text-filter';

export function GsTextFilter<LapisField extends string>({
    lapisField,
    placeholderText,
    lapisFilter,
    width,
    onInputChange = () => {},
    value,
    hideCounts,
}: {
    lapisField: LapisField;
    placeholderText?: string;
    lapisFilter: LapisFilter;
    width?: string;
    onInputChange?: (input: { [key in LapisField]: string | undefined }) => void;
    value?: string | undefined;
    hideCounts?: true;
}) {
    const textInputRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const currentInputRef = textInputRef.current;
        if (!currentInputRef) {
            return;
        }

        const handleTextInputChange = (event: CustomEvent) => {
            onInputChange(event.detail);
        };
        currentInputRef.addEventListener(gsEventNames.textFilterChanged, handleTextInputChange);

        return () => {
            currentInputRef.removeEventListener(gsEventNames.textFilterChanged, handleTextInputChange);
        };
    }, [onInputChange]);

    // TextFilter dispatches its change event as a bubbling DOM CustomEvent (unchanged from the
    // Lit component it replaced — see wasap-components/VENDOR.md), so listening on a wrapping div
    // still works the same way listening on the old <gs-text-filter> custom element itself did.
    return (
        <div ref={textInputRef}>
            <TextFilter
                lapisField={lapisField}
                placeholderText={placeholderText}
                lapisFilter={lapisFilter}
                width={width}
                value={value ?? ''}
                hideCounts={hideCounts}
            />
        </div>
    );
}
