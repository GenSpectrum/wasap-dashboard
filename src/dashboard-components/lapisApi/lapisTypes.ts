import z, { type ZodTypeAny } from 'zod';

export const orderByType = z.enum(['ascending', 'descending']);

export const orderBy = z.object({
    field: z.string(),
    type: orderByType,
});

const filterValue = z.union([z.string(), z.number(), z.boolean(), z.null(), z.undefined(), z.array(z.string())]);

export const lapisBaseRequest = z
    .object({
        limit: z.number().optional(),
        offset: z.number().optional(),
        fields: z.array(z.string()).optional(),
        orderBy: z.array(orderBy).optional(),
    })
    .catchall(filterValue);
export type LapisBaseRequest = z.infer<typeof lapisBaseRequest>;

const insertionCount = z.object({
    insertion: z.string(),
    count: z.number(),
    insertedSymbols: z.string(),
    position: z.number(),
    sequenceName: z.union([z.string(), z.null()]),
});
export const insertionsResponse = makeLapisResponse(z.array(insertionCount));

const baseResponseValueSchema = z.union([z.string(), z.number(), z.boolean(), z.null()]);

export const aggregatedItem = z.object({ count: z.number() }).catchall(baseResponseValueSchema);
export const aggregatedResponse = makeLapisResponse(z.array(aggregatedItem));
export type AggregatedItem = z.infer<typeof aggregatedItem>;

export const detailsItem = z.object({}).catchall(baseResponseValueSchema);
export const detailsResponse = makeLapisResponse(z.array(detailsItem));
export type DetailsItem = z.infer<typeof detailsItem>;

function makeLapisResponse<T extends ZodTypeAny>(data: T) {
    return z.object({
        data,
    });
}

export const problemDetail = z.object({
    title: z.string().optional(),
    status: z.number(),
    detail: z.string().optional(),
    type: z.string(),
    instance: z.string().optional(),
});

export type ProblemDetail = z.infer<typeof problemDetail>;

export const lapisError = z.object({
    error: problemDetail,
});
