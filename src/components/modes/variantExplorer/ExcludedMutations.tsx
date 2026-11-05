import {
    BACKGROUND_MIN_PROPORTION,
    type ExcludedMutation,
} from '../../../dataLayer/hooks/analyses/backgroundMutations';
import { type SequenceType } from '../../../domain/mutations';
import { AnnotatedMutation } from '../../mutations/AnnotatedMutation';
import { LoadingDisplay } from '../../ui/LoadingDisplay';
import { TitledPanel } from '../../ui/TitledPanel';

type ExcludedMutationsProps = {
    /** From `useSignatureWithoutBackground`; `undefined` while they are still loading. */
    mutations: ExcludedMutation[] | undefined;
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
    if (mutations === undefined) {
        return (
            <TitledPanel title='Excluded mutations' info={<ExcludedMutationsInfo />}>
                <div className='h-24'>
                    <LoadingDisplay />
                </div>
            </TitledPanel>
        );
    }
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
        <div className='w-96 max-w-full space-y-2 text-sm font-normal text-gray-700'>
            <p className='text-gray-500 italic'>
                The variant&apos;s mutations left out of the panels above, grouped by why, each with its mean proportion
                over the time range.
            </p>
            <p>
                They don&apos;t tell the variant apart: they are shared with a background lineage, or nearly every read
                carries them anyway. Deletions are left out because they are called less reliably on reads. Change what
                is excluded in the filters under Exclude mutations.
            </p>
        </div>
    );
}
