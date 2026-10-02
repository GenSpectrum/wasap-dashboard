/**
 * Runs a deconvolution off the main thread: a panel over a few months is a few thousand rows per
 * date, which is too long to block rendering for.
 */

import { deconvolve, type DeconvolutionInput } from '../../lollipop';

self.onmessage = (event: MessageEvent<DeconvolutionInput>) => {
    self.postMessage(deconvolve(event.data));
};
