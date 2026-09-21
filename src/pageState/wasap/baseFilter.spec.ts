import { describe, expect, it } from 'vitest';

import {
    carryOverBaseFilterSearchParams,
    isUnresolvedSamplingDate,
    parseBaseFilter,
    setBaseFilterSearchParams,
} from './baseFilter';
import { type WasapBaseFilter } from './wasapAnalysisFilter';
import { CustomDateRangeLabel } from '../../types/DateWindow';
import { DEFAULT_RECENT_DAYS_LABEL } from '../../util/recentDaysDateRangeOptions';

const config = {
    locationNameField: 'locationName',
    samplingDateField: 'samplingDate',
    defaultLocationName: 'Zürich (ZH)',
};

const defaultMeanProportion = { lower: 0.05, upper: 0.95 };

const parse = (query: string) => parseBaseFilter(new URLSearchParams(query), config, defaultMeanProportion);

const serialize = (base: WasapBaseFilter) => {
    const search = new URLSearchParams();
    setBaseFilterSearchParams(search, base, config, defaultMeanProportion);
    return search.toString();
};

describe('baseFilter', () => {
    describe('parseBaseFilter', () => {
        it('parses all fields', () => {
            const base = parse(
                'locationName=Berlin&samplingDate=2024-01-01--2024-12-31&granularity=week&excludeEmpty=false',
            );

            expect(base.locationName).toBe('Berlin');
            expect(base.samplingDate).toEqual({ label: 'Custom', dateFrom: '2024-01-01', dateTo: '2024-12-31' });
            expect(base.granularity).toBe('week');
            expect(base.excludeEmpty).toBe(false);
        });

        it('defaults the fields that are missing from the URL', () => {
            const base = parse('');

            expect(base.locationName).toBe('Zürich (ZH)');
            expect(base.samplingDate).toEqual({ label: DEFAULT_RECENT_DAYS_LABEL });
            expect(base.granularity).toBe('day');
            expect(base.excludeEmpty).toBe(true);
        });

        it('reads the location from the configured field', () => {
            const base = parseBaseFilter(
                new URLSearchParams('site=Basel'),
                { ...config, locationNameField: 'site' },
                defaultMeanProportion,
            );

            expect(base.locationName).toBe('Basel');
        });

        it('parses excludeEmpty=false as the boolean false', () => {
            expect(parse('excludeEmpty=false').excludeEmpty).toBe(false);
            expect(parse('excludeEmpty=true').excludeEmpty).toBe(true);
        });
    });

    describe('sampling date', () => {
        it('does not override an explicit preset from the URL with the default', () => {
            expect(parse('samplingDate=Most+recent+14+days').samplingDate).toEqual({ label: 'Most recent 14 days' });
        });

        it('parses a preset label from the URL without concrete dates (unresolved)', () => {
            expect(parse('samplingDate=All+times').samplingDate).toEqual({ label: 'All times' });
        });

        it('parses an open-ended custom range', () => {
            expect(parse('samplingDate=2024-01-01--').samplingDate).toEqual({
                label: CustomDateRangeLabel,
                dateFrom: '2024-01-01',
                dateTo: undefined,
            });
        });

        it('round-trips the default preset label through the URL instead of pinning literal dates', () => {
            expect(serialize(parse(''))).toContain('samplingDate=Most+recent+90+days');
        });

        it('serializes an explicit custom date range as literal dates', () => {
            expect(serialize(parse('samplingDate=2024-01-01--2024-12-31'))).toContain(
                'samplingDate=2024-01-01--2024-12-31',
            );
        });

        it('knows which sampling dates still have to be resolved', () => {
            expect(isUnresolvedSamplingDate({ label: 'Most recent 90 days' })).toBe(true);
            expect(isUnresolvedSamplingDate({ label: 'Most recent 90 days', dateFrom: '2024-01-01' })).toBe(false);
            expect(isUnresolvedSamplingDate({ label: CustomDateRangeLabel })).toBe(false);
        });
    });

    describe('mean proportion', () => {
        it('defaults to the default that is passed in', () => {
            expect(parse('').meanProportion).toEqual({ lower: 0.05, upper: 0.95 });
        });

        it('parses lower and upper from the URL', () => {
            expect(parse('meanProportionLower=0.2&meanProportionUpper=0.7').meanProportion).toEqual({
                lower: 0.2,
                upper: 0.7,
            });
        });

        it('falls back to the default for invalid values', () => {
            expect(parse('meanProportionLower=abc&meanProportionUpper=1.5').meanProportion).toEqual({
                lower: 0.05,
                upper: 0.95,
            });
        });

        it('only encodes values that differ from the default in the URL', () => {
            expect(serialize(parse(''))).not.toContain('meanProportion');

            const lowerChanged = serialize(parse('meanProportionLower=0.2'));
            expect(lowerChanged).toContain('meanProportionLower=0.2');
            expect(lowerChanged).not.toContain('meanProportionUpper');
        });
    });

    describe('setBaseFilterSearchParams', () => {
        it('encodes excludeEmpty=false but omits it when true', () => {
            expect(serialize(parse('excludeEmpty=false'))).toContain('excludeEmpty=false');
            expect(serialize(parse(''))).not.toContain('excludeEmpty');
        });

        it('round-trips a fully specified base filter', () => {
            const query =
                'locationName=Berlin&samplingDate=2024-01-01--2024-12-31&granularity=week&excludeEmpty=false&meanProportionLower=0.2&meanProportionUpper=0.7';

            expect(serialize(parse(query))).toBe(new URLSearchParams(query).toString());
        });
    });

    describe('carryOverBaseFilterSearchParams', () => {
        it('keeps the base filter but not the mean proportion', () => {
            const base = parse(
                'locationName=Berlin&samplingDate=2024-01-01--2024-12-31&granularity=week&excludeEmpty=false&meanProportionLower=0.2&meanProportionUpper=0.7',
            );

            expect(carryOverBaseFilterSearchParams(base, config).toString()).toBe(
                'locationName=Berlin&samplingDate=2024-01-01--2024-12-31&granularity=week&excludeEmpty=false',
            );
        });

        it('gives the mode it is carried to its own default mean proportion', () => {
            const base = parse('meanProportionLower=0.2');

            const carried = carryOverBaseFilterSearchParams(base, config);

            expect(parseBaseFilter(carried, config, { lower: 0, upper: 1 }).meanProportion).toEqual({
                lower: 0,
                upper: 1,
            });
        });
    });
});
