export interface PageStateHandler<PageState extends object> {
    // Standalone: parses from `URLSearchParams` rather than a whole `URL`. Under
    // the hash router the query string lives in the fragment, so react-router's
    // `useSearchParams` is the source, not `window.location`.
    parsePageStateFromUrl(searchParams: URLSearchParams): PageState;

    toSearchParams(pageState: PageState): URLSearchParams;

    toUrl(pageState: PageState): string;

    getDefaultPageUrl(): string;
}
