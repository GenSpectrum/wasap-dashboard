import { BackendError, UnknownBackendError } from './externalData/genSpectrum/apiService';

type LogLevel = 'error' | 'warn' | 'info' | 'debug';

type InstanceLogger = {
    [level in LogLevel]: (message: string) => void;
};

/**
 * Logs to the browser console: the app has no server of its own to send logs to.
 */
export const getClientLogger = (instance: string): InstanceLogger => {
    const log = (level: LogLevel, message: string): void => {
        // `console.log` fallback is defensive against an unusual console (e.g. a
        // polyfill) missing one of the levels; TS can't see that risk since
        // `console[level]` is statically known to exist for every current level.
        // This logger's whole job is the console.
        // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition, no-console
        (console[level] ?? console.log)(`[${instance}]`, message);
    };

    return {
        error: (message) => log('error', message),
        warn: (message) => log('warn', message),
        info: (message) => log('info', message),
        debug: (message) => log('debug', message),
    };
};

export function getErrorLogMessage(error: unknown): string {
    if (error instanceof BackendError) {
        return `BackendError: ${error.problemDetail.status} ${error.problemDetail.instance} [RequestId: ${error.requestId}] - ${error.problemDetail.detail}`;
    }

    if (error instanceof UnknownBackendError) {
        return `UnknownBackendError: ${error.status}`;
    }

    if (error instanceof Error) {
        const message = error.toString();
        if (error.cause instanceof Error) {
            return `${message} - cause: ${getErrorLogMessage(error.cause)}`;
        }
        return message;
    }

    if (typeof error === 'string') {
        return error;
    }

    return `Unknown error of type ${typeof error} (${error})`;
}
