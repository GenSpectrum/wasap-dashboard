import DOMPurify from 'dompurify';
import { Fragment, type FC } from 'react';

import type { SequenceType } from '../../types/dashboardComponents';
import type { Deletion, Substitution } from '../../util/mutations';
import { useMutationAnnotationsProvider } from '../MutationAnnotationsContext';
import { useMutationLinkProvider } from '../MutationLinkTemplateContext';
import { InfoHeadline1, InfoHeadline2, InfoParagraph } from '../shared/info';
import { Modal } from '../shared/modal';

export type AnnotatedMutationProps = {
    mutation: Substitution | Deletion;
    sequenceType: SequenceType;
};

export const AnnotatedMutation: FC<AnnotatedMutationProps> = ({ mutation, sequenceType }) => {
    const annotationsProvider = useMutationAnnotationsProvider();
    const linkProvider = useMutationLinkProvider();

    const link = linkProvider(mutation, sequenceType);
    let innerLabel = <>{mutation.code}</>;
    if (link !== undefined) {
        innerLabel = (
            <a
                className='hover:text-brand-800 focus:ring-brand-300 underline focus:ring-2 focus:outline-none'
                href={link}
            >
                {mutation.code}
            </a>
        );
    }

    const mutationAnnotations = annotationsProvider(mutation, sequenceType);

    if (mutationAnnotations === undefined || mutationAnnotations.length === 0) {
        return innerLabel;
    }

    const modalContent = (
        <div className='block'>
            <InfoHeadline1>Annotations for {mutation.code}</InfoHeadline1>
            {mutationAnnotations.map((resolved) => (
                <Fragment key={resolved.annotation.name}>
                    <InfoHeadline2>{resolved.name}</InfoHeadline2>
                    <InfoParagraph>
                        <div dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(resolved.description) }} />
                    </InfoParagraph>
                </Fragment>
            ))}
        </div>
    );

    return (
        <>
            {innerLabel}
            <Modal buttonClassName={'select-text cursor-pointer'} modalContent={modalContent}>
                <sup className='decoration-red-600 hover:underline focus-visible:underline'>
                    {mutationAnnotations
                        .map((resolved) => resolved.annotation.symbol)
                        .map((symbol, index) => (
                            <Fragment key={symbol}>
                                <span className='text-red-600'>{symbol}</span>
                                {index !== mutationAnnotations.length - 1 && ','}
                            </Fragment>
                        ))}
                </sup>
            </Modal>
        </>
    );
};
