type Person = { name: string; github: string };

// By last name.
const CORE_TEAM: Person[] = [
    { name: 'Chaoran Chen', github: 'chaoran-chen' },
    { name: 'Fabian Engelniederhammer', github: 'fengelniederhammer' },
    { name: 'Felix Hennig', github: 'fhennig' },
    { name: 'Alexander Taepper', github: 'taepper' },
    { name: 'Ivan Topolsky', github: 'DrYak' },
];

const FORMER_MEMBERS: Person[] = [{ name: 'Gordon J. Koehn', github: 'gordonkoehn' }];

function PeopleList({ people }: { people: Person[] }) {
    return (
        <ul className='list-disc pl-8 text-gray-700'>
            {people.map(({ name, github }) => (
                <li key={github}>
                    {name} (
                    <a className='link' href={`https://github.com/${github}`}>
                        @{github}
                    </a>
                    )
                </li>
            ))}
        </ul>
    );
}

type Tool = { name: string; url: string; role: string; papers: { citation: string; doi: string }[] };

const TOOLS: Tool[] = [
    {
        name: 'V-pipe',
        url: 'https://cbg-ethz.github.io/V-pipe/',
        role: 'read preprocessing and alignment',
        papers: [
            {
                citation:
                    'Fuhrmann L, Jablonski KP, Topolsky I, et al. V-pipe 3.0: a sustainable pipeline for within-sample viral genetic diversity estimation. GigaScience 13, giae065 (2024).',
                doi: '10.1093/gigascience/giae065',
            },
            {
                citation:
                    'Posada-Céspedes S, Seifert D, Topolsky I, Jablonski KP, Metzner KJ, Beerenwinkel N. V-pipe: a computational pipeline for assessing viral genetic diversity from high-throughput data. Bioinformatics 37(12), 1673–1680 (2021).',
                doi: '10.1093/bioinformatics/btab015',
            },
        ],
    },
    {
        name: 'LolliPop',
        url: 'https://github.com/cbg-ethz/LolliPop',
        role: 'lineage deconvolution',
        papers: [
            {
                citation:
                    'Dreifuss D, Topolsky I, Icer Baykal P, Beerenwinkel N. Tracking SARS-CoV-2 genomic variants in wastewater sequencing data with LolliPop. medRxiv (2022).',
                doi: '10.1101/2022.11.02.22281825',
            },
        ],
    },
    {
        name: 'COJAC',
        url: 'https://github.com/cbg-ethz/cojac',
        role: 'detection of mutations co-occurring on the same reads',
        papers: [
            {
                citation:
                    'Jahn K, Dreifuss D, Topolsky I, et al. Early detection and surveillance of SARS-CoV-2 genomic variants in wastewater using COJAC. Nature Microbiology 7, 1151–1160 (2022).',
                doi: '10.1038/s41564-022-01185-x',
            },
        ],
    },
    {
        name: 'RhyDB',
        url: 'https://rhydb.org/',
        role: 'the database behind the interactive queries',
        papers: [],
    },
];

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

/** The `/:organismPath/about` route: what the dashboard is, where its data comes from, what it builds on, and who is behind it. */
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

                <section>
                    <h2 className='mb-3 text-xl font-semibold'>Tools and methods</h2>
                    <p className='text-gray-700'>This project builds on these tools and methods:</p>
                    <ul className='mt-3 space-y-4 text-gray-700'>
                        {TOOLS.map((tool) => (
                            <li key={tool.name}>
                                <a className='link font-semibold' href={tool.url}>
                                    {tool.name}
                                </a>{' '}
                                — {tool.role}
                                {tool.papers.map((paper) => (
                                    <p key={paper.doi} className='mt-1 text-sm text-gray-600'>
                                        {paper.citation}{' '}
                                        <a className='link' href={`https://doi.org/${paper.doi}`}>
                                            doi:{paper.doi}
                                        </a>
                                    </p>
                                ))}
                            </li>
                        ))}
                    </ul>
                </section>

                <section>
                    <h2 className='mb-3 text-xl font-semibold'>Team</h2>
                    <PeopleList people={CORE_TEAM} />
                    <h3 className='mt-4 mb-2 text-base font-semibold'>Former members</h3>
                    <PeopleList people={FORMER_MEMBERS} />
                </section>

                {/* TODO: Contact section — GitHub issues link for suggestions and bugs, email for general questions. */}

                {/* TODO: Funding section — development funded by an ORD grant, an NIH grant, ETHZ and SIB (exact
                    wording pending); for the funding of the sequencing, refer to wise.ethz.ch. */}
            </div>
        </div>
    );
}
