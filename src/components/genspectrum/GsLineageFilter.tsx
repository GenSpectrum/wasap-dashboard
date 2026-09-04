import { gsEventNames, type LapisFilter } from 'wasap-components/util';
import { useEffect, useRef } from 'react';
import { GsLineageFilter as LineageFilter } from 'wasap-components/gsComponents/gs-lineage-filter';

export function GsLineageFilter<Lineage extends string>({
    lapisField,
    value,
    lapisFilter,
    placeholderText,
    width,
    onLineageChange = () => {},
    onLineageMultiChange = () => {},
    hideCounts,
    multiSelect,
}: {
    lapisField: Lineage;
    value?: string | string[];
    lapisFilter: LapisFilter;
    placeholderText?: string;
    width?: string;
    onLineageChange?: (lineage: { [key in Lineage]: string | undefined }) => void;
    onLineageMultiChange?: (lineage: { [key in Lineage]: string[] | undefined }) => void;
    hideCounts?: true;
    multiSelect?: true;
}) {
    const lineageFilterRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const currentLineageFilterRef = lineageFilterRef.current;
        if (!currentLineageFilterRef) {
            return;
        }

        const handleLineageChange = (event: CustomEvent) => {
            onLineageChange(event.detail);
        };

        currentLineageFilterRef.addEventListener(gsEventNames.lineageFilterChanged, handleLineageChange);

        return () => {
            currentLineageFilterRef.removeEventListener(gsEventNames.lineageFilterChanged, handleLineageChange);
        };
    }, [onLineageChange]);

    useEffect(() => {
        const currentLineageFilterRef = lineageFilterRef.current;
        if (!currentLineageFilterRef) {
            return;
        }

        const handleLineageMultiChange = (event: CustomEvent) => {
            onLineageMultiChange(event.detail);
        };

        currentLineageFilterRef.addEventListener(gsEventNames.lineageFilterMultiChanged, handleLineageMultiChange);

        return () => {
            currentLineageFilterRef.removeEventListener(
                gsEventNames.lineageFilterMultiChanged,
                handleLineageMultiChange,
            );
        };
    }, [onLineageMultiChange]);

    // See GsTextFilter.tsx for why listening on a wrapping div still catches the same event.
    return (
        <div ref={lineageFilterRef}>
            <LineageFilter
                lapisField={lapisField}
                placeholderText={placeholderText}
                value={value ?? (multiSelect ? [] : '')}
                width={width}
                lapisFilter={lapisFilter}
                hideCounts={hideCounts}
                multiSelect={multiSelect}
            />
        </div>
    );
}
