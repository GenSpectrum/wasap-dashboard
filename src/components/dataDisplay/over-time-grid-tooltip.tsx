import { type FC, type ReactNode } from 'react';

import { formatProportion } from './formatProportion';
import { type ProportionValue } from './overTime/proportionValue';
import { type Temporal, type TemporalClass, toTemporalClass, YearMonthDayClass } from '../../util/temporalClass';

type OverTimeGridTooltipProps = {
    label: ReactNode;
    date: Temporal;
    value: ProportionValue;
    children?: ReactNode;
};

export const OverTimeGridTooltip: FC<OverTimeGridTooltipProps> = ({ label, date, value, children }) => {
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
                    {label}
                    <span>{proportionText}</span>
                </div>
                <div className='flex flex-col text-right'>
                    <span className='font-bold'>{dateClass.englishName()}</span>
                    <span className='text-gray-600'>{timeIntervalDisplay(dateClass)}</span>
                </div>
            </div>
            {children}
        </div>
    );
};

const timeIntervalDisplay = (date: TemporalClass) => {
    if (date instanceof YearMonthDayClass) {
        return date.toString();
    }
    return `${date.firstDay.toString()} - ${date.lastDay.toString()}`;
};
