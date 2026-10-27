import { describe, expect, it } from 'vitest';

import { getDisplayedErrorMessage } from './error-display';
import { BackendError, BackendNotAvailable } from '../../externalData/genSpectrum/apiService';

describe('getDisplayedErrorMessage', () => {
    it("shows the backend's problem detail", () => {
        const error = new BackendError(
            'Collection 7 not found',
            404,
            { title: 'Not Found', status: 404, detail: 'Collection 7 not found' },
            '/collections/7',
            'request-1',
        );

        expect(getDisplayedErrorMessage(error)).toEqual({
            headline: 'Error - Failed fetching data from the GenSpectrum backend',
            details: {
                headline: 'Backend request failed: /collections/7 - 404 Not Found',
                message: 'Collection 7 not found',
            },
        });
    });

    it('says when the backend is not available', () => {
        expect(getDisplayedErrorMessage(new BackendNotAvailable('https://backend.example.org'))).toEqual({
            headline: 'Error - The GenSpectrum backend is not available',
            details: {
                headline: 'Backend not available',
                message: 'Backend not available under https://backend.example.org',
            },
        });
    });

    it('shows the message of any other error', () => {
        expect(getDisplayedErrorMessage(new TypeError('x is undefined'))).toEqual({
            headline: 'Error',
            details: { headline: 'TypeError', message: 'x is undefined' },
        });
    });
});
