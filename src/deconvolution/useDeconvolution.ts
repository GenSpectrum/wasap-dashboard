import { skipToken, useQuery } from '@tanstack/react-query';

import {
    fetchDeconvolution,
    fetchLollipopVersion,
    type DeconvolutionInput,
    type DeconvolutionResult,
} from './lollipopService';
import { getAppConfig } from '../config/appConfig';

export type DeconvolutionState =
    | { status: 'idle' }
    | { status: 'running' }
    | { status: 'done'; result: DeconvolutionResult }
    | { status: 'error'; error: string };

/**
 * The deconvolution of the input, computed by the LolliPop service. A new input cancels the request
 * for the previous one.
 */
export function useDeconvolution(input: DeconvolutionInput | undefined): DeconvolutionState {
    const serviceUrl = getAppConfig().lollipopServiceUrl;
    const query = useQuery({
        queryKey: ['deconvolution', serviceUrl, input],
        queryFn:
            input === undefined || serviceUrl === undefined
                ? skipToken
                : ({ signal }) => fetchDeconvolution(serviceUrl, input, signal),
        staleTime: Infinity,
        // A request takes up to a minute, and the service caches what it computed.
        retry: false,
    });

    if (input === undefined) {
        return { status: 'idle' };
    }
    if (query.error) {
        return { status: 'error', error: query.error.message };
    }
    return query.data === undefined ? { status: 'running' } : { status: 'done', result: query.data };
}

/** The version of LolliPop the service runs, once it is known. */
export function useLollipopVersion(): string | undefined {
    const serviceUrl = getAppConfig().lollipopServiceUrl;
    return useQuery({
        queryKey: ['lollipopVersion', serviceUrl],
        queryFn: serviceUrl === undefined ? skipToken : () => fetchLollipopVersion(serviceUrl),
        staleTime: Infinity,
    }).data;
}
