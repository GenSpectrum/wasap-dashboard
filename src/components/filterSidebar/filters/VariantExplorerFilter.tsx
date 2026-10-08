import { useId } from 'react';

import { LapisClientProvider } from '../../../externalData/lapis/LapisClientContext';
import { type LineageTree } from '../../../lineageTree/lineageTree';
import {
    VARIANT_TIME_FRAME,
    variantTimeFrameLabel,
    type SignatureType,
    type VariantTimeFrame,
    type WasapVariantFilter,
} from '../../../pageState/wasap/wasapAnalysisFilter';
import { DefineClinicalSignatureInfo } from '../../InfoBlocks';
import { LabeledField } from '../../inputs/LabeledField';
import { LineageTreeCombobox } from '../../inputs/LineageTreeCombobox';
import { NumericInput } from '../../inputs/NumericInput';
import { SequenceTypeSelector } from '../../inputs/SequenceTypeSelector';
import { LineageFilter } from '../../inputs/lineageFilter/lineage-filter';
import { Inset } from '../../shared/Inset';
import { SelectorHeadline } from '../SelectorHeadline';

interface VariantExplorerFilterProps {
    pageState: WasapVariantFilter;
    setPageState: (newState: WasapVariantFilter) => void;
    /**
     * The LAPIS base URL for the clinical sequence data used in the variant selector.
     * This is _not_ the same as the LAPIS providing the wastewater amplicon sequences.
     */
    clinicalSequenceLapisBaseUrl: string;
    clinicalSequenceLapisLineageField: string;
    /** The predefined signatures come from it; without it, there are only the computed ones. */
    lineageTree: LineageTree | undefined;
}

export function VariantExplorerFilter({
    pageState,
    setPageState,
    clinicalSequenceLapisBaseUrl,
    clinicalSequenceLapisLineageField,
    lineageTree,
}: VariantExplorerFilterProps) {
    const handleSignatureTypeChange = (newType: SignatureType) => {
        setPageState({ ...pageState, signatureType: newType });
    };

    return (
        <>
            <SequenceTypeSelector
                value={pageState.sequenceType}
                onChange={(sequenceType) => setPageState({ ...pageState, sequenceType })}
            />
            {lineageTree !== undefined && (
                <LabeledField label='Variant definition source'>
                    <select
                        className='select select-bordered'
                        value={pageState.signatureType}
                        onChange={(e) => handleSignatureTypeChange(e.target.value as SignatureType)}
                    >
                        <option value='predefined'>Nextclade</option>
                        <option value='computed'>Extracted from clinical sequences</option>
                    </select>
                </LabeledField>
            )}
            {pageState.signatureType === 'predefined' && lineageTree !== undefined && (
                <PredefinedSignature pageState={pageState} setPageState={setPageState} lineageTree={lineageTree} />
            )}
            {pageState.signatureType === 'computed' && (
                <Inset className='p-2'>
                    <SelectorHeadline info={<DefineClinicalSignatureInfo />}>
                        Define Clinical Signature
                    </SelectorHeadline>
                    <LabeledField label='Variant'>
                        <LapisClientProvider url={clinicalSequenceLapisBaseUrl}>
                            <LineageFilter
                                field={clinicalSequenceLapisLineageField}
                                placeholderText='Variant'
                                value={pageState.variant}
                                onLineageChange={(lineages) => {
                                    setPageState({
                                        ...pageState,
                                        variant: lineages[clinicalSequenceLapisLineageField],
                                    });
                                }}
                                hideCounts={true}
                            />
                        </LapisClientProvider>
                    </LabeledField>
                    <div className='mb-2'>
                        <NumericInput
                            label='Min. proportion'
                            value={pageState.minProportion}
                            min={0}
                            max={1}
                            step={0.01}
                            onChange={(v) => setPageState({ ...pageState, minProportion: v })}
                        />
                    </div>
                    <div className='mb-2'>
                        <NumericInput
                            label='Min. count'
                            value={pageState.minCount}
                            min={1}
                            max={250}
                            step={1}
                            onChange={(v) => setPageState({ ...pageState, minCount: Math.round(v) })}
                        />
                    </div>
                    <div className='mb-2'>
                        <NumericInput
                            label='Min. Jaccard index'
                            value={pageState.minJaccard}
                            min={0}
                            max={1}
                            step={0.01}
                            onChange={(v) => setPageState({ ...pageState, minJaccard: v })}
                        />
                    </div>
                    <LabeledField label='Time frame'>
                        <select
                            className='select select-bordered'
                            value={pageState.timeFrame}
                            onChange={(e) =>
                                setPageState({ ...pageState, timeFrame: e.target.value as VariantTimeFrame })
                            }
                        >
                            <option value={VARIANT_TIME_FRAME.all}>
                                {variantTimeFrameLabel(VARIANT_TIME_FRAME.all)}
                            </option>
                            <option value={VARIANT_TIME_FRAME.sixMonths}>
                                Past {variantTimeFrameLabel(VARIANT_TIME_FRAME.sixMonths)}
                            </option>
                            <option value={VARIANT_TIME_FRAME.threeMonths}>
                                Past {variantTimeFrameLabel(VARIANT_TIME_FRAME.threeMonths)}
                            </option>
                        </select>
                    </LabeledField>
                </Inset>
            )}
            {lineageTree !== undefined && (
                <Inset className='p-2'>
                    <SelectorHeadline info={<ExcludeMutationsInfo />}>Exclude mutations</SelectorHeadline>
                    <CheckboxWithTooltip
                        className='pb-2'
                        checked={pageState.excludeNearlyFixed !== false}
                        onChange={(checked) => setPageState({ ...pageState, excludeNearlyFixed: checked })}
                        tooltip='Mutations with a mean proportion of 99% or more over the time range'
                        label='Exclude mutations on ≥99% of reads'
                    />
                    <CheckboxWithTooltip
                        className='pb-2'
                        checked={pageState.excludeDeletions !== false}
                        onChange={(checked) => setPageState({ ...pageState, excludeDeletions: checked })}
                        tooltip='Deletions are called less reliably on the reads (alignment, read ends)'
                        label='Exclude deletions'
                    />
                    <LabeledField label='Background lineages'>
                        <LineageTreeCombobox
                            lineageTree={lineageTree}
                            multiSelect={true}
                            value={pageState.backgroundLineages ?? []}
                            onChange={(backgroundLineages) => setPageState({ ...pageState, backgroundLineages })}
                            placeholderText='Add a lineage'
                        />
                    </LabeledField>
                </Inset>
            )}
        </>
    );
}

function ExcludeMutationsInfo() {
    return (
        <div className='w-96 space-y-2 text-sm font-normal text-gray-700'>
            <p>
                Mutations left out of the variant&apos;s as the background it stands on, rather than what tells it
                apart. They are listed at the bottom of the page.
            </p>
            <p>
                Those on 99% or more of the reads (their mean proportion over the time range) tell nothing about how
                much of the variant there is. Those in the signature of a background lineage (all of its mutations
                against the reference, from the Nextclade tree) are shared with it.
            </p>
            <p>
                Deletions are hard to call on the reads: they can be aligned differently than in the clinical sequences,
                and a read ending in one looks like it.
            </p>
        </div>
    );
}

function PredefinedSignature({
    pageState,
    setPageState,
    lineageTree,
}: {
    pageState: WasapVariantFilter;
    setPageState: (newState: WasapVariantFilter) => void;
    lineageTree: LineageTree;
}) {
    return (
        <Inset className='p-2'>
            <LabeledField label='Variant'>
                <LineageTreeCombobox
                    lineageTree={lineageTree}
                    value={pageState.lineage}
                    onChange={(lineage) => setPageState({ ...pageState, lineage })}
                />
            </LabeledField>
            <CheckboxWithTooltip
                className='pt-2'
                checked={pageState.newMutationsOnly ?? false}
                onChange={(checked) => setPageState({ ...pageState, newMutationsOnly: checked })}
                tooltip='Only show mutations that were not observed in the parent variant'
                label='Mutation not in parent'
            />
            <div className='mt-4'>
                <NumericInput
                    label='Min. Jaccard index'
                    value={pageState.minJaccard}
                    min={0}
                    max={1}
                    step={0.01}
                    onChange={(v) => setPageState({ ...pageState, minJaccard: v })}
                />
            </div>
            <CheckboxWithTooltip
                checked={pageState.includeSublineagesForJaccard !== false}
                onChange={(checked) => setPageState({ ...pageState, includeSublineagesForJaccard: checked })}
                tooltip='Include sublineages when computing Jaccard index (appends * to the lineage)'
                label='Include sublineages for Jaccard computation'
            />
        </Inset>
    );
}
type CheckboxWithTooltipProps = {
    checked: boolean;
    onChange: (checked: boolean) => void;
    tooltip: string;
    label: string;
    className?: string;
};

function CheckboxWithTooltip({ checked, onChange, tooltip, label, className }: CheckboxWithTooltipProps) {
    const id = useId();
    return (
        <div className={`text-sm ${className ?? ''}`}>
            <input
                className='accent-primary'
                type='checkbox'
                id={id}
                checked={checked}
                onChange={(e) => onChange(e.target.checked)}
            />
            <div className='tooltip tooltip-right inline' data-tip={tooltip}>
                <label htmlFor={id} className='cursor-pointer pl-2'>
                    {label}
                </label>
            </div>
        </div>
    );
}
