import axios, { type AxiosInstance, type AxiosRequestConfig, type AxiosResponse } from 'axios';
import { type ZodSchema } from 'zod';

import { UserFacingError } from '../../components/ErrorReportInstruction';
import { getAppConfig } from '../../config/appConfig';
import { type ProblemDetail, problemDetailSchema } from '../../types/ProblemDetail';

const X_REQUEST_ID_HEADER = 'x-request-id';

type EndpointParameters<Response> = {
    url: string;
    requestParams?: Record<string, string | string[] | boolean | undefined>;
    schema: ZodSchema<Response>;
};

type EndpointParametersWithBody<Request, Response> = EndpointParameters<Response> & { data: Request };

export class ApiService {
    private readonly axiosInstance: AxiosInstance;

    constructor(baseURL: string) {
        this.axiosInstance = axios.create({ baseURL, paramsSerializer: { indexes: null } });
    }

    public async get<Response>({ url, requestParams, schema }: EndpointParameters<Response>): Promise<Response> {
        return this.handleRequest({ url, method: 'get', params: requestParams }, schema);
    }

    public async post<Request, Response>({
        url,
        data,
        requestParams,
        schema,
    }: EndpointParametersWithBody<Request, Response>): Promise<Response> {
        return this.handleRequest({ url, method: 'post', params: requestParams, data }, schema);
    }

    public async put<Request, Response>({
        url,
        data,
        requestParams,
        schema,
    }: EndpointParametersWithBody<Request, Response>): Promise<Response> {
        return this.handleRequest({ url, method: 'put', params: requestParams, data }, schema);
    }

    public async delete<Response>({ url, requestParams, schema }: EndpointParameters<Response>): Promise<Response> {
        return this.handleRequest({ url, method: 'delete', params: requestParams }, schema);
    }

    private async handleRequest<Request, Response>(request: AxiosRequestConfig<Request>, schema: ZodSchema<Response>) {
        try {
            const response = await this.axiosInstance.request(request);
            return schema.parse(response.data);
        } catch (error) {
            if (axios.isAxiosError(error)) {
                if (error.response) {
                    this.handleErrors(error.response);
                }

                if (error.code === axiosNotFoundError) {
                    throw new BackendNotAvailable(error.config?.baseURL ?? '');
                }
            }
            throw error;
        }
    }

    private handleErrors(response: AxiosResponse) {
        if (response.status >= 300 || response.status < 200) {
            const backendError = problemDetailSchema.safeParse(response.data);
            if (backendError.success) {
                throw new BackendError(
                    backendError.data.detail ?? '(no detail)',
                    response.status,
                    backendError.data,
                    response.config.url ?? '',
                    response.headers[X_REQUEST_ID_HEADER],
                );
            }

            throw new UnknownBackendError(response.statusText, response.status, response.config.url ?? '');
        }
    }
}

const axiosNotFoundError = 'ENOTFOUND';

export class BackendError extends UserFacingError {
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

export class BackendNotAvailable extends UserFacingError {
    constructor(url: string) {
        super(`Backend not available under ${url}`);
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
