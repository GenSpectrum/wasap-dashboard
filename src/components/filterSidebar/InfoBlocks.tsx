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

const HINT = 'w-80 max-w-full space-y-2 text-sm font-normal text-gray-700';

export function DefineClinicalSignatureInfo() {
    return (
        <div className={HINT}>
            <p>Set the parameters to select which mutations make up the mutation signature of the selected variant.</p>
        </div>
    );
}

export function ClinicalVariantInfo() {
    return (
        <div className={HINT}>
            <p>Select clinical sequences assigned to the selected variant. Use the * option to include sublineages.</p>
        </div>
    );
}

export function MinProportionInfo() {
    return (
        <div className={HINT}>
            <p className='text-gray-500 italic'>
                Only mutations found in at least this share of the variant&apos;s clinical sequences.
            </p>
            <p>Higher values keep only the mutations nearly every sequence of the variant has.</p>
        </div>
    );
}

export function MinCountInfo() {
    return (
        <div className={HINT}>
            <p className='text-gray-500 italic'>
                Only mutations found in at least this many of the variant&apos;s clinical sequences.
            </p>
            <p>Leaves out sequencing errors in variants with few sequences.</p>
        </div>
    );
}

export function MinJaccardInfo() {
    const m = (math: string) => <InlineMath math={math} />;
    return (
        <div className='w-96 max-w-full space-y-2 text-sm font-normal text-gray-700'>
            <p className='text-gray-500 italic'>
                Only mutations with at least this Jaccard index with the variant in clinical sequences:
            </p>
            <BlockMath math='J_{m,v} = \frac{|S_m \cap S_v|}{|S_m \cup S_v|} = \frac{|S_m \cap S_v|}{|S_m| + |S_v| - |S_m \cap S_v|}' />
            <p className='text-gray-500 italic'>
                with {m('S_m')} the sequences with mutation {m('m')} and {m('S_v')} those of variant {m('v')}. At 1,
                every sequence of the variant has the mutation, and no other sequence does. Lower values mean that not
                all sequences of the variant have it, or that sequences of other lineages have it too (or both).
            </p>
            <p>Leaves out mutations the variant shares with other lineages, which can&apos;t tell it apart.</p>
        </div>
    );
}

export function TimeFrameInfo() {
    return (
        <div className={HINT}>
            <p className='text-gray-500 italic'>The date range from which to include clinical samples.</p>
            <p>
                A shorter time frame leaves out lineages that no longer circulate, so mutations shared only with them
                count as specific to the variant.
            </p>
        </div>
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
