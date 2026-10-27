import { renderHook } from '@testing-library/react';
import { type FC, type PropsWithChildren } from 'react';
import { describe, expect, it } from 'vitest';

import { ConnectionProvider, useConnection, useRhydbSchema } from './connection';
import type { RhydbSchema } from '../queries/schema';

const schema: RhydbSchema = {
    table: 'data',
    locationName: 'locationName',
    samplingDate: 'samplingDate',
    groupingDate: 'date',
    groupingDateIsDictionary: true,
    nucleotideSequence: 'main',
    sampleId: 'sampleId',
    batchId: 'batchId',
};

const wrapper: FC<PropsWithChildren> = ({ children }) => (
    <ConnectionProvider url='https://rhydb.example.org/covid' schema={schema}>
        {children}
    </ConnectionProvider>
);

describe('useConnection', () => {
    it('gives back a Connection rooted at the provider url and the schema table', () => {
        const { result } = renderHook(() => useConnection(), { wrapper });

        expect(result.current.url).toBe('https://rhydb.example.org/covid');
        expect(result.current.table).toBe('data');
        expect(result.current.root().render()).toBe('data');
        expect(result.current.key).toEqual(['https://rhydb.example.org/covid', 'data']);
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

describe('useRhydbSchema', () => {
    it('gives back the schema the provider was given', () => {
        const { result } = renderHook(() => useRhydbSchema(), { wrapper });
        expect(result.current).toEqual(schema);
    });

    it('throws when used outside a ConnectionProvider', () => {
        expect(() => renderHook(() => useRhydbSchema())).toThrow('must be used inside a ConnectionProvider');
    });
});
