import { useEffect, useRef } from 'react';

import { GsLineageFilter as LineageFilter } from './gs-lineage-filter';
import { gsEventNames } from '../../util/gsEventNames';

export function GsLineageFilter<Lineage extends string>({
    field,
    value,
    placeholderText,
    width,
    onLineageChange = () => {},
    onLineageMultiChange = () => {},
    hideCounts,
    multiSelect,
}: {
    field: Lineage;
    value?: string | string[];
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
                field={field}
                placeholderText={placeholderText}
                value={value ?? (multiSelect ? [] : '')}
                width={width}
                hideCounts={hideCounts}
                multiSelect={multiSelect}
            />
        </div>
    );
}
