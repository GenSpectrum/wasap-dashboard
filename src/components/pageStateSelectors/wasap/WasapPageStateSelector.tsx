import { useQuery } from '@tanstack/react-query';
import { type Dispatch, type SetStateAction, useState } from 'react';

import { getApiServiceForClientside } from '../../../externalData/genSpectrum/apiService';
import { getCollections } from '../../../externalData/genSpectrum/getCollections';
import { getCladeLineages } from '../../../externalData/lapis/getCladeLineages';
import { ApplyFilterButton } from '../ApplyFilterButton';
import { useRegisterAnalysisModeBar } from './AnalysisModeBarContext';
import { CollectionAnalysisFilter } from './filters/CollectionAnalysisFilter';
import { CovSpectrumCollectionAnalysisFilter } from './filters/CovSpectrumCollectionAnalysisFilter';
import { ManualAnalysisFilter } from './filters/ManualAnalysisFilter';
import { ResistanceMutationsFilter } from './filters/ResistanceMutationsFilter';
import { UntrackedFilter } from './filters/UntrackedFilter';
import { VariantExplorerFilter } from './filters/VariantExplorerFilter';
import { LabeledField } from './utils/LabeledField';
import { enabledAnalysisModes, type WasapPageConfig } from '../../../config/wasapPageConfig';
import { type PageStateHandler } from '../../../pageState/PageStateHandler';
import {
    type WasapAnalysisFilter,
    type WasapBaseFilter,
    type WasapFilter,
} from '../../../pageState/wasap/wasapAnalysisFilter';
import { type ProportionInterval, ProportionSelector } from '../../shared/proportion-selector';

/**
 * The root filter control for the W-ASAP dashboard.
 * Uses sub filter components for the different modes, in the 'filters' directory.
 *
 * Location / date-range / granularity controls live above the plot now
 * (`BaseFilterControls`, rendered by `WasapPage`) — `baseFilterState` is owned
 * there and passed down so `getMergedPageState` can still fold it into the
 * merged filter on Apply. Mean proportion is similarly owned by `WasapPage`
 * (it's a live control, not part of the URL-persisted analysis draft), but
 * rendered here so it's visible regardless of which mode is selected.
 */
export function WasapPageStateSelector({
    config,
    resistanceSetNames,
    pageStateHandler,
    baseFilterState,
    initialAnalysisFilterState,
    setPageState,
    meanProportionInterval,
    setMeanProportionInterval,
}: {
    config: WasapPageConfig;
    resistanceSetNames: string[];
    pageStateHandler: PageStateHandler<WasapFilter>;
    baseFilterState: WasapBaseFilter;
    initialAnalysisFilterState: WasapAnalysisFilter;
    setPageState: Dispatch<SetStateAction<WasapFilter>>;
    meanProportionInterval: ProportionInterval;
    setMeanProportionInterval: Dispatch<SetStateAction<ProportionInterval>>;
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

    const [selectedAnalysisMode, setSelectedAnalysisMode] = useState(initialAnalysisFilterState.mode);

    // Mode selection is rendered as buttons in the header (AppShell) instead of
    // the dropdown that used to live here, so it's always visible. This state
    // stays the source of truth; the header just gets to read and set it.
    useRegisterAnalysisModeBar({
        mode: selectedAnalysisMode,
        setMode: setSelectedAnalysisMode,
        availableModes: enabledAnalysisModes(config),
    });

    function getMergedPageState(): WasapFilter {
        // We're using the ! below because we know that for the selected mode we have a defined state.
        // based on the initialization in useAnalysisFilterStates

        switch (selectedAnalysisMode) {
            case 'manual':
                return { base: baseFilterState, analysis: manualFilter! };
            case 'variant':
                return { base: baseFilterState, analysis: variantFilter! };
            case 'resistance':
                return { base: baseFilterState, analysis: resistanceFilter! };
            case 'untracked':
                return { base: baseFilterState, analysis: untrackedFilter! };
            case 'covSpectrumCollection':
                return { base: baseFilterState, analysis: covSpectrumCollectionFilter! };
            case 'collection':
                return { base: baseFilterState, analysis: collectionFilter! };
        }
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
            <LabeledField label='Mean proportion'>
                <ProportionSelector
                    proportionInterval={meanProportionInterval}
                    setMinProportion={(min) => setMeanProportionInterval((prev) => ({ ...prev, min }))}
                    setMaxProportion={(max) => setMeanProportionInterval((prev) => ({ ...prev, max }))}
                />
            </LabeledField>
            <ApplyFilterButton
                pageStateHandler={pageStateHandler}
                newPageState={getMergedPageState()}
                setPageState={setPageState}
            />
        </div>
    );
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
