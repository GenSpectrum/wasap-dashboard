import { type FC } from 'react';
import z from 'zod';

import { TextFilterChangedEvent } from './TextFilterChangedEvent';
import { DownshiftCombobox } from '../shared/downshift-combobox';
import { ErrorBoundary } from '../shared/error-boundary';
import { LoadingDisplay } from '../shared/loading-display';
import { ResizeContainer } from '../shared/resize-container';
import { useStringFieldOptions } from '../../data/reads';

const textSelectorPropsSchema = z.object({
    field: z.string().min(1),
    placeholderText: z.string().optional(),
    value: z.string().optional(),
    hideCounts: z.boolean().optional(),
});
const textFilterInnerPropsSchema = textSelectorPropsSchema;
const textFilterPropsSchema = textFilterInnerPropsSchema.extend({
    width: z.string(),
});

export type TextFilterInnerProps = z.infer<typeof textFilterInnerPropsSchema>;
export type TextFilterProps = z.infer<typeof textFilterPropsSchema>;
type TextSelectorProps = z.infer<typeof textSelectorPropsSchema>;

export const TextFilter: FC<TextFilterProps> = (props) => {
    const { width, ...innerProps } = props;
    const size = { width, height: '3rem' };

    return (
        <ErrorBoundary size={size} layout='horizontal' componentProps={props} schema={textFilterPropsSchema}>
            <ResizeContainer size={size}>
                <TextFilterInner {...innerProps} />
            </ResizeContainer>
        </ErrorBoundary>
    );
};

const TextFilterInner: FC<TextFilterInnerProps> = ({ value, field, placeholderText, hideCounts }) => {
    const { data, error, isLoading } = useStringFieldOptions(field);

    if (isLoading) {
        return <LoadingDisplay />;
    }

    if (error !== null) {
        throw error;
    }

    return (
        <TextSelector
            field={field}
            value={value}
            placeholderText={placeholderText}
            hideCounts={hideCounts}
            data={(data ?? []).map((option) => ({ value: option.name, count: option.count }))}
        />
    );
};

type SelectItem = {
    count: number;
    value: string;
};

const TextSelector = ({
    field,
    value,
    placeholderText,
    data,
    hideCounts = false,
}: TextSelectorProps & {
    data: SelectItem[];
}) => {
    const initialSelectedItem = data.find((candidate) => candidate.value == value);

    return (
        <DownshiftCombobox
            allItems={data}
            value={initialSelectedItem ?? null}
            filterItemsByInputValue={filterByInputValue}
            createEvent={(item) => new TextFilterChangedEvent({ [field]: item?.value ?? undefined })}
            itemToString={(item) => item?.value ?? ''}
            placeholderText={placeholderText}
            formatItemInList={(item: SelectItem) => {
                return (
                    <p>
                        <span>{item.value}</span>
                        {!hideCounts && (
                            <span className='ml-2 text-gray-500'>({item.count.toLocaleString('en-US')})</span>
                        )}
                    </p>
                );
            }}
        />
    );
};

function filterByInputValue(item: SelectItem, inputValue: string | null) {
    if (inputValue === null || inputValue === '') {
        return true;
    }
    return item.value.toLowerCase().includes(inputValue.toLowerCase());
}
