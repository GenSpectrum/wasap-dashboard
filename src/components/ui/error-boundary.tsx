import { Component, type ReactNode } from 'react';

import { ErrorDisplay, type ErrorDisplayProps } from './error-display';

type ErrorBoundaryProps = {
    /** When one of these changes (by `Object.is`), the children are rendered again after an error. */
    resetKeys?: unknown[];
    layout?: ErrorDisplayProps['layout'];
    children?: ReactNode;
};

type ErrorBoundaryState = { error: Error | undefined };

/**
 * Shows an `ErrorDisplay` in place of the children when rendering them throws, e.g. because a query
 * they read failed. Only a class component can catch that, with `getDerivedStateFromError`.
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
    override state: ErrorBoundaryState = { error: undefined };

    static getDerivedStateFromError(error: Error): ErrorBoundaryState {
        return { error };
    }

    override componentDidUpdate(prevProps: ErrorBoundaryProps) {
        if (this.state.error !== undefined && !sameKeys(prevProps.resetKeys, this.props.resetKeys)) {
            this.setState({ error: undefined });
        }
    }

    private resetError = () => {
        this.setState({ error: undefined });
    };

    override render() {
        const { error } = this.state;
        if (error !== undefined) {
            return <ErrorDisplay error={error} resetError={this.resetError} layout={this.props.layout} />;
        }

        return this.props.children;
    }
}

function sameKeys(a: unknown[] = [], b: unknown[] = []): boolean {
    return a.length === b.length && a.every((key, index) => Object.is(key, b[index]));
}
