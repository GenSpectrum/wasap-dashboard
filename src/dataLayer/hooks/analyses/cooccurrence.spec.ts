import { describe, expect, test } from 'vitest';

import {
    buildCooccurrenceMap,
    cooccurrenceTargets,
    filterCooccurrenceByMinShare,
    sliceCooccurrenceRows,
} from './cooccurrence';
import { parseDateStringToTemporal } from '../../../domain/temporal';
import { type CooccurrenceRow } from '../../queries/cooccurrence';

const granularity = 'day';
const positionLabels = ['241', '23403'];

function bucket(date: string) {
    return parseDateStringToTemporal(date, granularity);
}

describe('buildCooccurrenceMap', () => {
    test('a fully-covered pattern gets its count/coverage/totalCount per bucket', () => {
        const rows: CooccurrenceRow[] = [
            { date: '2026-06-01', symbols: ['C', 'A'], count: 3 },
            { date: '2026-06-01', symbols: ['T', 'A'], count: 7 },
        ];
        const requestedDateRanges = [bucket('2026-06-01')];

        const map = buildCooccurrenceMap(rows, requestedDateRanges, [10], granularity, positionLabels, 'N');

        expect(map.getFirstAxisKeys()).toEqual([
            { symbols: { '241': 'C', '23403': 'A' } },
            { symbols: { '241': 'T', '23403': 'A' } },
        ]);
        expect(map.get({ symbols: { '241': 'C', '23403': 'A' } }, bucket('2026-06-01'))).toEqual({
            type: 'value',
            count: 3,
            coverage: 10,
            totalCount: 10,
        });
    });

    test('a pattern with no covered position at all is dropped', () => {
        const rows: CooccurrenceRow[] = [{ date: '2026-06-01', symbols: ['N', 'N'], count: 5 }];
        const map = buildCooccurrenceMap(rows, [bucket('2026-06-01')], [5], granularity, positionLabels, 'N');
        expect(map.getFirstAxisKeys()).toEqual([]);
    });

    test('coverage of a partially-covered pattern only requires its own covered positions', () => {
        const rows: CooccurrenceRow[] = [
            // covered at 241 only
            { date: '2026-06-01', symbols: ['C', 'N'], count: 2 },
            // covered at both — still counts toward the first pattern's coverage
            { date: '2026-06-01', symbols: ['C', 'A'], count: 4 },
            // not covered at 241 at all — does not count
            { date: '2026-06-01', symbols: ['N', 'A'], count: 8 },
        ];
        const map = buildCooccurrenceMap(rows, [bucket('2026-06-01')], [20], granularity, positionLabels, 'N');

        const partial = map.get({ symbols: { '241': 'C', '23403': null } }, bucket('2026-06-01'));
        expect(partial).toEqual({ type: 'value', count: 2, coverage: 6, totalCount: 20 });
    });

    test('sorts by number of covered positions descending, then alphabetically', () => {
        const rows: CooccurrenceRow[] = [
            { date: '2026-06-01', symbols: ['C', 'N'], count: 1 },
            { date: '2026-06-01', symbols: ['C', 'A'], count: 1 },
            { date: '2026-06-01', symbols: ['A', 'A'], count: 1 },
        ];
        const map = buildCooccurrenceMap(rows, [bucket('2026-06-01')], [3], granularity, positionLabels, 'N');
        expect(map.getFirstAxisKeys()).toEqual([
            { symbols: { '241': 'A', '23403': 'A' } },
            { symbols: { '241': 'C', '23403': 'A' } },
            { symbols: { '241': 'C', '23403': null } },
        ]);
    });

    test('a zero-total bucket is null, not zero-coverage', () => {
        const rows: CooccurrenceRow[] = [{ date: '2026-06-01', symbols: ['C', 'A'], count: 1 }];
        const map = buildCooccurrenceMap(rows, [bucket('2026-06-01')], [0], granularity, positionLabels, 'N');
        expect(map.get({ symbols: { '241': 'C', '23403': 'A' } }, bucket('2026-06-01'))).toBeNull();
    });
});

describe('cooccurrenceTargets', () => {
    test('nucleotide targets use the schema nucleotide sequence column', () => {
        const { targets, labels } = cooccurrenceTargets(
            [
                { label: '241', segment: undefined, position: 241 },
                { label: '23403', segment: undefined, position: 23403 },
            ],
            'nucleotide',
            'main',
        );
        expect(targets).toEqual([
            { sequenceName: 'main', position: 241 },
            { sequenceName: 'main', position: 23403 },
        ]);
        expect(labels).toEqual(['241', '23403']);
    });

    test('amino acid targets use each token’s own gene', () => {
        const { targets, labels } = cooccurrenceTargets(
            [{ label: 'S:501', segment: 'S', position: 501 }],
            'amino acid',
            'main',
        );
        expect(targets).toEqual([{ sequenceName: 'S', position: 501 }]);
        expect(labels).toEqual(['S:501']);
    });

    test('deduplicates by sequence + position', () => {
        const { targets, labels } = cooccurrenceTargets(
            [
                { label: 'S:501', segment: 'S', position: 501 },
                { label: 'S:501', segment: 'S', position: 501 },
            ],
            'amino acid',
            'main',
        );
        expect(targets).toEqual([{ sequenceName: 'S', position: 501 }]);
        expect(labels).toEqual(['S:501']);
    });
});

describe('filterCooccurrenceByMinShare', () => {
    test('drops a pattern on less than the min. share of the reads', () => {
        const rows: CooccurrenceRow[] = [
            { date: '2026-06-01', symbols: ['C', 'A'], count: 1 }, // 1/10 = 0.1
            { date: '2026-06-01', symbols: ['T', 'A'], count: 9 }, // 9/10 = 0.9
        ];
        const map = buildCooccurrenceMap(rows, [bucket('2026-06-01')], [10], granularity, positionLabels, 'N');

        const filtered = filterCooccurrenceByMinShare(map, 0.5, false);
        expect(filtered.getFirstAxisKeys()).toEqual([{ symbols: { '241': 'T', '23403': 'A' } }]);
    });

    test('hideGaps drops date columns with no data anywhere', () => {
        const rows: CooccurrenceRow[] = [{ date: '2026-06-01', symbols: ['C', 'A'], count: 1 }];
        const map = buildCooccurrenceMap(
            rows,
            [bucket('2026-06-01'), bucket('2026-06-02')],
            [10, 0],
            granularity,
            positionLabels,
            'N',
        );

        const filtered = filterCooccurrenceByMinShare(map, 0, true);
        expect(filtered.getSecondAxisKeys()).toEqual([bucket('2026-06-01')]);
    });
});

describe('sliceCooccurrenceRows', () => {
    test('keeps only the given patterns', () => {
        const rows: CooccurrenceRow[] = [
            { date: '2026-06-01', symbols: ['C', 'A'], count: 1 },
            { date: '2026-06-01', symbols: ['T', 'A'], count: 1 },
        ];
        const map = buildCooccurrenceMap(rows, [bucket('2026-06-01')], [2], granularity, positionLabels, 'N');
        const view = filterCooccurrenceByMinShare(map, 0, false);

        const sliced = sliceCooccurrenceRows(view, [{ symbols: { '241': 'T', '23403': 'A' } }]);
        expect(sliced.getFirstAxisKeys()).toEqual([{ symbols: { '241': 'T', '23403': 'A' } }]);
    });
});
