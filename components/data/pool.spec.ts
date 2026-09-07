import { describe, expect, test } from 'vitest';

import { pool } from './pool';

describe('pool', () => {
    test('runs every item and keeps the results in the order they were given', async () => {
        const results = await pool([1, 2, 3, 4], 2, async (value) => value * 10);
        expect(results).toEqual([10, 20, 30, 40]);
    });

    test('never runs more than the given number at once', async () => {
        let running = 0;
        let peak = 0;
        await pool(
            Array.from({ length: 20 }, (_, index) => index),
            4,
            async () => {
                running++;
                peak = Math.max(peak, running);
                await Promise.resolve();
                running--;
            },
        );
        expect(peak).toBeLessThanOrEqual(4);
    });

    test('a failure stops the rest rather than sending a few thousand more requests', async () => {
        const started: number[] = [];
        await expect(
            pool(
                Array.from({ length: 50 }, (_, index) => index),
                2,
                async (index) => {
                    started.push(index);
                    if (index === 0) {
                        throw new Error('instance is down');
                    }
                    await Promise.resolve();
                },
            ),
        ).rejects.toThrow('instance is down');
        expect(started.length).toBeLessThan(50);
    });

    test('the caller aborting stops the queue where it stands', async () => {
        const controller = new AbortController();
        const started: number[] = [];
        await pool(
            Array.from({ length: 10 }, (_, index) => index),
            1,
            async (index, _position, signal) => {
                // The task's own signal is the one to give a request, so
                // aborting the pool cancels what is already running.
                expect(signal.aborted).toBe(false);
                started.push(index);
                if (index === 2) {
                    controller.abort();
                }
            },
            controller.signal,
        );
        expect(started).toEqual([0, 1, 2]);
    });

    test('no items is not an error', async () => {
        expect(await pool([], 4, async () => 1)).toEqual([]);
    });
});
