import { type ReactNode } from 'react';

import { type AnalysisMode } from '../../pageState/analysisFilter';
import { BlockMath, InlineMath } from '../ui/Math';

/**
 * A text block to be put into a Modal as helper information for labeled filter fields.
 */
function InfoBlock({ title, children }: { title: string; children: React.ReactNode }) {
    return (
        <div>
            <h1 className='mb-2 text-xl font-semibold'>{title}</h1>
            {children}
        </div>
    );
}

export function KnownVariantsExclusionInfo() {
    return (
        <InfoBlock title='How It Works'>
            <p className='text-gray-700'>
                Mutations that are characteristic of selected lineages are excluded based on clinical sequences on{' '}
                <a className='link' href='https://cov-spectrum.org/'>
                    CovSpectrum
                </a>
                .
            </p>
            <p className='text-gray-700'>
                For each lineage, mutations appearing in sequences assigned to this lineage are excluded if two criteria
                are met. First, the mutation appears in at least 9 sequences; second, it appears in at least 80 % of
                sequences assigned to that lineage. This is an empirical definition of characteristic mutations. For
                each lineage, mutations appearing at least 9 times and in ≥80% of its samples are excluded.
            </p>
        </InfoBlock>
    );
}

export function DefineClinicalSignatureInfo() {
    const m = (math: string) => <InlineMath math={math} />;

    return (
        <InfoBlock title='Define Variant Signature based on Clinical Sequences from CovSpectrum'>
            <p className='text-gray-700'>
                Fetch characteristic mutations from clinical sequences assigned a given variant.
            </p>
            <p className='mt-2 text-gray-700'>
                Enter a{' '}
                <a className='link' href='https://cov-spectrum.org/'>
                    CovSpectrum
                </a>{' '}
                variant query to filter for a given Pango variant (e.g. "BA.5").
            </p>

            <h2 className='mt-4 mb-2 text-base font-semibold'>Minimum Proportion</h2>
            <p className='text-gray-700'>
                The minimum proportion threshold filters mutations based on their frequency within the selected variant.
            </p>
            <p className='mt-2 text-gray-700'>
                Only mutations that appear in at least this proportion of sequences belonging to the variant will be
                included. For example, a value of 0.8 means the mutation must appear in at least 80% of the variant's
                sequences.
            </p>

            <h2 className='mt-4 mb-2 text-base font-semibold'>Minimum Count</h2>
            <p className='text-gray-700'>
                The minimum count threshold filters mutations based on their occurrence across clinical sequences
                assigned to a selected variant. Only mutations that appear in at least this many clinical sequences of
                the selected variant will be included.
            </p>

            <h2 className='mt-4 mb-2 text-base font-semibold'>Jaccard Index</h2>
            <p className='text-gray-700'>
                The Jaccard index measures how specific a mutation is to a variant. A mutation has a high Jaccard index
                if it appears frequently within a variant and <span className='italic'>rarely</span> outside the
                variant.
            </p>
            <div className='text-gray-700'>
                <BlockMath math='Jaccard_{s,m} = \frac{|S_{m,v}|}{|S_m| + |S_v| - |S_{m,v}|}' />
                with:
            </div>
            <ul className='mt-2 list-disc pl-8 text-gray-700'>
                <li>
                    {m('S_m')}: The set of sequences with the mutation {m('m')}
                </li>
                <li>
                    {m('S_v')}: The set of sequences of variant {m('v')}
                </li>
                <li>
                    {m('S_{m,v}')}: The intersection {m('S_m \\cap S_v')} of {m('S_m')} and {m('S_v')}; the set of
                    sequences of variant {m('v')} with mutation {m('m')}
                </li>
            </ul>
            <p className='mt-2 text-gray-700'>
                An index of 1 indicates that all sequences of variant {m('v')} have the mutation {m('m')} and all
                sequences with the mutation {m('m')} belong to the variant {m('v')} (perfect overlap). Lesser values
                indicate that either not all sequences of the variant have the mutation or not all sequences with the
                mutation belong to the variant (or both).
            </p>

            <h2 className='mt-4 mb-2 text-base font-semibold'>Time Frame</h2>
            <p className='text-gray-700'>
                Time frame for sequence selection. Shorter windows reduce dominance of well-sequenced historical
                variants, yielding higher Jaccard values for emerging variants with fewer clinical sequences. Use this
                filter to exclude variants no longer in circulation when assessing significance of current mutations.
            </p>
        </InfoBlock>
    );
}

export function CollectionInfo() {
    return (
        <InfoBlock title='Collection'>
            <p className='text-gray-700'>
                Collections are sourced from{' '}
                <a className='link' href='https://cov-spectrum.org/collections'>
                    CovSpectrum
                </a>
                . Only collections whose title contains the word <span className='font-semibold'>wastewater</span> are
                shown here.
            </p>
            <p className='mt-2 text-gray-700'>
                To add a new collection, create it on CovSpectrum and make sure its title includes the word
                &ldquo;wastewater&rdquo; so it appears in this list.
            </p>
        </InfoBlock>
    );
}

const cspLink = (
    <a className='link' href='https://cov-spectrum.org'>
        CovSpectrum
    </a>
);

// What each mode shows, for the bottom of its sidebar.
const MODE_ABOUT = {
    deconvolution: <>The share of each lineage of the panel, estimated from the mutation frequencies in the samples.</>,
    variant: (
        <>
            Track variant-specific mutations over time. Variants can be defined in two ways: by selecting a predefined
            variant from a curated list, or by filtering clinical sequences from {cspLink} based on user parameters.
        </>
    ),
    cooccurrence: <>Which mutations occur together on the same reads, within an amplicon or a range of positions.</>,
    resistance: <>Lookup of mutations known to confer resistance to antiviral drugs.</>,
    untracked: (
        <>
            Novel mutations not yet attributed to major variants. Variant-specific mutations are computed from clinical
            sequences from {cspLink}.
        </>
    ),
    manual: <>Explore freely, using the filters on the plot, i.e., search by minimal proportion.</>,
    collection: (
        <>
            Explore mutations defined by a{' '}
            <a className='link' href='https://cov-spectrum.org/collections'>
                CovSpectrum collection
            </a>
            .
        </>
    ),
} as const satisfies Record<AnalysisMode, ReactNode>;

/** What a mode shows, in a sentence or two. */
export function ModeAbout({ mode }: { mode: AnalysisMode }) {
    return <p>{MODE_ABOUT[mode]}</p>;
}

export function LineagePanelInfo() {
    return (
        <div className='w-96 max-w-full space-y-2 text-sm font-normal text-gray-700'>
            <p className='text-gray-500 italic'>
                The lineages whose shares are estimated. The panel is fixed; one more lineage can be added below.
            </p>
            <p>
                Virus of a lineage that isn&apos;t in the panel is counted towards the panel lineages most like it, so
                their shares can be too high. If you suspect a missing lineage, add it.
            </p>
        </div>
    );
}
