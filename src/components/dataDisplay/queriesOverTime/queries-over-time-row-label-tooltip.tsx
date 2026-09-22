import { type FC } from 'react';

export type QueriesOverTimeRowLabelTooltipProps = {
    query: { displayLabel: string; description?: string; query: string };
};

export const QueriesOverTimeRowLabelTooltip: FC<QueriesOverTimeRowLabelTooltipProps> = ({ query }) => {
    return (
        <div className='flex max-w-xl flex-col gap-2'>
            <div className='font-bold'>{query.displayLabel}</div>
            {query.description && <div className='text-sm text-gray-700'>{query.description}</div>}
            {query.query !== '' && (
                <div className='text-sm'>
                    <span className='text-gray-600'>Query:</span>
                    <div className='border border-gray-200 bg-gray-50 p-2'>
                        <pre className='text-xs whitespace-pre-wrap'>
                            <code>{query.query}</code>
                        </pre>
                    </div>
                </div>
            )}
        </div>
    );
};
