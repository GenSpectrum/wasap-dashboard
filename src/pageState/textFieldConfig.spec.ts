import { describe, expect, it } from 'vitest';

import { parseTextFiltersFromUrl, type TextFieldConfig } from './textFieldConfig';

const configs = [
    {
        lapisField: 'someTextField',
        placeholderText: 'Some text field',
        label: 'Some text field',
    },
    {
        lapisField: 'someOtherTextField',
        placeholderText: 'Some other text field',
        label: 'Some other text field',
    },
] satisfies TextFieldConfig[];

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
