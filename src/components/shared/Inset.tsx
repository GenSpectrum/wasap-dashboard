import type { PropsWithChildren } from 'react';

/**
 * A panel that sits slightly recessed in the grey of the sidebar: a darker tint (where it used to be
 * an inner shadow) with a border.
 */
export function Inset({ children, className }: PropsWithChildren<{ className?: string }>) {
    return <div className={`border border-stone-300 bg-stone-300/40 ${className}`}>{children}</div>;
}
