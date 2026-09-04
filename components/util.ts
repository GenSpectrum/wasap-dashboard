// The public surface `src/` imports from `components/`, replacing
// `@genspectrum/dashboard-components/util`. Unlike the published package's `utilEntrypoint.ts`
// (which re-exports from every component in the library, including ones the wasap dashboards
// never render), this only re-exports what `src/` actually uses — re-exporting the real
// entrypoint verbatim would have pulled the whole unvendored library back in as a type
// dependency. Grew from grepping every `@genspectrum/dashboard-components/util` import in `src/`;
// keep it in sync with that when adding a new one.

import { views } from './types';

export {
    type LapisFilter,
    type SequenceType,
    type TemporalGranularity,
    type MutationType,
    mutationType,
    views,
} from './types';

export type { DateRangeOption } from './react/dateRangeFilter/dateRangeOption';
export { DateRangeOptionChangedEvent } from './react/dateRangeFilter/dateRangeOption';

export type { LapisNumberFilter, NumberRange } from './react/numberRangeFilter/NumberRangeFilterChangedEvent';
export {
    NumberRangeFilterChangedEvent,
    NumberRangeValueChangedEvent,
} from './react/numberRangeFilter/NumberRangeFilterChangedEvent';

export { gsEventNames } from './utils/gsEventNames';

export type { MutationAnnotation, MutationAnnotations } from './gsComponents/mutation-annotations-context';

export type { MeanProportionInterval } from './react/mutationsOverTime/mutations-over-time';
export type { CountCoverageQuery } from './react/queriesOverTime/queries-over-time';
export type { CustomColumn } from './react/components/features-over-time-grid';

// Not vendored (the wasap dashboards don't render `gs-aggregate`) — `views.table | views.bar` is
// its exact upstream definition (preact/aggregatedData/aggregate.tsx), reproduced here since only
// the type, not the component, is needed (by src/views/OrganismConstants.ts).
export type AggregateView = (typeof views)['table'] | (typeof views)['bar'];
