import { type Dispatch, type FC, type SetStateAction } from 'react';
import { type QueryFilter } from './getFilteredQueriesOverTimeData';

type QueriesOverTimeFilterProps = {
    value: QueryFilter;
    setFilterValue: Dispatch<SetStateAction<QueryFilter>>;
};

export const QueriesOverTimeFilter: FC<QueriesOverTimeFilterProps> = ({ value, setFilterValue }) => {
    return (
        <input
            type='text'
            placeholder='Filter queries...'
            className='input input-xs input-bordered w-40'
            value={value.textFilter}
            onInput={(e) =>
                setFilterValue({
                    textFilter: (e.target as HTMLInputElement).value,
                })
            }
        />
    );
};
