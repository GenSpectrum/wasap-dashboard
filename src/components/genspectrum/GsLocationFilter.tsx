import { gsEventNames, type LapisFilter } from 'wasap-components/util';
import { useEffect, useRef } from 'react';
import { GsLocationFilter as LocationFilter } from 'wasap-components/gsComponents/gs-location-filter';

import type { LapisLocation } from '../../views/pageStateHandlers/locationFilterFromToUrl.ts';

export function GsLocationFilter<Field extends string>({
    onLocationChange = () => {},
    fields,
    placeholderText,
    lapisFilter,
    width,
    value,
    hideCounts,
}: {
    width?: string;
    placeholderText?: string;
    lapisFilter: LapisFilter;
    fields: Field[];
    onLocationChange?: (location: { [key in Field]: string | undefined }) => void;
    value?: LapisLocation;
    hideCounts?: true;
}) {
    const locationFilterRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const currentLocationFilterRef = locationFilterRef.current;
        if (!currentLocationFilterRef) {
            return;
        }
        const handleLocationChange = (event: CustomEvent) => {
            onLocationChange(event.detail);
        };

        currentLocationFilterRef.addEventListener(gsEventNames.locationChanged, handleLocationChange);

        return () => {
            currentLocationFilterRef.removeEventListener(gsEventNames.locationChanged, handleLocationChange);
        };
    }, [onLocationChange]);

    // See GsTextFilter.tsx for why listening on a wrapping div still catches the same event.
    return (
        <div ref={locationFilterRef}>
            <LocationFilter
                fields={fields}
                placeholderText={placeholderText}
                lapisFilter={lapisFilter}
                width={width}
                value={value}
                hideCounts={hideCounts}
            />
        </div>
    );
}
