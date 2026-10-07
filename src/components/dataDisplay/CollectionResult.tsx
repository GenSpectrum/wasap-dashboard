import { CollectionInfo } from './CollectionInfo';
import { NothingSelected } from './NothingSelected';
import { type ProportionInterval } from './mutationsOverTime/getFilteredMutationCodes';
import { QueriesOverTime } from './queriesOverTime/queries-over-time';
import { type SiloReadFilter } from '../../dataLayer/queries';
import { type CollectionQueries } from '../../externalData/useCollectionQueries';
import { type TemporalGranularity } from '../../types/dashboardComponents';

/**
 * The queries of a collection over time, and what there is to know about the collection.
 */
export function CollectionResult({
    data,
    filter,
    granularity,
    meanProportionInterval,
    sourceLabel,
    getCollectionUrl,
}: {
    data: CollectionQueries;
    filter: SiloReadFilter;
    granularity: TemporalGranularity;
    meanProportionInterval: ProportionInterval;
    /** Where the collection comes from, like "GenSpectrum collection". */
    sourceLabel: string;
    /** The link to the collection on its own site. */
    getCollectionUrl: (collectionId: number) => string;
}) {
    if (data.collection.queries.length === 0) {
        return (
            <NothingSelected title='No valid variants'>
                This collection has no valid variants to display. Check the collection configuration for errors.
            </NothingSelected>
        );
    }

    return (
        <>
            <QueriesOverTime
                filter={filter}
                queries={data.collection.queries}
                granularity={granularity}
                pageSizes={[20, 50, 100, 250]}
                meanProportionInterval={meanProportionInterval}
            />
            <CollectionInfo
                collectionId={data.collection.id}
                collectionTitle={data.collection.title}
                sourceLabel={sourceLabel}
                collectionUrl={getCollectionUrl(data.collection.id)}
                invalidVariants={data.invalidVariants}
            />
        </>
    );
}
