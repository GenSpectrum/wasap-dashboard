import { type z } from 'zod';

/**
 * How a setting of a page is kept in a URL search param: `parse` reads the param's value, and
 * gives `undefined` for a value that isn't a valid one; `write` gives the param's value.
 * An explicitly empty setting (no variant, no lineages) is written as `''`.
 */
export type UrlParam<T> = {
    parse: (raw: string) => { value: T } | undefined;
    // A method, so that a param can stand for an optional setting whose default isn't `undefined`
    // (like a list that is empty by default): `parse` never gives `undefined` then.
    write(value: T): string;
};

/** The URL params of the settings of a page, by the name of the setting, which is also the param's name. */
export type UrlParams<Settings> = { [Name in keyof Settings]?: UrlParam<Settings[Name]> };

/**
 * The settings in `search`: a setting that's missing from it, or whose value isn't a valid one
 * (from an old or mistyped link), is the default. Settings without a param are always the default.
 */
export function parseUrlParams<Settings extends object>(
    search: URLSearchParams,
    params: UrlParams<Settings>,
    defaults: Settings,
): Settings {
    const settings = { ...defaults };
    for (const name of Object.keys(params) as (keyof Settings & string)[]) {
        const raw = search.get(name);
        const parsed = raw === null ? undefined : params[name]!.parse(raw);
        if (parsed !== undefined) {
            settings[name] = parsed.value;
        }
    }
    return settings;
}

/**
 * Writes the settings into `search`, all but those that are the default: then the URL only has
 * what was chosen, and a link is read the same way by `parseUrlParams`.
 */
export function writeUrlParams<Settings extends object>(
    search: URLSearchParams,
    params: UrlParams<Settings>,
    settings: Settings,
    defaults: Settings,
) {
    for (const name of Object.keys(params) as (keyof Settings & string)[]) {
        const param = params[name]!;
        const value = param.write(settings[name]);
        if (value !== param.write(defaults[name])) {
            search.set(name, value);
        }
    }
}

/** A non-empty string. */
export const stringParam: UrlParam<string> = {
    parse: (raw) => (raw === '' ? undefined : { value: raw }),
    write: (value) => value,
};

/** One of the values of `schema`. */
export function enumParam<T extends string>(schema: z.ZodType<T>): UrlParam<T> {
    return {
        parse: (raw) => {
            const result = schema.safeParse(raw);
            return result.success ? { value: result.data } : undefined;
        },
        write: (value) => value,
    };
}

/** A finite number, in `[min, max]`, and a whole one if `integer`. */
export function numberParam({
    min = -Infinity,
    max = Infinity,
    integer = false,
}: { min?: number; max?: number; integer?: boolean } = {}): UrlParam<number> {
    return {
        parse: (raw) => {
            const value = raw.trim() === '' ? NaN : Number(raw);
            const valid =
                Number.isFinite(value) && value >= min && value <= max && (!integer || Number.isInteger(value));
            return valid ? { value } : undefined;
        },
        write: (value) => String(value),
    };
}

/** `true` or `false`. */
export const booleanParam: UrlParam<boolean> = {
    parse: (raw) => (raw === 'true' ? { value: true } : raw === 'false' ? { value: false } : undefined),
    write: (value) => String(value),
};

/** A list, like `JN.1|BA.2`; `''` is the empty list. */
export const listParam: UrlParam<string[]> = {
    parse: (raw) => ({ value: raw.split('|').filter((item) => item !== '') }),
    write: (value) => value.join('|'),
};

/** `param`, or `undefined` for no value at all, written as `''`. An empty list is `undefined` as well. */
export function optional<T>(param: UrlParam<T>): UrlParam<T | undefined> {
    return {
        parse: (raw) => (raw === '' ? { value: undefined } : param.parse(raw)),
        write: (value) => (value === undefined ? '' : param.write(value)),
    };
}
