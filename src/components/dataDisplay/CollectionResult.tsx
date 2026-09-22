import { CollectionInfo } from './CollectionInfo';
import { NothingSelected } from './NothingSelected';
import { QueriesOverTime } from './queriesOverTime/queries-over-time';
import { type SiloReadFilter } from '../../dataLayer/queries';
import { type WasapBaseFilter } from '../../pageState/wasap/wasapAnalysisFilter';
import { type WasapPageData } from '../views/wasap/useWasapPageData';

/**
 * The queries of a collection over time, and what there is to know about the collection.
 */
export function CollectionResult({
    page,
    data,
    sourceLabel,
    getCollectionUrl,
}: {
    page: {
        base: WasapBaseFilter;
        filter: SiloReadFilter;
        meanProportionInterval: { min: number; max: number };
    };
    data: WasapPageData;
    /** Where the collection comes from, like "GenSpectrum collection". */
    sourceLabel: string;
    /** The link to the collection on its own site. */
    getCollectionUrl: (collectionId: number) => string;
}) {
    if (data.type !== 'collection') {
        throw Error(`Expected a collection, but the data is of type '${data.type}'.`);
    }

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
                width='100%'
                filter={page.filter}
                queries={data.collection.queries}
                granularity={page.base.granularity}
                hideGaps={page.base.excludeEmpty ? true : undefined}
                pageSizes={[20, 50, 100, 250]}
                meanProportionInterval={page.meanProportionInterval}
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
