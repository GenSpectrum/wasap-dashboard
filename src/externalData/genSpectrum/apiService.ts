import { type ZodSchema } from 'zod';

import { getAppConfig } from '../../config/appConfig';
import { type ProblemDetail, problemDetailSchema } from '../../types/ProblemDetail';

const X_REQUEST_ID_HEADER = 'x-request-id';

type EndpointParameters<Response> = {
    /** The path below the base URL, like `/collections/7`. */
    url: string;
    /** The query parameters; an array becomes the same parameter repeated. */
    requestParams?: Record<string, string | string[] | boolean | undefined>;
    schema: ZodSchema<Response>;
    signal?: AbortSignal;
};

export class ApiService {
    constructor(private readonly baseUrl: string) {}

    public async get<Response>({
        url,
        requestParams,
        schema,
        signal,
    }: EndpointParameters<Response>): Promise<Response> {
        let response: globalThis.Response;
        try {
            response = await fetch(this.urlOf(url, requestParams), { signal });
        } catch (error) {
            if (signal?.aborted === true) {
                throw error;
            }
            throw new BackendNotAvailable(this.baseUrl, { cause: error });
        }
        if (!response.ok) {
            throw await responseError(response, url);
        }
        return schema.parse(await response.json());
    }

    private urlOf(path: string, requestParams: EndpointParameters<unknown>['requestParams']) {
        const search = new URLSearchParams();
        for (const [key, value] of Object.entries(requestParams ?? {})) {
            for (const item of [value].flat()) {
                if (item !== undefined) {
                    search.append(key, String(item));
                }
            }
        }
        const query = search.size > 0 ? `?${search}` : '';
        return `${this.baseUrl.replace(/\/+$/, '')}/${path.replace(/^\/+/, '')}${query}`;
    }
}

async function responseError(response: globalThis.Response, url: string) {
    const text = await response.text();
    let json: unknown;
    try {
        json = JSON.parse(text);
    } catch {
        json = undefined;
    }
    const backendError = problemDetailSchema.safeParse(json);
    if (backendError.success) {
        return new BackendError(
            backendError.data.detail ?? '(no detail)',
            response.status,
            backendError.data,
            url,
            response.headers.get(X_REQUEST_ID_HEADER) ?? undefined,
        );
    }
    return new UnknownBackendError(`${response.status} ${response.statusText}`.trim(), response.status, url);
}

export class BackendError extends Error {
    constructor(
        message: string,
        public readonly status: number,
        public readonly problemDetail: ProblemDetail,
        public readonly requestedData: string,
        public readonly requestId: string | undefined,
    ) {
        super(message);
        this.name = 'BackendError';
    }
}

export class UnknownBackendError extends Error {
    constructor(
        message: string,
        public readonly status: number,
        public readonly requestedData: string,
    ) {
        super(message);
        this.name = 'UnknownBackendError';
    }
}

export class BackendNotAvailable extends Error {
    constructor(url: string, options?: ErrorOptions) {
        super(`Backend not available under ${url}`, options);
        this.name = 'BackendNotAvailable';
    }
}

let apiServiceForClientside: ApiService | null = null;

export function getApiServiceForClientside(): ApiService {
    // Standalone: the collections backend URL comes from `config.json`
    // (`getAppConfig().collectionsBackendUrl`) rather than a same-origin
    // `/api` proxy as in the dashboards deployment.
    apiServiceForClientside = apiServiceForClientside ?? new ApiService(getAppConfig().collectionsBackendUrl);
    return apiServiceForClientside;
}
