import { type ReactNode } from 'react';

import { type AnalysisMode } from '../../pageState/analysisFilter';
import { BlockMath, InlineMath } from '../ui/Math';

export function KnownVariantsExclusionInfo() {
    return (
        <div className='w-80 max-w-full space-y-2 text-sm font-normal text-gray-700'>
            <p className='text-gray-500 italic'>
                Leaves out the mutations of these variants: those in at least 80% and at least 9 of their clinical
                sequences, sublineages included. For the Nextstrain clades, each clade&apos;s most common lineage is
                used.
            </p>
            <p>What remains are mutations the known variants don&apos;t explain, which can point to a new variant.</p>
        </div>
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

export function TreeVariantInfo() {
    return (
        <div className={HINT}>
            <p>
                Select a lineage of the Nextclade tree. Its mutations compared to the reference make up the mutation
                signature.
            </p>
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

/** About the collection field: with a `titleFilter`, of CoV-Spectrum's collections, else of GenSpectrum's. */
export function CollectionInfo({ titleFilter }: { titleFilter?: string }) {
    return (
        <div className='w-80 max-w-full space-y-2 text-sm font-normal text-gray-700'>
            <p className='text-gray-500 italic'>
                {titleFilter === undefined
                    ? 'The GenSpectrum collections of this organism.'
                    : `The CoV-Spectrum collections with “${titleFilter}” in their title.`}{' '}
                Each variant of the collection is shown over time.
            </p>
            <p>
                {titleFilter === undefined
                    ? 'To track your own set of variants, create a collection on GenSpectrum.'
                    : `To track your own set of variants, create a collection on CoV-Spectrum with “${titleFilter}” in its title.`}
            </p>
        </div>
    );
}

// What each mode shows, for the bottom of its sidebar.
const MODE_ABOUT = {
    deconvolution: <>The share of each lineage of the panel, estimated from the mutation frequencies in the samples.</>,
    variant: (
        <>
            Track a variant&apos;s mutations over time. The variant is defined by a lineage of the Nextclade tree, or by
            the mutations common in its clinical sequences.
        </>
    ),
    cooccurrence: <>Which mutations occur together on the same reads, within an amplicon or a range of positions.</>,
    resistance: <>Lookup of mutations known to confer resistance to antiviral drugs.</>,
    untracked: (
        <>
            Novel mutations not yet attributed to major variants. Variant-specific mutations are computed from clinical
            sequences.
        </>
    ),
    manual: (
        <>
            Track any mutations you choose over time: a list of mutations, or all mutations in a range of positions. Use
            Mean proportion to leave out the rare or the (nearly) fixed ones.
        </>
    ),
    collection: <CollectionModeAbout withCovSpectrum={false} />,
} as const satisfies Record<AnalysisMode, ReactNode>;

/** The collection mode's about text; it names CoV-Spectrum only where the organism has its collections. */
export function CollectionModeAbout({ withCovSpectrum }: { withCovSpectrum: boolean }) {
    const link = (href: string, label: string) => (
        <a className='link' href={href} target='_blank' rel='noopener noreferrer'>
            {label}
        </a>
    );
    return (
        <>
            Track the variants of a collection over time. Collections are shared sets of variants, made and browsed on{' '}
            {link('https://genspectrum.org/collections', 'GenSpectrum')}
            {withCovSpectrum && <> or {link('https://cov-spectrum.org/collections', 'CoV-Spectrum')}</>}.
        </>
    );
}

/** What a mode shows, in a sentence or two; `about` in place of the mode's usual text. */
export function ModeAbout({ mode, about }: { mode: AnalysisMode; about?: ReactNode }) {
    return <p>{about ?? MODE_ABOUT[mode]}</p>;
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
