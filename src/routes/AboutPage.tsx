/** How the data shown in all the modes came about, and where to get all of it. Without a title of its own. */
function DataProcessingInfo() {
    return (
        <div>
            <p className='text-gray-700'>
                The dashboard shows aligned short reads from amplicon sequencing of wastewater samples, both as
                nucleotides and translated to amino acids.
            </p>

            <h3 className='mt-4 mb-2 text-base font-semibold'>Quality control and preprocessing</h3>
            <p className='text-gray-700'>
                Reads are preprocessed with{' '}
                <a className='link' href='https://cbg-ethz.github.io/V-pipe/'>
                    V-pipe
                </a>
                , which:
            </p>
            <ul className='mt-2 list-disc pl-8 text-gray-700'>
                <li>drops reads shorter than 80% of the intended length (250 bp for SARS-CoV-2),</li>
                <li>drops reads with more than 4 ambiguous (N) bases,</li>
                <li>trims both ends of a read where the quality score falls below 30,</li>
                <li>drops reads whose mean quality over a sliding window of 10 bases falls below 30.</li>
            </ul>
            <p className='mt-2 text-gray-700'>
                The expected error rate of the Aviti sequencer is about 0.32% (
                <a className='link' href='https://www.sciencedirect.com/science/article/pii/S0043135424013642'>
                    John et al., 2024
                </a>
                ).
            </p>

            <h3 className='mt-4 mb-2 text-base font-semibold'>Subsampling</h3>
            <p className='text-gray-700'>
                Read depth varies a lot between samples. To keep queries fast and predictable, each sample is randomly
                subsampled to at most 4.5 million reads. Random subsampling keeps the variant allele frequencies and the
                haplotype structure intact.
            </p>

            <h3 className='mt-4 mb-2 text-base font-semibold'>Alignment</h3>
            <p className='text-gray-700'>
                As part of V-pipe, reads are aligned with{' '}
                <a className='link' href='https://github.com/lh3/bwa'>
                    BWA
                </a>{' '}
                to the reference genome (for SARS-CoV-2,{' '}
                <a className='link' href='https://www.ncbi.nlm.nih.gov/nuccore/1798174254'>
                    Wuhan-Hu-1, NC_045512.2
                </a>
                ). For the amino acid view,{' '}
                <a className='link' href='https://github.com/cbg-ethz/sr2silo'>
                    sr2silo
                </a>{' '}
                translates and aligns the reads with{' '}
                <a className='link' href='https://github.com/bbuchfink/diamond'>
                    DIAMOND
                </a>
                .
            </p>

            <h3 className='mt-4 mb-2 text-base font-semibold'>Database</h3>
            <p className='text-gray-700'>
                The processed reads are loaded into{' '}
                <a className='link' href='https://rhydb.org/'>
                    RhyDB
                </a>
                , which answers the dashboard&rsquo;s queries interactively.
            </p>

            <p className='mt-4 text-gray-700'>
                The full data is available for download at{' '}
                <a className='link' href='https://db.wasap.genspectrum.org'>
                    db.wasap.genspectrum.org
                </a>
                .
            </p>
        </div>
    );
}

/** The `/:organismPath/about` route: what the dashboard is and where its data comes from. */
export function AboutPage() {
    return (
        <div className='flex-1 bg-white p-4 lg:p-6'>
            <div className='mx-auto max-w-3xl space-y-8'>
                <div className='space-y-3'>
                    <h1 className='text-2xl font-semibold'>About W-ASAP</h1>
                    <p className='text-gray-700'>
                        This dashboard visualizes pathogen sequencing data from Swiss wastewater for researchers and
                        public health professionals. It provides interactive tools to query hundreds of millions of
                        short reads in real time, to identify and track variants. It currently supports SARS-CoV-2 and
                        respiratory syncytial virus (RSV), with plans to add influenza.
                    </p>
                    <p className='text-gray-700'>
                        The project is part of Switzerland&rsquo;s broader wastewater-based disease surveillance
                        program, with sequencing performed by the{' '}
                        <a className='link' href='https://fgcz.ch/'>
                            Functional Genomics Center Zurich (FGCZ)
                        </a>
                        . For more information about the program, see{' '}
                        <a className='link' href='https://wise.ethz.ch'>
                            wise.ethz.ch
                        </a>
                        .
                    </p>
                </div>

                <section>
                    <h2 className='mb-3 text-xl font-semibold'>Data processing</h2>
                    <DataProcessingInfo />
                </section>
            </div>
        </div>
    );
}
