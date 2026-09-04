import type { DateRangeOption, NumberRange } from 'wasap-components/util';

import type { LapisLineageQuery, LapisMutationQuery } from './helpers';
import type { LapisLocation } from './pageStateHandlers/locationFilterFromToUrl';

export type DatasetFilter = {
    locationFilters: LocationFilterState;
    textFilters: TextFilterState;
    dateFilters: DateFilterState;
    numberFilters: NumberFilterState;
    advancedQuery?: string;
};

export type LocationFilterState = {
    [key: string]: LapisLocation | undefined;
};

export type DateFilterState = {
    [key: string]: DateRangeOption | null | undefined;
};

export type TextFilterState = {
    [key: string]: string | undefined;
};

export type NumberFilterState = {
    [key: string]: NumberRange | undefined;
};

export type Dataset = {
    datasetFilter: DatasetFilter;
};

export type VariantFilter = {
    mutations?: LapisMutationQuery;
    lineages?: LapisLineageQuery;
    variantQuery?: string;
    advancedQuery?: string;
};

export const pathoplexusGroupNameField = 'groupName';

export const PATHOPLEXUS_MAIN_FILTER_DATE_COLUMN = 'sampleCollectionDateRangeLower';
export const GENSPECTRUM_LOCULUS_MAIN_FILTER_DATE_COLUMN = 'sampleCollectionDateRangeLower';
