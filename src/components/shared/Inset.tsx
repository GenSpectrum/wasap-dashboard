import type { PropsWithChildren } from 'react';

export function Inset({ children, className }: PropsWithChildren<{ className?: string }>) {
    return <div className={`border-[1px] border-gray-200 ${className}`}>{children}</div>;
}
