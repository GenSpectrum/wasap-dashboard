import { type FC, type ReactNode } from 'react';

import { formatProportion } from './formatProportion';
import { type ProportionValue } from './overTime/proportionValue';
import { type Temporal, type TemporalClass, toTemporalClass, YearMonthDayClass } from '../../util/temporalClass';

type OverTimeGridTooltipProps = {
    /** The row, e.g. the mutation code. */
    label: string;
    date: Temporal;
    value: ProportionValue;
    /** What the counts behind the proportion are, which depends on what the rows are. */
    description?: ReactNode;
};

/** The tooltip of a bucket of a row in the over-time grids: its proportion, its date range and the counts. */
export const OverTimeGridTooltip: FC<OverTimeGridTooltipProps> = ({ label, date, value, description }) => {
    const dateClass = toTemporalClass(date);

    let proportionText = 'No reads';
    if (value !== null) {
        switch (value.type) {
            case 'noCoverage':
                proportionText = 'No coverage';
                break;
            case 'value':
                proportionText = formatProportion(value.count / value.coverage);
                break;
        }
    }

    return (
        <div>
            <div className='flex flex-row items-baseline justify-between gap-4'>
                <div className='flex flex-col text-left'>
                    <span className='font-bold'>{label}</span>
                    <span>{proportionText}</span>
                </div>
                <div className='flex flex-col text-right'>
                    <span className='font-bold'>{dateClass.englishName()}</span>
                    <span className='text-gray-600'>{timeIntervalDisplay(dateClass)}</span>
                </div>
            </div>
            {value !== null && (
                <div className='mt-2'>
                    {description}
                    <p>
                        {value.totalCount} <span className='text-gray-600'>total in this date range.</span>
                    </p>
                </div>
            )}
        </div>
    );
};

const timeIntervalDisplay = (date: TemporalClass) => {
    if (date instanceof YearMonthDayClass) {
        return date.toString();
    }
    return `${date.firstDay.toString()} - ${date.lastDay.toString()}`;
};
