import type { FC, PropsWithChildren } from 'react';

import { AccessionsDownloadButton, type DownloadLink } from './AccessionsDownloadButton';
import { LastUpdatedInfo } from './LastUpdatedInfo';
import { withQueryProvider } from '../../backendApi/withQueryProvider';
import { LapisUnreachableWrapperClient } from '../../components/LapisUnreachableWrapperClient';
import type { DataOrigin } from '../../types/dataOrigins';
import { type BreadcrumbElement, Breadcrumbs } from '../Breadcrumbs';
import { DataInfo } from '../base/footer/DataInfo';

export type DataPageLayoutProps = PropsWithChildren<{
    breadcrumbs: BreadcrumbElement[];
    dataOrigins: DataOrigin[];
    lapisUrl: string;
    downloadLinks?: DownloadLink[];
    accessionDownloadFields?: string[];
}>;

export const DataPageLayoutInner: FC<DataPageLayoutProps> = ({
    breadcrumbs,
    dataOrigins,
    lapisUrl,
    downloadLinks = [],
    accessionDownloadFields = [],
    children,
}) => {
    return (
        <div className='flex h-full flex-col'>
            <div className='ml-2'>
                <Breadcrumbs breadcrumbs={breadcrumbs} />
            </div>
            <div className='grow'>
                <LapisUnreachableWrapperClient lapisUrl={lapisUrl}>{children}</LapisUnreachableWrapperClient>
            </div>
            <div className='mt-2 flex flex-col items-center justify-center border-t border-gray-200 sm:flex-row sm:gap-4'>
                {downloadLinks.length > 0 && (
                    <AccessionsDownloadButton
                        accessionDownloadFields={accessionDownloadFields}
                        downloadLinks={downloadLinks}
                        lapisUrl={lapisUrl}
                    />
                )}
                <LastUpdatedInfo lapisUrl={lapisUrl} />
                <DataInfo dataOrigins={dataOrigins} />
            </div>
        </div>
    );
};

export const DataPageLayout = withQueryProvider(DataPageLayoutInner);
