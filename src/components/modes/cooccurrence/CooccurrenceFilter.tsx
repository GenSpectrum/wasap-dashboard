import { type FC, useState } from 'react';

import { type WasapPageConfigFor } from '../../../config/wasapPageConfig';
import { type Amplicon } from '../../../externalData/fileBased/amplicons/primerBed';
import { ampliconAnchor, samplingPositions } from '../../../externalData/fileBased/amplicons/samplingPositions';
import { useAmplicons } from '../../../externalData/fileBased/amplicons/useAmplicons';
import { codonAnchorFor } from '../../../externalData/fileBased/genome/geneAnnotation';
import { useGeneAnnotation } from '../../../externalData/fileBased/genome/useGeneAnnotation';
import { type LineageTree } from '../../../externalData/fileBased/lineageTree/lineageTree';
import {
    DEFAULT_ENTROPY_CUTOFF_BITS,
    POSITION_SOURCE,
    effectivePositionSource,
    type PositionSource,
    type WasapCooccurrenceFilter,
} from '../../../pageState/wasap/wasapAnalysisFilter';
import { type SequenceType } from '../../../types/dashboardComponents';
import { parsePositionToken } from '../../../util/parsePositionToken';
import { LabeledField } from '../../inputs/LabeledField';
import { LineageTreeCombobox } from '../../inputs/LineageTreeCombobox';
import { NumericInput } from '../../inputs/NumericInput';
import { SegmentedSelect } from '../../inputs/SegmentedSelect';
import { SequenceTypeSelector } from '../../inputs/SequenceTypeSelector';
import { TabbedPanel } from '../../inputs/TabbedPanel';
import { PositionFilter } from '../../inputs/positionFilter/position-filter';

const MIN_SHARE_OPTIONS = [
    { value: 0, label: '–', title: 'None' },
    { value: 0.001, label: '0.1%' },
    { value: 0.01, label: '1%' },
    { value: 0.1, label: '10%' },
];

export function CooccurrenceFilter({
    pageState,
    setPageState,
    config,
    lineageTree,
}: {
    pageState: WasapCooccurrenceFilter;
    setPageState: (newState: WasapCooccurrenceFilter) => void;
    config: WasapPageConfigFor<'cooccurrence'>;
    /** For the panel-of-lineages match, when the organism has a lineage tree. */
    lineageTree?: LineageTree;
}) {
    const positionSource = effectivePositionSource(pageState);
    const defaultPanel = config.filterDefaults.cooccurrence.panel ?? [];
    const missingDefaultLineages = defaultPanel.filter((lineage) => !(pageState.panel ?? []).includes(lineage));

    return (
        <>
            <SequenceTypeSelector
                value={pageState.sequenceType}
                onChange={(sequenceType) => {
                    if (sequenceType === pageState.sequenceType) {
                        return;
                    }
                    setPageState({ ...pageState, sequenceType, positions: undefined, anchorPosition: undefined });
                }}
            />
            <TabbedPanel<PositionSource>
                label='Positions from'
                value={positionSource}
                options={[
                    { value: POSITION_SOURCE.amplicon, label: 'Amplicon' },
                    { value: POSITION_SOURCE.manual, label: 'Manual' },
                ]}
                onChange={(newSource) => setPageState({ ...pageState, positionSource: newSource })}
            >
                {positionSource === POSITION_SOURCE.amplicon ? (
                    <>
                        {config.amplicons !== undefined && pageState.sequenceType === 'nucleotide' ? (
                            <AmpliconSelect
                                amplicons={config.amplicons}
                                toAnchor={ampliconAnchor}
                                value={pageState.anchorPosition}
                                onChange={(anchorPosition) => setPageState({ ...pageState, anchorPosition })}
                            />
                        ) : config.amplicons !== undefined &&
                          pageState.sequenceType === 'amino acid' &&
                          config.lineageTree?.genomeAnnotationUrl !== undefined ? (
                            <AminoAcidAmpliconSelect
                                amplicons={config.amplicons}
                                genomeAnnotationUrl={config.lineageTree.genomeAnnotationUrl}
                                value={pageState.anchorPosition}
                                onChange={(anchorPosition) => setPageState({ ...pageState, anchorPosition })}
                            />
                        ) : (
                            <AnchorPositionInput
                                sequenceType={pageState.sequenceType}
                                value={pageState.anchorPosition}
                                onChange={(anchorPosition) => setPageState({ ...pageState, anchorPosition })}
                            />
                        )}
                        <NumericInput
                            label='Entropy cutoff (bits)'
                            info={
                                <p>
                                    Only positions inside the detected amplicon whose Shannon entropy exceeds this
                                    cutoff are used for co-occurrence. 0 bits means a position always carries the same
                                    symbol; 1 bit means it&apos;s split roughly evenly between two symbols.
                                </p>
                            }
                            value={pageState.entropyCutoff ?? DEFAULT_ENTROPY_CUTOFF_BITS}
                            min={0}
                            max={2}
                            step={0.05}
                            onChange={(entropyCutoff) => setPageState({ ...pageState, entropyCutoff })}
                        />
                    </>
                ) : (
                    <PositionFilter
                        sequenceType={pageState.sequenceType}
                        initialValue={pageState.positions}
                        onPositionsChange={(positions) => setPageState({ ...pageState, positions })}
                    />
                )}
            </TabbedPanel>
            {lineageTree !== undefined && (
                <LabeledField
                    label='Panel of lineages'
                    info={
                        <p>
                            Checks which of these lineages&apos; signatures match each co-occurrence pattern at the
                            queried positions, so patterns the panel doesn&apos;t explain stand out. Only works with the
                            amplicon source, which knows the reference base at each position.
                        </p>
                    }
                >
                    <LineageTreeCombobox
                        lineageTree={lineageTree}
                        multiSelect={true}
                        value={pageState.panel ?? []}
                        onChange={(panel) => setPageState({ ...pageState, panel })}
                        placeholderText='Add a lineage'
                    />
                    {defaultPanel.length > 0 && (
                        <button
                            type='button'
                            className='hover:text-brand-700 mt-1 block cursor-pointer text-sm underline disabled:cursor-default disabled:text-gray-400 disabled:no-underline'
                            disabled={missingDefaultLineages.length === 0}
                            onClick={() =>
                                setPageState({
                                    ...pageState,
                                    panel: [...(pageState.panel ?? []), ...missingDefaultLineages],
                                })
                            }
                        >
                            Include default panel
                        </button>
                    )}
                </LabeledField>
            )}
            <SegmentedSelect
                label='Min. share'
                value={pageState.minShare ?? 0}
                options={MIN_SHARE_OPTIONS}
                onChange={(minShare) => setPageState({ ...pageState, minShare })}
            />
        </>
    );
}

/**
 * Picks a known amplicon of the organism's primer scheme. `toAnchor` turns the chosen amplicon
 * into the anchor position token to use (nucleotide or gene:codon — see
 * `AminoAcidAmpliconSelect`); an amplicon it returns `null` for (no coding region under it, in the
 * amino-acid case) is shown but disabled.
 */
const AmpliconSelect: FC<{
    amplicons: NonNullable<WasapPageConfigFor<'cooccurrence'>['amplicons']>;
    toAnchor: (amplicon: Amplicon, allAmplicons: Amplicon[]) => string | null;
    value: string | undefined;
    onChange: (value: string) => void;
}> = ({ amplicons: ampliconsConfig, toAnchor, value, onChange }) => {
    const { data: amplicons, isPending, isError } = useAmplicons(ampliconsConfig);

    if (isPending) {
        return (
            <LabeledField label='Amplicon'>
                <span className='text-sm text-gray-500'>Loading the primer scheme…</span>
            </LabeledField>
        );
    }
    if (isError || amplicons.length === 0) {
        return (
            <LabeledField label='Amplicon'>
                <span className='text-sm text-red-600'>Could not load the primer scheme.</span>
            </LabeledField>
        );
    }

    const selected = amplicons.find((amplicon) => value !== undefined && toAnchor(amplicon, amplicons) === value);

    return (
        <LabeledField label='Amplicon'>
            <select
                className='select select-bordered w-full'
                value={selected?.number ?? ''}
                onChange={(event) => {
                    const amplicon = amplicons.find((candidate) => candidate.number === Number(event.target.value));
                    const anchor = amplicon !== undefined ? toAnchor(amplicon, amplicons) : null;
                    if (anchor !== null) {
                        onChange(anchor);
                    }
                }}
            >
                <option value='' disabled>
                    Select an amplicon
                </option>
                {amplicons.map((amplicon) => {
                    const anchor = toAnchor(amplicon, amplicons);
                    return (
                        <option key={amplicon.number} value={amplicon.number} disabled={anchor === null}>
                            Amplicon {amplicon.number} ({amplicon.insertStart.toLocaleString()}–
                            {amplicon.insertEnd.toLocaleString()}){anchor === null ? ' — no coding region' : ''}
                        </option>
                    );
                })}
            </select>
        </LabeledField>
    );
};

/** `AmpliconSelect`, anchoring on the gene:codon of each amplicon's core midpoint. */
const AminoAcidAmpliconSelect: FC<{
    amplicons: NonNullable<WasapPageConfigFor<'cooccurrence'>['amplicons']>;
    genomeAnnotationUrl: string;
    value: string | undefined;
    onChange: (value: string) => void;
}> = ({ amplicons, genomeAnnotationUrl, value, onChange }) => {
    const { data: genes, isPending, isError } = useGeneAnnotation(genomeAnnotationUrl);

    if (isPending) {
        return (
            <LabeledField label='Amplicon'>
                <span className='text-sm text-gray-500'>Loading the gene annotation…</span>
            </LabeledField>
        );
    }
    if (isError) {
        return (
            <LabeledField label='Amplicon'>
                <span className='text-sm text-red-600'>Could not load the gene annotation.</span>
            </LabeledField>
        );
    }

    return (
        <AmpliconSelect
            amplicons={amplicons}
            toAnchor={(amplicon, allAmplicons) => {
                const [position] = samplingPositions(amplicon, allAmplicons, 1);
                const anchor = codonAnchorFor(position, genes);
                return anchor === null ? null : `${anchor.segment}:${anchor.position}`;
            }}
            value={value}
            onChange={onChange}
        />
    );
};

/** A single bare position, e.g. `501` (nucleotide) or `S:501` (amino acid) — see `parsePositionToken`. */
const AnchorPositionInput: FC<{
    sequenceType: SequenceType;
    value: string | undefined;
    onChange: (value: string) => void;
}> = ({ sequenceType, value, onChange }) => {
    const [inputValue, setInputValue] = useState(value ?? '');
    const [showErrorIndicator, setShowErrorIndicator] = useState(false);

    const commit = (raw: string) => {
        const parsed = parsePositionToken(raw, sequenceType);
        if (parsed === null) {
            setShowErrorIndicator(raw.trim() !== '');
            return;
        }
        setInputValue(parsed.label);
        setShowErrorIndicator(false);
        onChange(parsed.label);
    };

    return (
        <LabeledField label='Anchor position'>
            <input
                className={`input input-bordered w-full ${showErrorIndicator ? 'input-error' : ''}`}
                placeholder={sequenceType === 'nucleotide' ? 'e.g. 23403' : 'e.g. S:501'}
                value={inputValue}
                onChange={(event) => {
                    setInputValue(event.target.value);
                    setShowErrorIndicator(false);
                }}
                onBlur={(event) => commit(event.target.value)}
                onKeyDown={(event) => {
                    if (event.key === 'Enter') {
                        commit(inputValue);
                    }
                }}
            />
        </LabeledField>
    );
};
