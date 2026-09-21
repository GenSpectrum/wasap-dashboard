import DOMPurify from 'dompurify';
import { Fragment, type FC, type RefObject, useRef } from 'react';

import type { SequenceType } from '../../types/dashboardComponents';
import type { Deletion, Substitution } from '../../util/mutations';
import { useMutationAnnotationsProvider } from '../MutationAnnotationsContext';
import { useMutationLinkProvider } from '../MutationLinkTemplateContext';
import { InfoHeadline1, InfoHeadline2, InfoParagraph } from '../shared/info';
import { ButtonWithModalDialog, useModalRef } from '../shared/modal';

export type AnnotatedMutationProps = {
    mutation: Substitution | Deletion;
    sequenceType: SequenceType;
};

export const AnnotatedMutation: FC<AnnotatedMutationProps> = (props) => {
    const annotationsProvider = useMutationAnnotationsProvider();
    const linkProvider = useMutationLinkProvider();
    const modalRef = useModalRef();

    return (
        <AnnotatedMutationWithoutContext
            {...props}
            annotationsProvider={annotationsProvider}
            linkProvider={linkProvider}
            modalRef={modalRef}
        />
    );
};

type GridJsAnnotatedMutationProps = AnnotatedMutationProps & {
    annotationsProvider: ReturnType<typeof useMutationAnnotationsProvider>;
    linkProvider: ReturnType<typeof useMutationLinkProvider>;
};

/**
 * GridJS internally also uses Preact, but it uses its own Preact instance:
 * - Our Preact contexts are not available in GridJS. We need to inject context content as long as we're in our Preact instance.
 * - We must use the GridJS re-exports of the Preact hooks. I'm not sure why.
 */
export const GridJsAnnotatedMutation: FC<GridJsAnnotatedMutationProps> = (props) => {
    const modalRef = useRef<HTMLDialogElement>(null);

    return <AnnotatedMutationWithoutContext {...props} modalRef={modalRef} />;
};

type AnnotatedMutationWithoutContextProps = GridJsAnnotatedMutationProps & {
    modalRef: RefObject<HTMLDialogElement | null>;
};

const AnnotatedMutationWithoutContext: FC<AnnotatedMutationWithoutContextProps> = ({
    mutation,
    sequenceType,
    annotationsProvider,
    linkProvider,
    modalRef,
}) => {
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
            <ButtonWithModalDialog
                buttonClassName={'select-text cursor-pointer'}
                modalContent={modalContent}
                modalRef={modalRef}
            >
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
            </ButtonWithModalDialog>
        </>
    );
};
