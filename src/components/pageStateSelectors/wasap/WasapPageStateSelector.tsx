import { useQuery } from '@tanstack/react-query';
import { type Dispatch, type SetStateAction, useState } from 'react';

import { getApiServiceForClientside } from '../../../externalData/genSpectrum/apiService';
import { getCollections } from '../../../externalData/genSpectrum/getCollections';
import { getCladeLineages } from '../../../externalData/lapis/getCladeLineages';
import { ApplyFilterButton } from '../ApplyFilterButton';
import { SelectorHeadline } from '../SelectorHeadline';
import { ExplorationModeInfo } from './InfoBlocks';
import { CollectionAnalysisFilter } from './filters/CollectionAnalysisFilter';
import { CovSpectrumCollectionAnalysisFilter } from './filters/CovSpectrumCollectionAnalysisFilter';
import { ManualAnalysisFilter } from './filters/ManualAnalysisFilter';
import { ResistanceMutationsFilter } from './filters/ResistanceMutationsFilter';
import { UntrackedFilter } from './filters/UntrackedFilter';
import { VariantExplorerFilter } from './filters/VariantExplorerFilter';
import { MeanProportionField } from './utils/MeanProportionField';
import { enabledAnalysisModes, type WasapPageConfig } from '../../../config/wasapPageConfig';
import { type PageStateHandler } from '../../../pageState/PageStateHandler';
import { getDefaultMeanProportion } from '../../../pageState/wasap/defaultMeanProportion';
import {
    type WasapAnalysisFilter,
    type WasapAnalysisMode,
    type WasapBaseFilter,
    type WasapFilter,
    type WasapMeanProportion,
} from '../../../pageState/wasap/wasapAnalysisFilter';
import { modeLabel } from '../../../pageState/wasap/wasapModes';
import { Inset } from '../../shared/Inset';

/**
 * The root filter control for the W-ASAP dashboard.
 * Uses sub filter components for the different modes, in the 'filters' directory.
 */
export function WasapPageStateSelector({
    config,
    resistanceSetNames,
    pageStateHandler,
    baseFilter,
    initialAnalysisFilterState,
    setPageState,
    onModeChange,
}: {
    config: WasapPageConfig;
    resistanceSetNames: string[];
    pageStateHandler: PageStateHandler<WasapFilter>;
    /** The applied base filter, which the panel leaves as it is (it has its own panel). */
    baseFilter: WasapBaseFilter;
    initialAnalysisFilterState: WasapAnalysisFilter;
    setPageState: Dispatch<SetStateAction<WasapFilter>>;
    /** Called as soon as another mode is picked, which is a different page. */
    onModeChange: (mode: WasapAnalysisMode) => void;
}) {
    // State for each individual analysis mode setting component
    const {
        manualFilter,
        setManualFilter,
        variantFilter,
        setVariantFilter,
        resistanceFilter,
        setResistanceFilter,
        untrackedFilter,
        setUntrackedFilter,
        covSpectrumCollectionFilter,
        setCovSpectrumCollectionFilter,
        collectionFilter,
        setCollectionFilter,
    } = useAnalysisFilterStates(initialAnalysisFilterState, config);

    const selectedAnalysisMode = initialAnalysisFilterState.mode;

    function getAnalysisFilter(): WasapAnalysisFilter {
        // We're using the ! below because we know that for the selected mode we have a defined state.
        // based on the initialization in useAnalysisFilterStates

        switch (selectedAnalysisMode) {
            case 'manual':
                return manualFilter!;
            case 'variant':
                return variantFilter!;
            case 'resistance':
                return resistanceFilter!;
            case 'untracked':
                return untrackedFilter!;
            case 'covSpectrumCollection':
                return covSpectrumCollectionFilter!;
            case 'collection':
                return collectionFilter!;
        }
    }

    // Until the user touches the mean proportion control it follows the default of the selected mode
    // (which can change with the mode, or with the manually entered mutations), so we only keep an
    // explicit value once they have changed it.
    const [meanProportionOverride, setMeanProportionOverride] = useState<WasapMeanProportion | undefined>(
        isDefaultMeanProportion(baseFilter.meanProportion, initialAnalysisFilterState)
            ? undefined
            : baseFilter.meanProportion,
    );

    function getMergedPageState(): WasapFilter {
        const analysis = getAnalysisFilter();
        const meanProportion = meanProportionOverride ?? getDefaultMeanProportion(analysis);
        return { base: { ...baseFilter, meanProportion }, analysis };
    }

    // data for the 'untracked' analysis mode - loaded here already so it's available when the mode is selected
    const cladeLineageQueryResult = useQuery({
        enabled: config.untrackedAnalysisModeEnabled,
        // Keyed on the clinical-LAPIS coordinates the query actually targets, not
        // just 'cladeLineages' — this component doesn't remount on organism switch.
        queryKey: [
            'cladeLineages',
            config.untrackedAnalysisModeEnabled,
            config.untrackedAnalysisModeEnabled ? config.clinicalLapis.lapisBaseUrl : null,
            config.untrackedAnalysisModeEnabled ? config.clinicalLapis.cladeField : null,
            config.untrackedAnalysisModeEnabled ? config.clinicalLapis.lineageField : null,
        ],
        queryFn: () => {
            if (!config.untrackedAnalysisModeEnabled) {
                throw Error(
                    "This clade lineage query was called despite 'untracked' mode being disabled. This should not happen.",
                );
            }
            return getCladeLineages(
                config.clinicalLapis.lapisBaseUrl,
                config.clinicalLapis.cladeField,
                config.clinicalLapis.lineageField,
                true,
            );
        },
    });

    const predefinedVariantsQueryResult = useQuery({
        enabled: config.variantAnalysisModeEnabled && config.predefinedVariantsSource !== undefined,
        queryKey: [
            'predefinedVariants',
            config.variantAnalysisModeEnabled && config.predefinedVariantsSource,
            config.genSpectrumOrganismName,
        ],
        queryFn: async () => {
            if (!config.variantAnalysisModeEnabled || config.predefinedVariantsSource === undefined) {
                throw Error(
                    'This predefined variants query was called despite it being disabled. This should not happen.',
                );
            }
            const { collectionsUserId, collectionsTag } = config.predefinedVariantsSource;
            return getCollections(getApiServiceForClientside(), {
                userId: collectionsUserId,
                organism: config.genSpectrumOrganismName,
                tags: collectionsTag,
            });
        },
    });

    return (
        <div className='flex flex-col gap-4'>
            <SelectorHeadline info={<ExplorationModeInfo />}>Mutation selection</SelectorHeadline>

            <select
                className='select select-bordered'
                value={selectedAnalysisMode}
                onChange={(e) => {
                    onModeChange(e.target.value as WasapAnalysisMode);
                }}
            >
                {enabledAnalysisModes(config).map((mode) => (
                    <option key={mode} value={mode}>
                        {modeLabel(mode)}
                    </option>
                ))}
            </select>
            <Inset className='p-2'>
                {(() => {
                    switch (selectedAnalysisMode) {
                        case 'manual':
                            if (!config.manualAnalysisModeEnabled || manualFilter === undefined) {
                                throw Error("'manual' mode selected, but it isn't enabled.");
                            }
                            return <ManualAnalysisFilter pageState={manualFilter} setPageState={setManualFilter} />;
                        case 'variant':
                            if (!config.variantAnalysisModeEnabled || variantFilter === undefined) {
                                throw Error("'variant' mode selected, but it isn't enabled.");
                            }
                            return (
                                <VariantExplorerFilter
                                    pageState={variantFilter}
                                    setPageState={setVariantFilter}
                                    clinicalSequenceLapisBaseUrl={config.clinicalLapis.lapisBaseUrl}
                                    clinicalSequenceLapisLineageField={config.clinicalLapis.lineageField}
                                    predefinedVariantsQueryResult={
                                        config.predefinedVariantsSource !== undefined
                                            ? predefinedVariantsQueryResult
                                            : undefined
                                    }
                                    predefinedVariantsLabel={config.predefinedVariantsSource?.variantSourceLabel}
                                />
                            );
                        case 'resistance':
                            if (!config.resistanceAnalysisModeEnabled || resistanceFilter === undefined) {
                                throw Error("'resistance' mode selected, but it isn't enabled.");
                            }
                            return (
                                <ResistanceMutationsFilter
                                    pageState={resistanceFilter}
                                    setPageState={setResistanceFilter}
                                    resistanceSetNames={resistanceSetNames}
                                />
                            );
                        case 'untracked':
                            if (!config.untrackedAnalysisModeEnabled || untrackedFilter === undefined) {
                                throw Error("'untracked' mode selected, but it isn't enabled.");
                            }
                            return (
                                <UntrackedFilter
                                    pageState={untrackedFilter}
                                    setPageState={setUntrackedFilter}
                                    clinicalSequenceLapisBaseUrl={config.clinicalLapis.lapisBaseUrl}
                                    clinicalSequenceLapisLineageField={config.clinicalLapis.lineageField}
                                    cladeLineageQueryResult={cladeLineageQueryResult}
                                />
                            );
                        case 'covSpectrumCollection':
                            if (
                                !config.covSpectrumCollectionAnalysisModeEnabled ||
                                covSpectrumCollectionFilter === undefined
                            ) {
                                throw Error("'covSpectrumCollection' mode selected, but it isn't enabled.");
                            }
                            return (
                                <CovSpectrumCollectionAnalysisFilter
                                    pageState={covSpectrumCollectionFilter}
                                    setPageState={setCovSpectrumCollectionFilter}
                                    collectionsApiBaseUrl={config.collectionsApiBaseUrl}
                                    collectionTitleFilter={config.collectionTitleFilter}
                                />
                            );
                        case 'collection':
                            if (!config.collectionAnalysisModeEnabled || collectionFilter === undefined) {
                                throw Error("'collection' mode selected, but it isn't enabled.");
                            }
                            return (
                                <CollectionAnalysisFilter
                                    pageState={collectionFilter}
                                    setPageState={setCollectionFilter}
                                    organism={config.genSpectrumOrganismName}
                                />
                            );
                    }
                })()}
                <div className='h-2' />
                <MeanProportionField
                    value={meanProportionOverride ?? getDefaultMeanProportion(getAnalysisFilter())}
                    onChange={setMeanProportionOverride}
                />
            </Inset>
            <ApplyFilterButton
                pageStateHandler={pageStateHandler}
                newPageState={getMergedPageState()}
                setPageState={setPageState}
            />
        </div>
    );
}

function isDefaultMeanProportion(meanProportion: WasapMeanProportion, analysis: WasapAnalysisFilter): boolean {
    const defaults = getDefaultMeanProportion(analysis);
    return meanProportion.lower === defaults.lower && meanProportion.upper === defaults.upper;
}

/**
 * States for each analysis filter component.
 * For the analysis mode that is given in the initial filter settings, the given values are used.
 * Else, the default filter values from the `config` are used.
 */
function useAnalysisFilterStates(initialFilter: WasapAnalysisFilter, config: WasapPageConfig) {
    const [manualFilter, setManualFilter] = useState(
        initialFilter.mode === 'manual'
            ? initialFilter
            : config.manualAnalysisModeEnabled
              ? config.filterDefaults.manual
              : undefined,
    );
    const [variantFilter, setVariantFilter] = useState(
        initialFilter.mode === 'variant'
            ? initialFilter
            : config.variantAnalysisModeEnabled
              ? config.filterDefaults.variant
              : undefined,
    );
    const [resistanceFilter, setResistanceFilter] = useState(
        initialFilter.mode === 'resistance'
            ? initialFilter
            : config.resistanceAnalysisModeEnabled
              ? config.filterDefaults.resistance
              : undefined,
    );
    const [untrackedFilter, setUntrackedFilter] = useState(
        initialFilter.mode === 'untracked'
            ? initialFilter
            : config.untrackedAnalysisModeEnabled
              ? config.filterDefaults.untracked
              : undefined,
    );
    const [covSpectrumCollectionFilter, setCovSpectrumCollectionFilter] = useState(
        initialFilter.mode === 'covSpectrumCollection'
            ? initialFilter
            : config.covSpectrumCollectionAnalysisModeEnabled
              ? config.filterDefaults.covSpectrumCollection
              : undefined,
    );
    const [collectionFilter, setCollectionFilter] = useState(
        initialFilter.mode === 'collection'
            ? initialFilter
            : config.collectionAnalysisModeEnabled
              ? config.filterDefaults.collection
              : undefined,
    );

    return {
        manualFilter,
        setManualFilter,
        variantFilter,
        setVariantFilter,
        resistanceFilter,
        setResistanceFilter,
        untrackedFilter,
        setUntrackedFilter,
        covSpectrumCollectionFilter,
        setCovSpectrumCollectionFilter,
        collectionFilter,
        setCollectionFilter,
    };
}
