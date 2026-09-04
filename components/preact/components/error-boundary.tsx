import { Component, useMemo, type PropsWithChildren, type ReactNode } from 'react';
import { type ZodSchema } from 'zod';

import { ErrorDisplay, type ErrorDisplayProps, InvalidPropsError } from './error-display';
import { ResizeContainer, type Size } from './resize-container';

export type ErrorBoundaryProps<T> = {
    size: Size;
    componentProps: T;
    schema: ZodSchema<T>;
    layout?: ErrorDisplayProps['layout'];
};

export const ErrorBoundary = <T extends Record<string, unknown>>({
    size,
    layout,
    componentProps,
    schema,
    children,
}: PropsWithChildren<ErrorBoundaryProps<T>>) => {
    const componentPropsParseError = useCheckComponentProps(schema, componentProps);

    if (componentPropsParseError !== undefined) {
        return (
            <ResizeContainer size={size}>
                <ErrorDisplay error={componentPropsParseError} layout={layout} />
            </ResizeContainer>
        );
    }

    return (
        <RenderErrorCatcher size={size} layout={layout} resetKey={componentProps}>
            {children}
        </RenderErrorCatcher>
    );
};

function useCheckComponentProps<T extends Record<string, unknown>>(schema: ZodSchema<T>, componentProps: T) {
    return useMemo(() => {
        const parseResult = schema.safeParse(componentProps);
        if (parseResult.success) {
            return undefined;
        }

        return new InvalidPropsError(parseResult.error, componentProps);
    }, [componentProps, schema]);
}

type RenderErrorCatcherProps = {
    size: Size;
    layout?: ErrorDisplayProps['layout'];
    // Preact's `useErrorBoundary` reset itself whenever the wrapped component's props
    // changed (see the original `useEffect` this replaces). React has no hook for
    // catching errors thrown while rendering children — only a class component's
    // `getDerivedStateFromError` can — so `resetKey` reproduces that "reset on prop
    // change" behavior via `componentDidUpdate`. Compared by shallow equality, not
    // reference: callers pass `componentProps` as a fresh object on every render, so
    // reference equality would clear a caught error on the next unrelated re-render.
    resetKey: Record<string, unknown>;
    children?: ReactNode;
};

type RenderErrorCatcherState = { error: Error | undefined };

function shallowEqual(a: Record<string, unknown>, b: Record<string, unknown>): boolean {
    if (a === b) {
        return true;
    }
    const aKeys = Object.keys(a);
    const bKeys = Object.keys(b);
    return aKeys.length === bKeys.length && aKeys.every((key) => Object.is(a[key], b[key]));
}

class RenderErrorCatcher extends Component<RenderErrorCatcherProps, RenderErrorCatcherState> {
    override state: RenderErrorCatcherState = { error: undefined };

    static getDerivedStateFromError(error: Error): RenderErrorCatcherState {
        return { error };
    }

    override componentDidUpdate(prevProps: RenderErrorCatcherProps) {
        if (this.state.error !== undefined && !shallowEqual(prevProps.resetKey, this.props.resetKey)) {
            this.setState({ error: undefined });
        }
    }

    private resetError = () => {
        this.setState({ error: undefined });
    };

    override render() {
        const { error } = this.state;
        if (error !== undefined) {
            return (
                <ResizeContainer size={this.props.size}>
                    <ErrorDisplay error={error} resetError={this.resetError} layout={this.props.layout} />
                </ResizeContainer>
            );
        }

        return <>{this.props.children}</>;
    }
}
