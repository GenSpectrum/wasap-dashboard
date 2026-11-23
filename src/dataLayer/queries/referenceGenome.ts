/**
 * The reference genome of an instance: the names and lengths of its segments and genes.
 *
 * Every instance holds it in a `reference_genomes` table, one row per segment
 * or gene, next to the reads. The table has no column for the length, and the
 * language no function to compute it, so the sequences are fetched and their
 * lengths computed here.
 *
 * An instance with several read tables shares one `reference_genomes` table
 * between them: covid's `data` table has rows named after its columns (`main`,
 * `S`), and the `rsva` table in the same instance has rows prefixed with the
 * table name (`rsva_main`, `rsva_F`). Nothing links a row to its table but that
 * name, so a table's reference is matched up against its columns: column `X`
 * takes the row `<table>_X` where there is one, else the row `X`. The prefixed
 * row wins because RSV and SARS-CoV-2 both have an `M` and an `N` gene.
 */

import { table, type Queryable } from '../transport/relation';
import { readText, RhydbRowError, type RhydbRow } from '../transport/row';

/** A segment or gene of the reference: its name, its symbols, and their number. */
export type ReferenceSequence = { name: string; sequence: string; length: number };

export type ReferenceGenome = {
    nucleotideSequences: ReferenceSequence[];
    genes: ReferenceSequence[];
};

export const isSingleSegmented = (referenceGenome: ReferenceGenome) => referenceGenome.nucleotideSequences.length === 1;

export function referenceGenomeQuery(): Queryable {
    return table('reference_genomes');
}

/** The columns of a read table, to match `referenceGenomeQuery`'s rows against. */
export function tableColumnsQuery(tableName: string): Queryable {
    return table(tableName).schema();
}

/** The column names in the rows of `tableColumnsQuery`. */
export function readTableColumns(rows: readonly RhydbRow[]): string[] {
    return rows.map((row) => readText(row, 'fieldName'));
}

/**
 * The rows of `referenceGenomeQuery` that belong to `tableName`'s columns, in
 * the order the instance sent them, named after the column.
 */
export function readReferenceGenome(
    rows: readonly RhydbRow[],
    tableName: string,
    columns: readonly string[],
): ReferenceGenome {
    const prefix = `${tableName}_`;
    const rowNames = new Set(rows.map((row) => readText(row, 'name')));
    const columnNames = new Set(columns);
    const columnOf = (rowName: string) => {
        if (rowName.startsWith(prefix) && columnNames.has(rowName.slice(prefix.length))) {
            return rowName.slice(prefix.length);
        }
        if (columnNames.has(rowName) && !rowNames.has(prefix + rowName)) {
            return rowName;
        }
        return undefined;
    };

    const referenceGenome: ReferenceGenome = { nucleotideSequences: [], genes: [] };
    for (const row of rows) {
        const name = columnOf(readText(row, 'name'));
        if (name === undefined) {
            continue;
        }
        const symbols = readText(row, 'sequence');
        const sequence = { name, sequence: symbols, length: symbols.length };
        const type = readText(row, 'type');
        switch (type) {
            case 'nucleotide':
                referenceGenome.nucleotideSequences.push(sequence);
                break;
            case 'amino_acid':
                referenceGenome.genes.push(sequence);
                break;
            default:
                throw new RhydbRowError('type', `expected nucleotide or amino_acid, got ${JSON.stringify(type)}`);
        }
    }
    return referenceGenome;
}
