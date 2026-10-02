import { useEffect, useState } from 'react';

import { type DeconvolutionInput, type DeconvolutionResult } from '../../lollipop';

export type DeconvolutionState =
    | { status: 'idle' }
    | { status: 'running' }
    | { status: 'done'; result: DeconvolutionResult }
    | { status: 'error'; error: string };

/**
 * The deconvolution of the input, computed in a worker. A new input cancels the computation of
 * the previous one.
 */
export function useDeconvolution(input: DeconvolutionInput | undefined): DeconvolutionState {
    const [state, setState] = useState<DeconvolutionState>({ status: 'idle' });

    useEffect(() => {
        if (input === undefined) {
            setState({ status: 'idle' });
            return;
        }
        setState({ status: 'running' });
        const worker = new Worker(new URL('./deconvolution.worker.ts', import.meta.url), { type: 'module' });
        worker.onmessage = (event: MessageEvent<DeconvolutionResult>) => {
            setState({ status: 'done', result: event.data });
            worker.terminate();
        };
        worker.onerror = (event) => {
            setState({ status: 'error', error: event.message });
            worker.terminate();
        };
        worker.postMessage(input);
        return () => worker.terminate();
    }, [input]);

    return state;
}
