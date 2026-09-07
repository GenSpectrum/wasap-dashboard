import { gsEventNames } from 'wasap-components/util';
import { useEffect, useRef } from 'react';
import { GsTextFilter as TextFilter } from 'wasap-components/gsComponents/gs-text-filter';

export function GsTextFilter<Field extends string>({
    field,
    placeholderText,
    width,
    onInputChange = () => {},
    value,
    hideCounts,
}: {
    field: Field;
    placeholderText?: string;
    width?: string;
    onInputChange?: (input: { [key in Field]: string | undefined }) => void;
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
    // Lit component it replaced), so listening on a wrapping div still works the same way
    // listening on the old <gs-text-filter> custom element itself did.
    return (
        <div ref={textInputRef}>
            <TextFilter
                field={field}
                placeholderText={placeholderText}
                width={width}
                value={value ?? ''}
                hideCounts={hideCounts}
            />
        </div>
    );
}
