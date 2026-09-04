import { forwardRef, type ReactNode } from 'react';

export type Size = {
    width: string;
    height?: string;
    minHeight?: string;
};

export const ResizeContainer = forwardRef<HTMLDivElement, { size: Size; children: ReactNode }>(
    ({ size, children }, ref) => (
        <div
            ref={ref}
            style={{ width: size.width, height: size.height, minHeight: size.minHeight, position: 'relative' }}
        >
            {children}
        </div>
    ),
);
