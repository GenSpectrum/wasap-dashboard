import { describe, expect, it } from 'vitest';

import { queryClient } from './queryClient';

describe('queryClient', () => {
    it('does not retry SILO queries, which retry on their own', () => {
        expect(queryClient.defaultQueryOptions({ queryKey: ['silo', 'total-read-count'] }).retry).toBe(false);
    });

    it('retries other queries once', () => {
        expect(queryClient.defaultQueryOptions({ queryKey: ['lapis', 'lineage-options'] }).retry).toBe(1);
    });
});
