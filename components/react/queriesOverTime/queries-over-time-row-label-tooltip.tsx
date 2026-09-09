import { type FC } from 'react';

export type QueriesOverTimeRowLabelTooltipProps = {
    query: { displayLabel: string; description?: string; query: string };
};

export const QueriesOverTimeRowLabelTooltip: FC<QueriesOverTimeRowLabelTooltipProps> = ({ query }) => {
    return (
        <div className='flex flex-col gap-2 max-w-xl'>
            <div className='font-bold'>{query.displayLabel}</div>
            {query.description && <div className='text-sm text-gray-700'>{query.description}</div>}
            {query.query !== '' && (
                <div className='text-sm'>
                    <span className='text-gray-600'>Query:</span>
                    <div className='p-2 border border-gray-200 rounded bg-gray-50'>
                        <pre className='text-xs whitespace-pre-wrap'>
                            <code>{query.query}</code>
                        </pre>
                    </div>
                </div>
            )}
        </div>
    );
};
