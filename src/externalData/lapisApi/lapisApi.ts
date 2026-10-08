import { type z } from 'zod';

import { lineageDefinitionResponseSchema } from './LineageDefinition';
import { referenceGenomeResponse } from './ReferenceGenome';
import { aggregatedResponse, type LapisBaseRequest, lapisError, problemDetail, type ProblemDetail } from './lapisTypes';

export class UnknownLapisError extends Error {
    constructor(
        message: string,
        public readonly status: number,
        public readonly requestedData: string,
    ) {
        super(message);
        this.name = 'UnknownLapisError';
    }
}

export class LapisError extends Error {
    constructor(
        message: string,
        public readonly status: number,
        public readonly problemDetail: ProblemDetail,
        public readonly requestedData: string,
    ) {
        super(message);
        this.name = 'LapisError';
    }
}

export async function fetchAggregated(lapisUrl: string, body: LapisBaseRequest, signal?: AbortSignal) {
    return lapisPost(lapisUrl, '/sample/aggregated', body, aggregatedResponse, 'aggregated data', signal);
}

/**
 * POSTs `body` as JSON to `path` of the LAPIS at `lapisUrl` and parses the answer with `schema`.
 * Throws a `LapisError` or `UnknownLapisError` if the request fails.
 */
export async function lapisPost<T>(
    lapisUrl: string,
    path: string,
    body: unknown,
    schema: z.ZodType<T>,
    requestedData: string,
    signal?: AbortSignal,
): Promise<T> {
    const response = await callLapis(
        `${lapisUrl.replace(/\/$/, '')}${path}`,
        {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(body),
            signal,
        },
        requestedData,
    );

    const parsed = schema.safeParse(await response.json());
    if (!parsed.success) {
        throw new UnknownLapisError(
            `Unexpected response from ${response.url}: ${parsed.error.message}`,
            response.status,
            requestedData,
        );
    }
    return parsed.data;
}

export async function fetchReferenceGenome(lapisUrl: string, signal?: AbortSignal) {
    const response = await callLapis(
        referenceGenomeEndpoint(lapisUrl),
        {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
            },
            signal,
        },
        'the reference genomes',
    );

    return referenceGenomeResponse.parse(await response.json());
}

export async function fetchLineageDefinition({
    lapisUrl,
    lapisField,
    signal,
}: {
    lapisUrl: string;
    lapisField: string;
    signal?: AbortSignal;
}) {
    const response = await callLapis(
        lineageDefinitionEndpoint(lapisUrl, lapisField),
        {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
            },
            signal,
        },
        `${lapisField} lineage definition`,
    );

    return lineageDefinitionResponseSchema.parse(await response.json());
}

async function callLapis(
    input: Parameters<typeof fetch>[0],
    init: Parameters<typeof fetch>[1],
    requestedDataName: string,
) {
    let response: Response;
    try {
        response = await fetch(input, init);
    } catch (error) {
        // An abort isn't a failure: TanStack Query expects the abort error itself.
        if (init?.signal?.aborted === true) {
            throw error;
        }
        const message = error instanceof Error ? error.message : `${error}`;
        throw new UnknownLapisError(`Failed to connect to LAPIS: ${message}`, 500, requestedDataName);
    }
    // Outside the `try`, so that the errors it throws aren't turned into "Failed to connect".
    await handleErrors(response, requestedDataName);
    return response;
}

const handleErrors = async (response: Response, requestedData: string) => {
    if (!response.ok) {
        if (response.status >= 400 && response.status < 500) {
            const text = await response.text();
            let json: unknown;
            try {
                json = JSON.parse(text);
            } catch {
                throw new UnknownLapisError(`${statusLine(response)}: ${text}`, response.status, requestedData);
            }

            const lapisErrorResult = lapisError.safeParse(json);
            if (lapisErrorResult.success) {
                throw new LapisError(
                    withDetail(statusLine(response), lapisErrorResult.data.error.detail),
                    response.status,
                    lapisErrorResult.data.error,
                    requestedData,
                );
            }

            const problemDetailResult = problemDetail.safeParse(json);
            if (problemDetailResult.success) {
                throw new LapisError(
                    withDetail(statusLine(response), problemDetailResult.data.detail),
                    response.status,
                    problemDetailResult.data,
                    requestedData,
                );
            }

            throw new UnknownLapisError(
                `${statusLine(response)}: ${JSON.stringify(json)}`,
                response.status,
                requestedData,
            );
        }
        throw new UnknownLapisError(statusLine(response), response.status, requestedData);
    }
};

/** Like `500 Internal Server Error`; the status text is empty over HTTP/2. */
function statusLine(response: Response) {
    return `${response.status} ${response.statusText}`.trim();
}

function withDetail(statusText: string, detail: string | undefined) {
    return detail === undefined ? statusText : `${statusText}: ${detail}`;
}

const referenceGenomeEndpoint = (lapisUrl: string) => `${lapisUrl}/sample/referenceGenome`;
const lineageDefinitionEndpoint = (lapisUrl: string, lapisField: string) =>
    `${lapisUrl}/sample/lineageDefinition/${lapisField}`;
