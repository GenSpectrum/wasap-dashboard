import { autoUpdate, computePosition, type Middleware } from '@floating-ui/dom';
import type { Placement } from '@floating-ui/utils';
import { useEffect, useRef } from 'react';
import type { RefObject } from 'react';

export function useFloatingUi(
    referenceRef: RefObject<HTMLElement | null>,
    floatingRef: RefObject<HTMLElement | null>,
    middleware?: (Middleware | null | undefined | false)[],
    placement?: Placement,
) {
    const cleanupRef = useRef<(() => void) | null>(null);

    useEffect(() => {
        if (!referenceRef.current || !floatingRef.current) {
            return;
        }

        const { current: reference } = referenceRef;
        const { current: floating } = floatingRef;

        const update = () => {
            void computePosition(reference, floating, {
                placement,
                middleware,
            }).then(({ x, y }) => {
                floating.style.left = `${x}px`;
                floating.style.top = `${y}px`;
            });
        };

        update();
        cleanupRef.current = autoUpdate(reference, floating, update);

        return () => {
            if (cleanupRef.current) {
                cleanupRef.current();
            }
        };
    }, [placement, middleware, referenceRef, floatingRef]);
}

export function useCloseOnClickOutside(
    floatingRef: RefObject<HTMLElement | null>,
    referenceRef: RefObject<HTMLElement | null>,
    setShowContent: (value: ((prevState: boolean) => boolean) | boolean) => void,
) {
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            const path = event.composedPath();
            if (
                floatingRef.current &&
                !path.includes(floatingRef.current) &&
                referenceRef.current &&
                !path.includes(referenceRef.current)
            ) {
                setShowContent(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [floatingRef, referenceRef, setShowContent]);
}

export function useCloseOnEsc(setShowHelp: (value: ((prevState: boolean) => boolean) | boolean) => void) {
    useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                setShowHelp(false);
            }
        };

        document.addEventListener('keydown', handleKeyDown);

        return () => {
            document.removeEventListener('keydown', handleKeyDown);
        };
    }, [setShowHelp]);
}
