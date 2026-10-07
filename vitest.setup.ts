import { setupServer } from 'msw/node';
import { afterAll, afterEach, beforeAll } from 'vitest';
import '@testing-library/jest-dom/vitest';

import { BackendRouteMocker, CovSpectrumRouteMocker, LapisRouteMocker } from './routeMocker.ts';

export const testServer = setupServer();

export const lapisRouteMocker = new LapisRouteMocker(testServer);

export const backendRouteMocker = new BackendRouteMocker(testServer);

export const covSpectrumRouteMocker = new CovSpectrumRouteMocker(testServer);

beforeAll(() => testServer.listen({ onUnhandledRequest: 'warn' }));

afterAll(() => testServer.close());

afterEach(() => testServer.resetHandlers());
