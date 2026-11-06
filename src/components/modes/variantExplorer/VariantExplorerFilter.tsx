import { useId } from 'react';

import { type LineageTree } from '../../../externalData/fileBased/lineageTree/lineageTree';
import {
    predefinedLineage,
    VARIANT_TIME_FRAME,
    variantTimeFrameLabel,
    type SignatureType,
    type VariantTimeFrame,
    type VariantAnalysis,
} from '../../../pageState/analysisFilter';
import { FilterSection } from '../../filterSidebar/FilterSection';
import {
    ClinicalVariantInfo,
    DefineClinicalSignatureInfo,
    MinCountInfo,
    MinJaccardInfo,
    MinProportionInfo,
    TimeFrameInfo,
    TreeVariantInfo,
} from '../../filterSidebar/InfoBlocks';
import { LabeledField } from '../../inputs/LabeledField';
import { LineageTreeCombobox } from '../../inputs/LineageTreeCombobox';
import { NumericInput } from '../../inputs/NumericInput';
import { SequenceTypeSelector } from '../../inputs/SequenceTypeSelector';
import { TabbedPanel } from '../../inputs/TabbedPanel';
import { LineageFilter } from '../../inputs/lineageFilter/LineageFilter';
import { HoverTooltip } from '../../ui/HoverTooltip';

interface VariantExplorerFilterProps {
    pageState: VariantAnalysis;
    setPageState: (newState: VariantAnalysis) => void;
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
            {lineageTree !== undefined ? (
                <FilterSection
                    title='Variant definition'
                    info={pageState.signatureType === 'computed' ? <DefineClinicalSignatureInfo /> : undefined}
                >
                    <TabbedPanel<SignatureType>
                        label='Variant definition source'
                        value={pageState.signatureType}
                        options={[
                            { value: 'predefined', label: 'Nextclade' },
                            { value: 'computed', label: 'Clinical sequences' },
                        ]}
                        onChange={handleSignatureTypeChange}
                    >
                        {pageState.signatureType === 'predefined' ? (
                            <PredefinedSignature
                                pageState={pageState}
                                setPageState={setPageState}
                                lineageTree={lineageTree}
                            />
                        ) : (
                            <ComputedSignature
                                pageState={pageState}
                                setPageState={setPageState}
                                clinicalSequenceLapisBaseUrl={clinicalSequenceLapisBaseUrl}
                                clinicalSequenceLapisLineageField={clinicalSequenceLapisLineageField}
                            />
                        )}
                    </TabbedPanel>
                </FilterSection>
            ) : (
                pageState.signatureType === 'computed' && (
                    <FilterSection title='Variant definition' info={<DefineClinicalSignatureInfo />}>
                        <ComputedSignature
                            pageState={pageState}
                            setPageState={setPageState}
                            clinicalSequenceLapisBaseUrl={clinicalSequenceLapisBaseUrl}
                            clinicalSequenceLapisLineageField={clinicalSequenceLapisLineageField}
                        />
                    </FilterSection>
                )
            )}
            {lineageTree !== undefined && (
                <FilterSection title='Excluded mutations' info={<ExcludeMutationsInfo />}>
                    <CheckboxWithTooltip
                        checked={pageState.excludeNearlyFixed !== false}
                        onChange={(checked) => setPageState({ ...pageState, excludeNearlyFixed: checked })}
                        tooltip='Mutations with a mean proportion of 99% or more over the time range'
                        label='Exclude mutations on ≥99% of reads'
                    />
                    <CheckboxWithTooltip
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
                </FilterSection>
            )}
        </>
    );
}

function ExcludeMutationsInfo() {
    return (
        <div className='w-96 max-w-full space-y-2 text-sm font-normal text-gray-700'>
            <p className='text-gray-500 italic'>
                Leaves some of the variant&apos;s mutations out of the panels. They are listed under Excluded mutations
                at the bottom of the page.
            </p>
            <p>
                Use a background lineage for a lineage the variant descends from that is also circulating: the mutations
                they share can&apos;t tell the two apart.
            </p>
        </div>
    );
}

function PredefinedSignature({
    pageState,
    setPageState,
    lineageTree,
}: {
    pageState: VariantAnalysis;
    setPageState: (newState: VariantAnalysis) => void;
    lineageTree: LineageTree;
}) {
    return (
        <>
            <LabeledField label='Variant' info={<TreeVariantInfo />}>
                <LineageTreeCombobox
                    lineageTree={lineageTree}
                    value={predefinedLineage(pageState.variant)}
                    onChange={(variant) => setPageState({ ...pageState, variant })}
                />
            </LabeledField>
            <CheckboxWithTooltip
                checked={pageState.newMutationsOnly ?? false}
                onChange={(checked) => setPageState({ ...pageState, newMutationsOnly: checked })}
                tooltip='Only show mutations that were not observed in the parent variant'
                label='Mutation not in parent'
            />
            <div className='mt-4'>
                <NumericInput
                    label='Min. Jaccard index'
                    info={<MinJaccardInfo />}
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
        </>
    );
}
function ComputedSignature({
    pageState,
    setPageState,
    clinicalSequenceLapisBaseUrl,
    clinicalSequenceLapisLineageField,
}: {
    pageState: VariantAnalysis;
    setPageState: (newState: VariantAnalysis) => void;
    clinicalSequenceLapisBaseUrl: string;
    clinicalSequenceLapisLineageField: string;
}) {
    return (
        <>
            <LabeledField label='Variant' info={<ClinicalVariantInfo />}>
                <LineageFilter
                    lapisUrl={clinicalSequenceLapisBaseUrl}
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
            </LabeledField>
            <div className='mb-2'>
                <NumericInput
                    label='Min. proportion'
                    info={<MinProportionInfo />}
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
                    info={<MinCountInfo />}
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
                    info={<MinJaccardInfo />}
                    value={pageState.minJaccard}
                    min={0}
                    max={1}
                    step={0.01}
                    onChange={(v) => setPageState({ ...pageState, minJaccard: v })}
                />
            </div>
            <LabeledField label='Time frame' info={<TimeFrameInfo />}>
                <select
                    className='select'
                    value={pageState.timeFrame}
                    onChange={(e) => setPageState({ ...pageState, timeFrame: e.target.value as VariantTimeFrame })}
                >
                    <option value={VARIANT_TIME_FRAME.all}>{variantTimeFrameLabel(VARIANT_TIME_FRAME.all)}</option>
                    <option value={VARIANT_TIME_FRAME.sixMonths}>
                        Past {variantTimeFrameLabel(VARIANT_TIME_FRAME.sixMonths)}
                    </option>
                    <option value={VARIANT_TIME_FRAME.threeMonths}>
                        Past {variantTimeFrameLabel(VARIANT_TIME_FRAME.threeMonths)}
                    </option>
                </select>
            </LabeledField>
        </>
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
            <HoverTooltip
                className='inline'
                placement='right'
                content={<p className='w-64 max-w-full text-sm font-normal text-gray-700'>{tooltip}</p>}
            >
                <label htmlFor={id} className='cursor-pointer pl-2'>
                    {label}
                </label>
            </HoverTooltip>
        </div>
    );
}
