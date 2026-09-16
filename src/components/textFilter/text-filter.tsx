import z from 'zod';

import { useStringFieldOptions } from '../../dataLayer/hooks/stringFieldOptions';
import { DownshiftCombobox } from '../shared/downshift-combobox';
import { ErrorBoundary } from '../shared/error-boundary';
import { LoadingDisplay } from '../shared/loading-display';
import { ResizeContainer } from '../shared/resize-container';

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

export type TextFilterInnerProps<Field extends string = string> = Omit<
    z.infer<typeof textFilterInnerPropsSchema>,
    'field'
> & {
    field: Field;
    onInputChange?: (input: { [key in Field]: string | undefined }) => void;
};

export type TextFilterProps<Field extends string = string> = Omit<TextFilterInnerProps<Field>, 'field'> & {
    field: Field;
    width?: string;
};

// width default reproduces the old gs-text-filter Lit component's @property field initializer.
export function TextFilter<Field extends string = string>({
    width = '100%',
    onInputChange,
    ...innerProps
}: TextFilterProps<Field>) {
    const size = { width, height: '3rem' };
    const validatedProps = { width, ...innerProps };

    return (
        <ErrorBoundary size={size} layout='horizontal' componentProps={validatedProps} schema={textFilterPropsSchema}>
            <ResizeContainer size={size}>
                <TextFilterInner {...innerProps} onInputChange={onInputChange} />
            </ResizeContainer>
        </ErrorBoundary>
    );
}

function TextFilterInner<Field extends string>({
    value,
    field,
    placeholderText,
    hideCounts,
    onInputChange,
}: TextFilterInnerProps<Field>) {
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
            onInputChange={onInputChange}
            data={(data ?? []).map((option) => ({ value: option.name, count: option.count }))}
        />
    );
}

type SelectItem = {
    count: number;
    value: string;
};

const TextSelector = <Field extends string>({
    field,
    value,
    placeholderText,
    data,
    hideCounts = false,
    onInputChange,
}: TextFilterInnerProps<Field> & {
    data: SelectItem[];
}) => {
    const initialSelectedItem = data.find((candidate) => candidate.value == value);

    return (
        <DownshiftCombobox
            allItems={data}
            value={initialSelectedItem ?? null}
            filterItemsByInputValue={filterByInputValue}
            onChange={(item) =>
                onInputChange?.({ [field]: item?.value ?? undefined } as { [key in Field]: string | undefined })
            }
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
