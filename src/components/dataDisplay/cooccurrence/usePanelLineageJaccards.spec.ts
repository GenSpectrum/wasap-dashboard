import { describe, expect, test } from 'vitest';

import { groupByLineage, jaccardsByRow, type PanelJaccardRow } from './usePanelLineageJaccards';

const rows: PanelJaccardRow[] = [
    { rowKey: 'reference', codes: [], lineages: ['XFG'] },
    { rowKey: 'a', codes: ['C1T', 'G2A'], lineages: ['XFG', 'LP.8'] },
    { rowKey: 'b', codes: ['C1T'], lineages: [] },
    { rowKey: 'c', codes: ['G2A'], lineages: ['LP.8'] },
];

describe('groupByLineage', () => {
    test('groups the rows with mutations by lineage, in row order', () => {
        const grouped = groupByLineage(rows);

        expect(
            [...grouped].map(([lineage, lineageRows]) => [lineage, lineageRows.map(({ rowKey }) => rowKey)]),
        ).toEqual([
            ['XFG', ['a']],
            ['LP.8', ['a', 'c']],
        ]);
    });
});

describe('jaccardsByRow', () => {
    test('maps each lineage’s indices back to its rows', () => {
        const jaccards = jaccardsByRow(groupByLineage(rows), [[0.4], [0.9, 0.2]]);

        expect(jaccards).toEqual(
            new Map([
                [
                    'a',
                    new Map([
                        ['XFG', 0.4],
                        ['LP.8', 0.9],
                    ]),
                ],
                ['c', new Map([['LP.8', 0.2]])],
            ]),
        );
    });

    test('leaves out the lineages not answered yet', () => {
        const jaccards = jaccardsByRow(groupByLineage(rows), [undefined, [0.9, 0.2]]);

        expect(jaccards.get('a')).toEqual(new Map([['LP.8', 0.9]]));
        expect(jaccards.get('c')).toEqual(new Map([['LP.8', 0.2]]));
    });
});
