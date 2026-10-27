export const logLevels = ['error', 'warn', 'info', 'debug'] as const;

export type InstanceLogger = {
    [key in (typeof logLevels)[number]]: (message: string) => void;
};
