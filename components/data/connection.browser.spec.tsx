import { type FC, type PropsWithChildren } from 'react';
import { renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { ConnectionProvider, useConnection, useSiloSchema } from './connection';
import type { SiloSchema } from '../queries/schema';

const schema: SiloSchema = { table: 'default', locationName: 'locationName', samplingDate: 'samplingDate' };

const wrapper: FC<PropsWithChildren> = ({ children }) => (
    <ConnectionProvider url='https://silo.example.org/covid' schema={schema}>
        {children}
    </ConnectionProvider>
);

describe('useConnection', () => {
    it('gives back a Connection rooted at the provider url and the schema table', () => {
        const { result } = renderHook(() => useConnection(), { wrapper });

        expect(result.current.url).toBe('https://silo.example.org/covid');
        expect(result.current.table).toBe('default');
        expect(result.current.root().render()).toBe('default');
        expect(result.current.key).toEqual(['https://silo.example.org/covid', 'default']);
    });

    it('keeps the same Connection instance across re-renders while the inputs are unchanged', () => {
        const { result, rerender } = renderHook(() => useConnection(), { wrapper });
        const first = result.current;
        rerender();

        expect(result.current).toBe(first);
    });

    it('throws when used outside a ConnectionProvider', () => {
        expect(() => renderHook(() => useConnection())).toThrow('must be used inside a ConnectionProvider');
    });
});

describe('useSiloSchema', () => {
    it('gives back the schema the provider was given', () => {
        const { result } = renderHook(() => useSiloSchema(), { wrapper });
        expect(result.current).toEqual(schema);
    });

    it('throws when used outside a ConnectionProvider', () => {
        expect(() => renderHook(() => useSiloSchema())).toThrow('must be used inside a ConnectionProvider');
    });
});
