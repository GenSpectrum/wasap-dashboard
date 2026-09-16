import { describe, expect, it } from 'vitest';

import type { BaselineFilterConfig } from './baselineFilterConfig';
import { parseTextFiltersFromUrl } from './textFilterFromToUrl';

const configs = [
    {
        type: 'text',
        lapisField: 'someTextField',
        placeholderText: 'Some text field',
        label: 'Some text field',
    },
    {
        type: 'text',
        lapisField: 'someOtherTextField',
        placeholderText: 'Some other text field',
        label: 'Some other text field',
    },
] satisfies BaselineFilterConfig[];

describe('parseTextFiltersFromUrl', () => {
    it('should parse url to text filter', () => {
        const search = new Map<string, string>([
            ['someTextField', 'someTextFieldValue'],
            ['notATextFilter', 'notATextFilter'],
        ]);

        const result = parseTextFiltersFromUrl(search, configs);

        expect(result).toStrictEqual({ someTextField: 'someTextFieldValue' });
    });
});
