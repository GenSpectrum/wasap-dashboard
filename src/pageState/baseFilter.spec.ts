import { describe, expect, it } from 'vitest';

import { type BaseFilter } from './analysisFilter';
import {
    datasetFilterSearchParams,
    isUnresolvedSamplingDate,
    parseBaseFilter,
    setBaseFilterSearchParams,
    withDatasetFilter,
} from './baseFilter';
import { CUSTOM_DATE_RANGE_LABEL, DEFAULT_RECENT_DAYS_LABEL } from '../domain/dateRange';

const config = {
    defaultLocationName: 'Zürich (ZH)',
};

const defaultMeanProportion = { lower: 0.05, upper: 0.95 };

const parse = (query: string) => parseBaseFilter(new URLSearchParams(query), config, defaultMeanProportion);

const serialize = (base: BaseFilter) => {
    const search = new URLSearchParams();
    setBaseFilterSearchParams(search, base, config, defaultMeanProportion);
    return search.toString();
};

describe('baseFilter', () => {
    describe('parseBaseFilter', () => {
        it('parses all fields', () => {
            const base = parse('locations=Berlin&date=2024-01-01--2024-12-31&granularity=week');

            expect(base.locationNames).toEqual(['Berlin']);
            expect(base.samplingDate).toEqual({ label: 'Custom', dateFrom: '2024-01-01', dateTo: '2024-12-31' });
            expect(base.granularity).toBe('week');
        });

        it('defaults the fields that are missing from the URL', () => {
            const base = parse('');

            expect(base.locationNames).toEqual(['Zürich (ZH)']);
            expect(base.samplingDate).toEqual({ label: DEFAULT_RECENT_DAYS_LABEL });
            expect(base.granularity).toBe('day');
        });

        it('takes the default granularity for an unknown one, as from an old link', () => {
            expect(parse('granularity=quarter').granularity).toBe('day');
        });

        it('reads several locations from one list param', () => {
            expect(parse('locations=Basel,Bern').locationNames).toEqual(['Basel', 'Bern']);
        });

        it('reads an empty location as all locations, not the default one', () => {
            expect(parse('locations=').locationNames).toEqual([]);
        });
    });

    describe('sampling date', () => {
        it('does not override an explicit preset from the URL with the default', () => {
            expect(parse('date=14d').samplingDate).toEqual({ label: 'Most recent 14 days' });
        });

        it('parses a preset from the URL without concrete dates (unresolved)', () => {
            expect(parse('date=all').samplingDate).toEqual({ label: 'All times' });
        });

        it('takes the default for an unknown preset, like a label', () => {
            expect(parse('date=Most+recent+14+days').samplingDate).toEqual({ label: DEFAULT_RECENT_DAYS_LABEL });
            expect(parse('date=15d').samplingDate).toEqual({ label: DEFAULT_RECENT_DAYS_LABEL });
        });

        it('parses an open-ended custom range', () => {
            expect(parse('date=2024-01-01--').samplingDate).toEqual({
                label: CUSTOM_DATE_RANGE_LABEL,
                dateFrom: '2024-01-01',
                dateTo: undefined,
            });
        });

        it('leaves an end of a custom range that is no date open', () => {
            expect(parse('date=2026-13-45--2026-08-31').samplingDate).toEqual({
                label: CUSTOM_DATE_RANGE_LABEL,
                dateFrom: undefined,
                dateTo: '2026-08-31',
            });
        });

        it('leaves the default date range out of the URL', () => {
            expect(serialize(parse(''))).toBe('');
        });

        it('round-trips another preset through the URL instead of pinning literal dates', () => {
            expect(serialize(parse('date=30d'))).toBe('date=30d');
        });

        it('serializes an explicit custom date range as literal dates', () => {
            expect(serialize(parse('date=2024-01-01--2024-12-31'))).toContain('date=2024-01-01--2024-12-31');
        });

        it('knows which sampling dates still have to be resolved', () => {
            expect(isUnresolvedSamplingDate({ label: 'Most recent 90 days' })).toBe(true);
            expect(isUnresolvedSamplingDate({ label: 'Most recent 90 days', dateFrom: '2024-01-01' })).toBe(false);
            expect(isUnresolvedSamplingDate({ label: CUSTOM_DATE_RANGE_LABEL })).toBe(false);
        });
    });

    describe('mean proportion', () => {
        it('defaults to the default that is passed in', () => {
            expect(parse('').meanProportion).toEqual({ lower: 0.05, upper: 0.95 });
        });

        it('parses lower and upper from the URL', () => {
            expect(parse('minMean=0.2&maxMean=0.7').meanProportion).toEqual({
                lower: 0.2,
                upper: 0.7,
            });
        });

        it('falls back to the default for invalid values', () => {
            expect(parse('minMean=abc&maxMean=1.5').meanProportion).toEqual({
                lower: 0.05,
                upper: 0.95,
            });
        });

        it('only encodes values that differ from the default in the URL', () => {
            expect(serialize(parse(''))).not.toContain('meanProportion');

            const lowerChanged = serialize(parse('minMean=0.2'));
            expect(lowerChanged).toContain('minMean=0.2');
            expect(lowerChanged).not.toContain('maxMean');
        });
    });

    describe('setBaseFilterSearchParams', () => {
        it('round-trips a fully specified base filter', () => {
            const query = 'locations=Berlin&date=2024-01-01--2024-12-31&granularity=week&minMean=0.2&maxMean=0.7';

            expect(serialize(parse(query))).toBe(new URLSearchParams(query).toString());
        });

        it('round-trips several locations', () => {
            const query = 'locations=Basel%2CBern';

            expect(serialize(parse(query))).toBe(query);
        });

        it('leaves the default location out of the URL', () => {
            expect(serialize(parse('locations=Z%C3%BCrich+%28ZH%29'))).toBe('');
        });

        it('round-trips all locations', () => {
            const query = 'locations=';

            expect(serialize(parse(query))).toBe(query);
        });
    });

    describe('datasetFilterSearchParams', () => {
        it('has the dataset filter but not the mean proportion', () => {
            const base = parse('locations=Berlin&date=2024-01-01--2024-12-31&granularity=week&minMean=0.2&maxMean=0.7');

            expect(datasetFilterSearchParams(base, config).toString()).toBe(
                'locations=Berlin&date=2024-01-01--2024-12-31&granularity=week',
            );
        });

        it('gives the mode it is carried to its own default mean proportion', () => {
            const carried = datasetFilterSearchParams(parse('minMean=0.2'), config);

            expect(parseBaseFilter(carried, config, { lower: 0, upper: 1 }).meanProportion).toEqual({
                lower: 0,
                upper: 1,
            });
        });
    });

    describe('withDatasetFilter', () => {
        it('replaces the dataset filter and leaves the rest', () => {
            const search = new URLSearchParams('locations=Berlin&granularity=week&set=Spike&minMean=0.2');
            const dataset = { ...parse('locations=Basel') };

            const result = withDatasetFilter(search, dataset, config);

            expect(Object.fromEntries(result)).toEqual({
                locations: 'Basel',
                set: 'Spike',
                minMean: '0.2',
            });
        });
    });
});
