import { LabeledField } from './LabeledField';
import { NumericInput } from './NumericInput';
import { WithReferenceGenome } from './WithReferenceGenome';
import { MAX_POSITION_RANGE_LENGTH, type ManualAnalysis } from '../../pageState/analysisFilter';
import { usePositionRange } from '../../pageState/positionRange';

/**
 * The position range of the manual mode: a gene for amino acids, then sliders for the first
 * position and the number of positions. The start slider ends where the range still fits.
 */
export function PositionRangeFilter({
    pageState,
    setPageState,
}: {
    pageState: ManualAnalysis;
    setPageState: (newState: ManualAnalysis) => void;
}) {
    const { referenceGenome, range } = usePositionRange(pageState);

    return (
        <WithReferenceGenome referenceGenome={referenceGenome}>
            {({ genes }) => {
                if (range === undefined) {
                    return <span className='text-sm'>The reference genome has no sequence to pick positions in.</span>;
                }
                const sequenceLength = range.reference.length;
                // The number field takes any number, past the slider's end too.
                const maxLength = Math.min(MAX_POSITION_RANGE_LENGTH, sequenceLength);
                const end = range.start + range.length - 1;
                return (
                    <>
                        {pageState.sequenceType === 'amino acid' && (
                            <LabeledField label='Gene'>
                                <select
                                    className='select w-full'
                                    value={range.reference.name}
                                    onChange={(event) =>
                                        setPageState({
                                            ...pageState,
                                            rangeGene: event.target.value,
                                            rangeStart: undefined,
                                        })
                                    }
                                >
                                    {genes.map((gene) => (
                                        <option key={gene.name} value={gene.name}>
                                            {gene.name} ({gene.length.toLocaleString()} aa)
                                        </option>
                                    ))}
                                </select>
                            </LabeledField>
                        )}
                        <NumericInput
                            label='Start position'
                            value={range.start}
                            min={1}
                            max={sequenceLength - range.length + 1}
                            step={1}
                            onChange={(rangeStart) =>
                                setPageState({ ...pageState, rangeStart: wholeAtLeastOne(rangeStart) })
                            }
                        />
                        <NumericInput
                            label='Length'
                            value={range.length}
                            min={1}
                            max={maxLength}
                            step={1}
                            onChange={(rangeLength) =>
                                setPageState({
                                    ...pageState,
                                    rangeLength: Math.min(wholeAtLeastOne(rangeLength), maxLength),
                                })
                            }
                        />
                        <p className='text-sm text-gray-600'>
                            Positions {range.start.toLocaleString()} to {end.toLocaleString()} of{' '}
                            {pageState.sequenceType === 'amino acid' ? range.reference.name : 'the genome'}
                        </p>
                    </>
                );
            }}
        </WithReferenceGenome>
    );
}

function wholeAtLeastOne(value: number): number {
    return Math.max(1, Math.round(value));
}
