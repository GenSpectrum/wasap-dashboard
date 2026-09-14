import { type logLevels, type AdditionalLogContext, type InstanceLogger } from './types/logMessage';

/**
 * Console-backed logger with the same interface as the dashboards repo's
 * `clientLogger` (which POSTed to the Astro `/api/log` route). A standalone SPA
 * has nowhere to send logs, so they go to the browser console.
 */
export const getClientLogger = (instance: string): InstanceLogger => {
    const log = (level: (typeof logLevels)[number], message: string, context?: AdditionalLogContext): void => {
        const prefix = `[${instance}]`;
        const args = context?.errorId !== undefined ? [prefix, message, context] : [prefix, message];
        // `console.log` fallback is defensive against an unusual console (e.g. a
        // polyfill) missing one of `logLevels`; TS can't see that risk since
        // `console[level]` is statically known to exist for every current level.
        // This logger's whole job is the console.
        // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition, no-console
        (console[level] ?? console.log)(...args);
    };

    return {
        error: (message, context) => log('error', message, context),
        warn: (message, context) => log('warn', message, context),
        info: (message, context) => log('info', message, context),
        debug: (message, context) => log('debug', message, context),
    };
};
