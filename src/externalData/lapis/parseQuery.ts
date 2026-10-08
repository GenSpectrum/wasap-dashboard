import { z } from 'zod';

import { siloFilterExpressionSchema } from '../../dataLayer/queries';
import { lapisPost } from '../lapisApi/lapisApi';

const parsedQueryResultSuccessSchema = z.object({
    type: z.literal('success'),
    filter: siloFilterExpressionSchema,
});

const parsedQueryResultFailureSchema = z.object({
    type: z.literal('failure'),
    error: z.string(),
});

export const parsedQueryResultSchema = z.discriminatedUnion('type', [
    parsedQueryResultSuccessSchema,
    parsedQueryResultFailureSchema,
]);

export type ParsedQueryResult = z.infer<typeof parsedQueryResultSchema>;

const queryParseResponseSchema = z.object({
    data: z.array(parsedQueryResultSchema),
});

export type ParseQueryRequest = {
    queries: string[];
    doFullValidation?: boolean;
};

/**
 * Parses a list of advanced query strings into SILO filter expressions.
 * Returns partial results: successfully parsed queries will have a "filter" field,
 * while failed queries will have an "error" field with the error message.
 *
 * @param lapisUrl The base API URL
 * @param request
 * @param signal Aborts the request
 * @returns Array of parsed query results (success or failure for each query)
 */
export async function parseQuery(
    lapisUrl: string,
    request: ParseQueryRequest,
    signal?: AbortSignal,
): Promise<ParsedQueryResult[]> {
    const response = await lapisPost(
        lapisUrl,
        '/query/parse',
        request,
        queryParseResponseSchema,
        'the parsed queries',
        signal,
    );
    return response.data;
}
