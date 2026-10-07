import { type FC } from 'react';

import { InfoHeadline1, InfoParagraph } from './info';
import { Modal } from './modal';
import { RhydbError } from '../../dataLayer/transport/query';
import { LapisError, UnknownLapisError } from '../../externalData/lapisApi/lapisApi';

export class UserFacingError extends Error {
    constructor(
        public readonly headline: string,
        message: string,
    ) {
        super(message);
        this.name = 'UserFacingError';
    }
}

export type ErrorDisplayProps = {
    error: Error;
    resetError?: () => void;
    layout?: 'horizontal' | 'vertical';
};

export const ErrorDisplay: FC<ErrorDisplayProps> = ({ error, resetError, layout }) => {
    // eslint-disable-next-line no-console -- Currently we use the following statement for our error handling
    console.error(error);

    const { headline, details } = getDisplayedErrorMessage(error);

    return (
        <div
            className={`flex h-full w-full items-center justify-center border border-stone-300 bg-white p-2 ${layout === 'horizontal' ? 'flex-row' : 'flex-col'}`}
        >
            <div>
                <div className='font-bold text-red-700'>{headline}</div>
                <div>
                    Oops! Something went wrong.
                    {details !== undefined && (
                        <>
                            {' '}
                            <Modal
                                buttonClassName='underline hover:text-gray-400'
                                modalContent={
                                    <>
                                        <InfoHeadline1>{details.headline}</InfoHeadline1>
                                        <InfoParagraph>{details.message}</InfoParagraph>
                                    </>
                                }
                            >
                                Show details.
                            </Modal>
                        </>
                    )}
                </div>
            </div>
            {resetError !== undefined && (
                <button onClick={resetError} className='btn btn-sm m-4 flex items-center'>
                    <span className='iconify mdi--reload text-lg' />
                    Try again
                </button>
            )}
        </div>
    );
};

function getDisplayedErrorMessage(error: Error) {
    if (error instanceof UserFacingError) {
        return {
            headline: `Error - ${error.headline}`,
            details: {
                headline: error.headline,
                message: error.message,
            },
        };
    }

    if (error instanceof LapisError) {
        return {
            headline: `Error - Failed fetching ${error.requestedData} from LAPIS`,
            details: {
                headline: `LAPIS request failed: ${error.requestedData} - ${error.problemDetail.status} ${error.problemDetail.title}`,
                message: error.problemDetail.detail ?? error.message,
            },
        };
    }

    if (error instanceof UnknownLapisError) {
        return {
            headline: `Error - Failed fetching ${error.requestedData} from LAPIS`,
            details: {
                headline: `LAPIS request failed: An unexpected error occurred while fetching ${error.requestedData}`,
                message: error.message,
            },
        };
    }

    if (error instanceof RhydbError) {
        return {
            headline: 'Error - Failed fetching data from RhyDB',
            details: {
                headline: `RhyDB request failed (${error.kind})`,
                message: error.userMessage,
            },
        };
    }

    return { headline: 'Error', details: undefined };
}
