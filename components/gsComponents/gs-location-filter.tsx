import { type FC } from 'react';

import { LocationFilter, type LocationFilterProps } from '../react/locationFilter/location-filter';
import { type LocationChangedEvent } from '../react/locationFilter/LocationChangedEvent';
import { gsEventNames } from '../utils/gsEventNames';

export type GsLocationFilterProps = Omit<LocationFilterProps, 'fields' | 'lapisFilter' | 'width'> & {
    fields?: LocationFilterProps['fields'];
    lapisFilter?: LocationFilterProps['lapisFilter'];
    width?: LocationFilterProps['width'];
};

// Defaults reproduce the old gs-location-filter Lit component's @property field initializers.
export const GsLocationFilter: FC<GsLocationFilterProps> = ({
    fields = [],
    lapisFilter = {},
    width = '100%',
    ...rest
}) => <LocationFilter fields={fields} lapisFilter={lapisFilter} width={width} {...rest} />;

declare global {
    interface HTMLElementEventMap {
        [gsEventNames.locationChanged]: LocationChangedEvent;
    }
}
