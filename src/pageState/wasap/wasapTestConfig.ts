import { VARIANT_TIME_FRAME } from './wasapAnalysisFilter';
import { type WasapPageConfig } from '../../config/wasapPageConfig';

/** A page config with the manual, variant, resistance and untracked modes enabled. */
export const testConfig = {
    genSpectrumOrganismName: 'covid',
    name: 'SARS-CoV-2',
    path: `/wastewater/covid`,
    description: 'Analyze SARS-CoV-2 data that was collected by the WISE project.',
    linkTemplate: {
        nucleotideMutation:
            'https://open.cov-spectrum.org/explore/World/AllSamples/AllTimes/variants?nucMutations={{mutation}}',
        aminoAcidMutation:
            'https://open.cov-spectrum.org/explore/World/AllSamples/AllTimes/variants?aaMutations={{mutation}}',
    },
    silo: {
        url: '',
        table: 'default',
        dateColumn: 'date',
        dateColumnIsDictionaryEncoded: true,
        samplingDateColumn: 'samplingDate',
        locationNameColumn: 'locationName',
    },
    manualAnalysisModeEnabled: true,
    variantAnalysisModeEnabled: true,
    resistanceAnalysisModeEnabled: true,
    untrackedAnalysisModeEnabled: true,
    resistanceMutationCollections: [
        {
            name: '3CLpro',
            annotationSymbol: 'c',
            description: '',
            collectionId: 1,
        },
        {
            name: 'RdRp',
            annotationSymbol: 'r',
            description: '',
            collectionId: 2,
        },
        {
            name: 'Spike',
            annotationSymbol: 's',
            description: '',
            collectionId: 3,
        },
    ],
    lapisBaseUrl: 'https://lapis.wasap.genspectrum.org',
    samplingDateField: 'samplingDate',
    locationNameField: 'locationName',
    clinicalLapis: {
        lapisBaseUrl: 'https://lapis.cov-spectrum.org/open/v2',
        cladeField: 'nextstrainClade',
        lineageField: 'nextcladePangoLineage',
        dateField: 'date',
    },
    browseDataUrl: 'https://db.wasap.genspectrum.org/covid/search',
    browseDataDescription: 'Browse the data in the W-ASAP Loculus instance.',
    defaultLocationName: 'Zürich (ZH)',
    clinicalSequenceCountWarningThreshold: 50,
    filterDefaults: {
        manual: {
            mode: 'manual',
            sequenceType: 'nucleotide',
            mutations: undefined,
        },
        variant: {
            mode: 'variant',
            signatureType: 'computed',
            sequenceType: 'nucleotide',
            variant: 'XFG*',
            minProportion: 0.8,
            minCount: 15,
            minJaccard: 0.75,
            timeFrame: VARIANT_TIME_FRAME.all,
        },
        resistance: {
            mode: 'resistance',
            sequenceType: 'amino acid',
            resistanceSet: '3CLpro',
        },
        untracked: {
            mode: 'untracked',
            sequenceType: 'nucleotide',
            excludeSet: 'predefined',
        },
    },
} satisfies WasapPageConfig;

/** Like `testConfig`, with the CovSpectrum collection mode enabled as well. */
export const testConfigWithCollection = {
    ...testConfig,
    covSpectrumCollectionAnalysisModeEnabled: true,
    collectionsApiBaseUrl: 'https://collections.example.org',
    collectionTitleFilter: 'test',
    filterDefaults: {
        ...testConfig.filterDefaults,
        covSpectrumCollection: {
            mode: 'covSpectrumCollection',
            collectionId: undefined,
        },
    },
} satisfies WasapPageConfig;
