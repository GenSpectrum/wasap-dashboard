/**
 * The single owner of every HTTP request to RhyDB.
 *
 * Requests stay within the CORS "simple request" rules: `Content-Type:
 * text/plain` and, at most, `Accept`. The instance answers `OPTIONS /query`
 * with 405, so a preflighted request fails.
 */

export type RhydbErrorKind = 'invalid-query' | 'not-ready' | 'too-expensive' | 'http' | 'network';

export class RhydbError extends Error {
    readonly kind: RhydbErrorKind;
    readonly status: number | undefined;

    constructor(kind: RhydbErrorKind, message: string, status?: number) {
        super(message);
        this.name = 'RhydbError';
        this.kind = kind;
        this.status = status;
    }

    get userMessage(): string {
        switch (this.kind) {
            case 'invalid-query':
                return `The query was rejected by RhyDB: ${this.message}`;
            case 'not-ready':
                return 'The RhyDB instance is starting up. Try again in a moment.';
            case 'too-expensive':
                return 'This query is too expensive for the RhyDB instance and timed out. Narrow the selection.';
            case 'http':
                return `RhyDB request failed (HTTP ${this.status}): ${this.message}`;
            case 'network':
                return 'Could not reach the RhyDB instance. Check the instance URL and your connection.';
        }
    }
}

/**
 * The only headers a RhyDB request may carry.
 *
 * Exported so the curl line offered to the user carries the same headers.
 */
export const REQUEST_HEADERS: Readonly<Record<string, string>> = {
    'Content-Type': 'text/plain',
    Accept: 'application/x-ndjson',
};

/** Where a query is sent. */
export function queryEndpoint(instanceUrl: string): string {
    return `${instanceUrl.replace(/\/+$/, '')}/query`;
}

/** The curl command that reproduces a query, with the headers above. */
export function curlFor(instanceUrl: string, queryText: string): string {
    const quote = (value: string) => `'${value.replace(/'/g, "'\\''")}'`;
    return [
        'curl',
        '-X POST',
        quote(queryEndpoint(instanceUrl)),
        ...Object.entries(REQUEST_HEADERS).map(([name, value]) => `-H ${quote(`${name}: ${value}`)}`),
        `--data-binary ${quote(queryText)}`,
    ].join(' \\\n  ');
}

export type QueryResult<Row> = {
    rows: Row[];
    /** Unix timestamp identifying the database snapshot; cache key for results. */
    dataVersion: string | null;
};

/**
 * Sends a query, retrying transient failures, and logs what it cost.
 *
 * Every request leaves exactly one INFO line once it has come back — a failed
 * or abandoned one included — tagged with what asked for it and pasteable
 * into curl:
 *
 * ```
 * [Query][Amplicons] 63 ms default.filter(...).groupBy({n := count()})
 * ```
 *
 * The duration is the wall clock the caller waited, retries included; a retry
 * says so on a line of its own. Time spent queued behind other requests is
 * reported separately — `512 ms (449 ms queued)` — so that what remains is
 * comparable with what the instance itself takes.
 */
export async function query<Row = Record<string, unknown>>(
    instanceUrl: string,
    queryText: string,
    /** What needs the answer, as the user sees that part of the page named. */
    label: string,
    signal?: AbortSignal,
    /** How long this request spent waiting behind others before it was sent. */
    queuedMilliseconds = 0,
): Promise<QueryResult<Row>> {
    const started = now();

    for (let attempt = 1; ; attempt++) {
        try {
            const result = await send<Row>(instanceUrl, queryText, signal);
            // This logger's whole job is the console (query timing/outcome, for devtools).
            // eslint-disable-next-line no-console
            console.info(`[Query][${label}] ${took(started, queuedMilliseconds)}`, queryText);
            return result;
        } catch (error) {
            const delay = RETRY_DELAYS_MS[attempt - 1];
            // `noUncheckedIndexedAccess` is deliberately off for now (see tsconfig.json), so
            // TS doesn't see that indexing past RETRY_DELAYS_MS's end yields undefined — it does.
            // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
            if (delay === undefined || !isTransient(error) || signal?.aborted === true) {
                // eslint-disable-next-line no-console -- this logger's whole job is the console
                console.info(
                    `[Query][${label}] ${outcome(error)} after ${took(started, queuedMilliseconds)}`,
                    queryText,
                );
                throw error;
            }
            // eslint-disable-next-line no-console -- this logger's whole job is the console
            console.info(`[Query][${label}] retrying after ${(error as RhydbError).kind}`);
            await wait(delay, signal);
        }
    }
}

/**
 * The clock the durations are read off.
 *
 * Monotonic, so a query is not reported as having taken a negative time
 * because the system clock moved under it.
 */
function now(): number {
    return typeof performance === 'undefined' ? Date.now() : performance.now();
}

function took(started: number, queuedMilliseconds: number): string {
    const total = Math.round(now() - started + queuedMilliseconds).toLocaleString('en-US');
    const queued = Math.round(queuedMilliseconds);
    return queued < 1 ? `${total} ms` : `${total} ms (${queued.toLocaleString('en-US')} ms queued)`;
}

/** Why a request stopped: it was abandoned, or the instance said no. */
function outcome(error: unknown): string {
    if (error instanceof DOMException && error.name === 'AbortError') {
        return 'abandoned';
    }
    return error instanceof RhydbError ? `failed (${error.kind})` : 'failed';
}

/**
 * How long to wait before each retry, and so how many there are.
 *
 * The instance closes its HTTP/2 connection periodically, sending GOAWAY. A
 * browser cannot replay a POST that was already sent when that arrives, so it
 * surfaces as a failed fetch — unpredictably, on any one request of a large
 * sweep.
 */
const RETRY_DELAYS_MS = [150, 500];

/**
 * Whether a failure might not happen again. A rejected query and one too
 * expensive to answer will fail identically however often they are sent, and
 * retrying a timeout only doubles the load that caused it.
 */
function isTransient(error: unknown): boolean {
    return error instanceof RhydbError && (error.kind === 'network' || error.kind === 'not-ready');
}

function wait(milliseconds: number, signal?: AbortSignal): Promise<void> {
    return new Promise((resolve, reject) => {
        const timer = setTimeout(() => {
            signal?.removeEventListener('abort', abort);
            resolve();
        }, milliseconds);
        function abort() {
            clearTimeout(timer);
            reject(new DOMException('Aborted', 'AbortError'));
        }
        signal?.addEventListener('abort', abort, { once: true });
    });
}

async function send<Row>(instanceUrl: string, queryText: string, signal?: AbortSignal): Promise<QueryResult<Row>> {
    let response: Response;
    try {
        response = await fetch(queryEndpoint(instanceUrl), {
            method: 'POST',
            headers: REQUEST_HEADERS,
            body: queryText,
            signal: signal ?? null,
        });
    } catch (error) {
        if (error instanceof DOMException && error.name === 'AbortError') {
            throw error;
        }
        throw new RhydbError('network', error instanceof Error ? error.message : String(error));
    }

    if (!response.ok) {
        throw await toError(response);
    }

    const text = await response.text();
    const rows: Row[] = [];
    try {
        for (const line of text.split('\n')) {
            if (line.trim() !== '') {
                rows.push(JSON.parse(line) as Row);
            }
        }
    } catch {
        throw new RhydbError('http', 'The response was not valid NDJSON.', response.status);
    }
    return { rows, dataVersion: response.headers.get('data-version') };
}

async function toError(response: Response): Promise<RhydbError> {
    // Errors from RhyDB itself are JSON; the fronting proxy answers timeouts
    // with an HTML 504 page.
    let message = response.statusText;
    try {
        const body = await response.text();
        if (body.trimStart().startsWith('{')) {
            const parsed = JSON.parse(body) as { message?: string; error?: string };
            message = parsed.message ?? parsed.error ?? message;
        }
    } catch {
        // keep statusText
    }
    switch (response.status) {
        case 400:
            return new RhydbError('invalid-query', message, 400);
        // 502 and 503 both mean the instance is not answering queries right
        // now: 503 while it loads its data, 502 while the proxy has no backend
        // to reach at all. They call for the same thing from the user, and the
        // same retry treatment, so they are one kind.
        case 502:
        case 503:
            return new RhydbError('not-ready', message, response.status);
        case 504:
            return new RhydbError('too-expensive', message, 504);
        default:
            return new RhydbError('http', message, response.status);
    }
}
