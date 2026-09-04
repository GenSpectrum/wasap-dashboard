import { getAppConfig } from '../config/appConfig';

export const dbIdSpaces = {
    prod: 'prod',
    staging: 'staging',
    local: 'local',
} as const;

export type DbIdSpace = (typeof dbIdSpaces)[keyof typeof dbIdSpaces];

export function getDbIdSpace(): DbIdSpace {
    // Standalone: sourced from `config.json` at startup rather than from the
    // dashboards repo's DB_ID_SPACE / DASHBOARDS_ENVIRONMENT env vars.
    return getAppConfig().dbIdSpace;
}
