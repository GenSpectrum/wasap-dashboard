import { type FC, type ReactNode } from 'react';

import { formatProportion } from './formatProportion';
import { MUTATIONS_OVER_TIME_MIN_PROPORTION, type ProportionValue } from '../../query/queryMutationsOverTime';
import { type Temporal, type TemporalClass, toTemporalClass, YearMonthDayClass } from '../../util/temporalClass';

type OverTimeGridTooltipProps = {
    label: ReactNode;
    date: Temporal;
    value: ProportionValue;
    minProportion?: number;
    children?: ReactNode;
};

export const OverTimeGridTooltip: FC<OverTimeGridTooltipProps> = ({
    label,
    date,
    value,
    minProportion = MUTATIONS_OVER_TIME_MIN_PROPORTION,
    children,
}) => {
    const dateClass = toTemporalClass(date);

    let proportionText = 'No data';
    if (value !== null) {
        switch (value.type) {
            case 'belowThreshold':
                proportionText = `<${formatProportion(minProportion)}`;
                break;
            case 'valueWithCoverage':
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
