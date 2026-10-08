import { AnnotatedMutation } from './annotated-mutation';
import { BACKGROUND_MIN_PROPORTION, type ExcludedMutation } from '../../dataLayer/hooks/backgroundMutations';
import { type SequenceType } from '../../types/dashboardComponents';
import { TitledPanel } from '../shared/TitledPanel';

type ExcludedMutationsProps = {
    /** From `useSignatureWithoutBackground`. */
    mutations: ExcludedMutation[];
    /** The background lineages picked, in their order; one without any of the variant's mutations says so. */
    backgroundLineages: readonly string[];
    sequenceType: SequenceType;
};

/**
 * The mutations left out of the variant's signature, by why: per background lineage, and those on
 * (nearly) all reads, each with its mean proportion. Nothing when nothing was left out and there
 * are no background lineages.
 */
export function ExcludedMutations({ mutations, backgroundLineages, sequenceType }: ExcludedMutationsProps) {
    if (mutations.length === 0 && backgroundLineages.length === 0) {
        return null;
    }
    const ofLineage = (lineage: string) =>
        mutations.filter(({ reason }) => reason.type === 'lineage' && reason.lineage === lineage);
    const deletions = mutations.filter(({ reason }) => reason.type === 'deletion');
    const onAllReads = mutations.filter(({ reason }) => reason.type === 'proportion');
    return (
        <TitledPanel title='Excluded mutations' info={<ExcludedMutationsInfo />}>
            <div className='space-y-3'>
                {backgroundLineages.map((lineage) => (
                    <MutationGroup
                        key={lineage}
                        title={`In the background lineage ${lineage}`}
                        mutations={ofLineage(lineage)}
                        sequenceType={sequenceType}
                    />
                ))}
                {deletions.length > 0 && (
                    <MutationGroup title='Deletions' mutations={deletions} sequenceType={sequenceType} />
                )}
                {onAllReads.length > 0 && (
                    <MutationGroup
                        title={`On ${BACKGROUND_MIN_PROPORTION * 100}% or more of the reads`}
                        mutations={onAllReads}
                        sequenceType={sequenceType}
                    />
                )}
            </div>
        </TitledPanel>
    );
}

function MutationGroup({
    title,
    mutations,
    sequenceType,
}: {
    title: string;
    mutations: ExcludedMutation[];
    sequenceType: SequenceType;
}) {
    return (
        <div>
            <h3 className='mb-1 font-semibold'>
                {title} <span className='font-normal text-gray-600'>({mutations.length})</span>
            </h3>
            {mutations.length === 0 ? (
                <p className='text-sm text-gray-600'>None of the variant&apos;s mutations (left).</p>
            ) : (
                <ul className='flex flex-wrap gap-x-4 gap-y-1'>
                    {mutations.map(({ mutation, count, proportion }) => (
                        <li key={mutation.code} className='font-mono whitespace-nowrap'>
                            <AnnotatedMutation mutation={mutation} sequenceType={sequenceType} />{' '}
                            {/* Without a count, the mutation wasn't measured: too rare, or no read covers it. */}
                            <span className='font-sans text-sm text-gray-600'>
                                {count > 0 ? `${(proportion * 100).toFixed(1)}%` : '–'}
                            </span>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
}

function ExcludedMutationsInfo() {
    return (
        <div className='w-96 space-y-2 text-sm font-normal text-gray-700'>
            <p>
                The variant&apos;s mutations left out of the mutations and the co-occurrence above, as the background
                the variant stands on rather than what tells it apart, each with its mean proportion over the time
                range.
            </p>
            <p>
                Those in the signature of a background lineage (picked in the filters), put down to the first of them
                that has it; of the rest the deletions, which are hard to call on the reads; and then those with a mean
                proportion of at least {`${BACKGROUND_MIN_PROPORTION * 100}%`}: (nearly) every read carries them, so
                they tell nothing about how much of the variant there is.
            </p>
        </div>
    );
}
