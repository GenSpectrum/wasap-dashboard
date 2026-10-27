import { type logLevels, type AdditionalLogContext, type InstanceLogger } from './types/logMessage';

/**
 * Logs to the browser console: the app has no server of its own to send logs to.
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
