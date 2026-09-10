/**
 * The SaneQL relation pipeline: a table, and the operations applied to it.
 *
 * Each step returns a new relation, so a query is built by naming what happens
 * to the rows. Two rules the instance imposes are expressed in the types, so
 * breaking them does not compile:
 *
 * - `limit()` ends the pipeline, so `offset` after it does not typecheck.
 * - `offset(0)` is the relation unchanged.
 */

import { field, int, num, record, renderArgs, set, type Args, type Expr } from './expression';

/** Anything that can be sent. */
export type Queryable = { render(): string };

/**
 * Grouping columns.
 *
 * Names where the columns already exist — `{sampleId, batchId}` — and
 * assignments where they are computed. The instance takes one form or the
 * other and not a mixture, so a list holding one assignment must be all
 * assignments, and an existing column then travels as `sampleId := sampleId`.
 */
export type GroupColumns = readonly (Expr | string)[] | Readonly<Record<string, Expr>>;

export type MutationOptions = {
    minProportion?: number;
    /** Sequence columns to report; omit for all of them. */
    sequenceNames?: readonly string[];
    /** Result fields to keep. Trimming these is what keeps a mutation payload small. */
    fields?: readonly string[];
};

/** A pipeline a limit has already ended. */
export type Limited = Queryable;

export type Relation = Queryable & {
    /** Narrowed, or returned unchanged where there is nothing to narrow by. */
    filter(predicate: Expr | undefined): Relation;
    map(assignments: Readonly<Record<string, Expr>>): Relation;
    project(columns: readonly (Expr | string)[]): Relation;
    groupBy(aggregates: Readonly<Record<string, Expr>>, columns?: GroupColumns): Relation;
    orderBy(...keys: readonly Expr[]): Relation;
    /** Rows to skip. Zero appends nothing, and must precede any limit. */
    offset(count: number): Relation;
    /** Rows to keep. Ends the pipeline. */
    limit(count: number): Limited;
    mutations(options?: MutationOptions): Relation;
    aminoAcidMutations(options?: MutationOptions): Relation;
    insertions(options?: { sequenceNames?: readonly string[] }): Relation;
    aminoAcidInsertions(options?: { sequenceNames?: readonly string[] }): Relation;
    /** The columns the instance holds, and their types. */
    schema(): Relation;
    /** Any other operation the language offers. */
    pipe(name: string, args?: Args): Relation;
};

/** The root of every query: the table, by name. */
export function table(name: string): Relation {
    return relation(field(name).render());
}

function relation(text: string): Relation {
    const pipe = (name: string, args?: Args): Relation => relation(`${text}.${name}(${renderArgs(args)})`);

    return {
        render: () => text,
        pipe,
        filter: (predicate) => (predicate === undefined ? relation(text) : pipe('filter', [predicate])),
        map: (assignments) => pipe('map', [record(assignments)]),
        project: (columns) => pipe('project', [set(columns.map(asExpr))]),
        groupBy: (aggregates, columns) =>
            pipe('groupBy', columns === undefined ? [record(aggregates)] : [record(aggregates), groupColumns(columns)]),
        orderBy: (...keys) => pipe('orderBy', [set(keys)]),
        offset: (count) => {
            if (!Number.isInteger(count) || count < 0) {
                throw new Error(`Not a row offset: ${count}`);
            }
            return count === 0 ? relation(text) : pipe('offset', [int(count)]);
        },
        limit: (count) => {
            if (!Number.isInteger(count) || count < 1) {
                throw new Error(`Not a row limit: ${count}`);
            }
            return pipe('limit', [int(count)]);
        },
        mutations: (options) => pipe('mutations', mutationArgs(options)),
        aminoAcidMutations: (options) => pipe('aminoAcidMutations', mutationArgs(options)),
        insertions: (options) => pipe('insertions', sequenceArgs(options?.sequenceNames)),
        aminoAcidInsertions: (options) => pipe('aminoAcidInsertions', sequenceArgs(options?.sequenceNames)),
        schema: () => pipe('schema'),
    };
}

function groupColumns(columns: GroupColumns): Expr {
    return Array.isArray(columns) ? set(columns.map(asExpr)) : record(columns as Readonly<Record<string, Expr>>);
}

function asExpr(column: Expr | string): Expr {
    return typeof column === 'string' ? field(column) : column;
}

function mutationArgs(options: MutationOptions = {}): Args {
    const args: Record<string, Expr> = {};
    if (options.minProportion !== undefined) {
        args.minProportion = proportion(options.minProportion);
    }
    if (options.sequenceNames !== undefined) {
        args.sequenceNames = set(options.sequenceNames.map((name) => field(name)));
    }
    if (options.fields !== undefined) {
        args.fields = set(options.fields.map((name) => field(name)));
    }
    return args;
}

function sequenceArgs(sequenceNames?: readonly string[]): Args {
    return sequenceNames === undefined ? {} : { sequenceNames: set(sequenceNames.map((name) => field(name))) };
}

/** A share of the reads, which the operation requires to be in [0, 1]. */
function proportion(value: number): Expr {
    if (!Number.isFinite(value) || value < 0 || value > 1) {
        throw new Error(`Not a proportion in [0, 1]: ${value}`);
    }
    return num(value);
}
