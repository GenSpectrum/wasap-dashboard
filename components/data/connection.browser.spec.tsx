import { type FC, type PropsWithChildren } from 'react';
import { renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { ConnectionProvider, useConnection } from './connection';

describe('useConnection', () => {
    it('gives back a Connection rooted at the provider url and table', () => {
        const wrapper: FC<PropsWithChildren> = ({ children }) => (
            <ConnectionProvider url='https://silo.example.org/covid' table='default'>
                {children}
            </ConnectionProvider>
        );

        const { result } = renderHook(() => useConnection(), { wrapper });

        expect(result.current.url).toBe('https://silo.example.org/covid');
        expect(result.current.table).toBe('default');
        expect(result.current.root().render()).toBe('default');
        expect(result.current.key).toEqual(['https://silo.example.org/covid', 'default']);
    });

    it('keeps the same Connection instance across re-renders while url and table are unchanged', () => {
        const wrapper: FC<PropsWithChildren> = ({ children }) => (
            <ConnectionProvider url='https://silo.example.org/covid' table='default'>
                {children}
            </ConnectionProvider>
        );

        const { result, rerender } = renderHook(() => useConnection(), { wrapper });
        const first = result.current;
        rerender();

        expect(result.current).toBe(first);
    });

    it('throws when used outside a ConnectionProvider', () => {
        expect(() => renderHook(() => useConnection())).toThrow(
            'useConnection must be used inside a ConnectionProvider',
        );
    });
});
