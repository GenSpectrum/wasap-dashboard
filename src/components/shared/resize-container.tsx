import { type ReactNode } from 'react';

export type Size = {
    width: string;
    height?: string;
    minHeight?: string;
};

export const ResizeContainer = ({ size, children }: { size: Size; children: ReactNode }) => (
    <div style={{ width: size.width, height: size.height, minHeight: size.minHeight, position: 'relative' }}>
        {children}
    </div>
);
