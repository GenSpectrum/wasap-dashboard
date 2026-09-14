import { describe, expect, test } from 'vitest';

import { and, field, str } from './expression';
import { count, nucleotideEquals } from './functions';
import { table } from './relation';

const main = field('main');

describe('the pipeline', () => {
    test('a table on its own', () => {
        expect(table('default').render()).toBe('default');
        expect(table('two words').render()).toBe('"two words"');
    });

    test('narrowing, and not narrowing', () => {
        expect(
            table('default')
                .filter(field('sampleId').eq(str('S1')))
                .render(),
        ).toBe("default.filter(sampleId = 'S1')");
        expect(table('default').filter(undefined).render()).toBe('default');
        expect(table('default').filter(and(undefined)).render()).toBe('default');
    });

    test('grouping by names and by assignments', () => {
        expect(table('default').groupBy({ n: count() }).render()).toBe('default.groupBy({n := count()})');
        expect(table('default').groupBy({ reads: count() }, ['sampleId', 'batchId']).render()).toBe(
            'default.groupBy({reads := count()}, {sampleId, batchId})',
        );
        expect(
            table('default')
                .groupBy({ n: count() }, { p1: main.at(1722), sampleId: field('sampleId') })
                .render(),
        ).toBe('default.groupBy({n := count()}, {p1 := main.at(1722), sampleId := sampleId})');
    });

    test('ordering and paging', () => {
        expect(table('default').groupBy({ n: count() }).orderBy(field('n').desc()).limit(60).render()).toBe(
            'default.groupBy({n := count()}).orderBy({n.desc()}).limit(60)',
        );
        expect(table('default').groupBy({ n: count() }).orderBy(field('n').desc()).offset(60).limit(60).render()).toBe(
            'default.groupBy({n := count()}).orderBy({n.desc()}).offset(60).limit(60)',
        );
    });

    test('an offset of zero appends nothing, so no caller writes that branch', () => {
        expect(table('default').offset(0).render()).toBe('default');
        expect(table('default').offset(0).limit(60).render()).toBe('default.limit(60)');
    });

    test('a limit ends the pipeline, which is how offset-before-limit is enforced', () => {
        const limited = table('default').limit(60);
        // The annotation is the assertion: `tsc` fails if offsetting after a
        // limit ever starts typechecking again.
        // @ts-expect-error a limited pipeline has no offset
        limited.offset;
        expect(limited.render()).toBe('default.limit(60)');
    });

    test('rejects paging arguments the instance cannot take', () => {
        expect(() => table('default').limit(0)).toThrow();
        expect(() => table('default').limit(1.5)).toThrow();
        expect(() => table('default').offset(-1)).toThrow();
    });

    test('mutations, with each optional argument present and absent', () => {
        expect(table('default').mutations().render()).toBe('default.mutations()');
        expect(table('default').mutations({ minProportion: 0.05 }).render()).toBe(
            'default.mutations(minProportion := 0.05)',
        );
        expect(table('default').mutations({ minProportion: 0 }).render()).toBe('default.mutations(minProportion := 0)');
        expect(
            table('default')
                .aminoAcidMutations({ minProportion: 0.5, sequenceNames: ['S'], fields: ['position', 'coverage'] })
                .render(),
        ).toBe(
            'default.aminoAcidMutations(minProportion := 0.5, sequenceNames := {S}, fields := {position, coverage})',
        );
        expect(() => table('default').mutations({ minProportion: 1.5 })).toThrow();
    });

    test('insertions, which no other query can see', () => {
        expect(table('default').insertions().render()).toBe('default.insertions()');
        expect(
            table('default')
                .insertions({ sequenceNames: ['main'] })
                .render(),
        ).toBe('default.insertions(sequenceNames := {main})');
    });

    test('the schema', () => {
        expect(table('default').schema().render()).toBe('default.schema()');
    });

    test('a whole grouping, as the browser sends it', () => {
        const query = table('default')
            .filter(
                and(
                    field('sampleId').eq(str('S1')),
                    nucleotideEquals({ position: 23403, symbol: 'G', sequenceName: 'main' }),
                ),
            )
            .groupBy({ n: count() }, { p1: main.at(23403), p2: main.at(23404) })
            .orderBy(field('n').desc())
            .offset(60)
            .limit(60);
        expect(query.render()).toBe(
            "default.filter(sampleId = 'S1' && nucleotideEquals(position := 23403, symbol := 'G', " +
                "sequenceName := 'main'))" +
                '.groupBy({n := count()}, {p1 := main.at(23403), p2 := main.at(23404)})' +
                '.orderBy({n.desc()}).offset(60).limit(60)',
        );
    });

    test('every step leaves the one before it untouched', () => {
        const scoped = table('default').filter(field('sampleId').eq(str('S1')));
        scoped.groupBy({ n: count() });
        expect(scoped.render()).toBe("default.filter(sampleId = 'S1')");
    });
});
