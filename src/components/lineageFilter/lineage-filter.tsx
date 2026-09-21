import { useMemo } from 'react';
import z from 'zod';

import { useLineageOptions, type LineageItem } from '../../dataLayer/hooks/lineageOptions';
import { DownshiftCombobox, DownshiftMultiCombobox } from '../shared/downshift-combobox';
import { ErrorBoundary } from '../shared/error-boundary';
import { LoadingDisplay } from '../shared/loading-display';
import { ResizeContainer } from '../shared/resize-container';

const lineageSelectorPropsSchema = z.object({
    field: z.string().min(1),
    placeholderText: z.string().optional(),
    value: z.union([z.string(), z.array(z.string())]),
    hideCounts: z.boolean().optional(),
    multiSelect: z.boolean().optional(),
});

const lineageFilterInnerPropsSchema = lineageSelectorPropsSchema;

const lineageFilterPropsSchema = lineageFilterInnerPropsSchema
    .extend({
        width: z.string(),
    })
    .refine(
        (data) => {
            if (data.multiSelect && typeof data.value === 'string') {
                return false;
            }
            if (!data.multiSelect && Array.isArray(data.value)) {
                return false;
            }
            return true;
        },
        (data) => ({
            message: data.multiSelect
                ? 'When multiSelect is true, value must be an array of strings'
                : 'When multiSelect is false or undefined, value must be a string',
            path: ['value'],
        }),
    );

export type LineageFilterInnerProps<Lineage extends string = string> = Omit<
    z.infer<typeof lineageFilterInnerPropsSchema>,
    'field'
> & {
    field: Lineage;
    onLineageChange?: (lineage: { [key in Lineage]: string | undefined }) => void;
    onLineageMultiChange?: (lineage: { [key in Lineage]: string[] | undefined }) => void;
};

export type LineageFilterProps<Lineage extends string = string> = Omit<
    LineageFilterInnerProps<Lineage>,
    'value' | 'width'
> & {
    value?: string | string[];
    width?: string;
};

// width default reproduces the old gs-lineage-filter Lit component's @property field initializer.
export function LineageFilter<Lineage extends string = string>({
    width = '100%',
    value,
    multiSelect,
    ...rest
}: LineageFilterProps<Lineage>) {
    const resolvedValue = value ?? (multiSelect ? [] : '');
    const size = { width, minHeight: '3rem' };
    const validatedProps = { width, value: resolvedValue, multiSelect, ...rest };

    return (
        <ErrorBoundary
            size={size}
            layout='horizontal'
            componentProps={validatedProps}
            schema={lineageFilterPropsSchema}
        >
            <ResizeContainer size={size}>
                <LineageFilterInner value={resolvedValue} multiSelect={multiSelect} {...rest} />
            </ResizeContainer>
        </ErrorBoundary>
    );
}

function LineageFilterInner<Lineage extends string>({
    field,
    placeholderText,
    value,
    hideCounts,
    multiSelect = false,
    onLineageChange,
    onLineageMultiChange,
}: LineageFilterInnerProps<Lineage>) {
    const { data, error, isLoading } = useLineageOptions(field);

    if (isLoading) {
        return <LoadingDisplay />;
    }

    if (error !== null) {
        throw error;
    }

    return (
        <LineageSelector
            field={field}
            value={value}
            placeholderText={placeholderText}
            data={data ?? []}
            hideCounts={hideCounts}
            multiSelect={multiSelect}
            onLineageChange={onLineageChange}
            onLineageMultiChange={onLineageMultiChange}
        />
    );
}

const LineageSelector = <Lineage extends string>({
    field,
    value,
    placeholderText,
    data,
    hideCounts = false,
    multiSelect = false,
    onLineageChange,
    onLineageMultiChange,
}: LineageFilterInnerProps<Lineage> & {
    data: LineageItem[];
}) => {
    const formatItemInList = (item: LineageItem) => (
        <p>
            <span>{item.lineage}</span>
            {!hideCounts && <span className='ml-2 text-gray-500'>({item.count.toLocaleString('en-US')})</span>}
        </p>
    );

    const selectedItems = useMemo(() => {
        const valueArray = Array.isArray(value) ? value : [];
        return valueArray
            .map((lineageValue) => data.find((item) => item.lineage === lineageValue))
            .filter((item): item is LineageItem => item !== undefined);
    }, [data, value]);

    const selectedItem = useMemo(() => {
        const valueString = typeof value === 'string' ? value : '';
        return data.find((item) => item.lineage === valueString) ?? null;
    }, [data, value]);

    if (multiSelect) {
        return (
            <DownshiftMultiCombobox
                allItems={data}
                value={selectedItems}
                filterItemsByInputValue={filterByInputValue}
                onChange={(items) => {
                    const lineages = items.length > 0 ? items.map((item) => item.lineage) : undefined;
                    onLineageMultiChange?.({ [field]: lineages } as { [key in Lineage]: string[] | undefined });
                }}
                itemToString={(item) => item?.lineage ?? ''}
                placeholderText={placeholderText ?? 'Select lineages'}
                formatItemInList={formatItemInList}
                formatSelectedItem={(item: LineageItem) => <span>{item.lineage}</span>}
            />
        );
    }
    return (
        <DownshiftCombobox
            allItems={data}
            value={selectedItem}
            filterItemsByInputValue={filterByInputValue}
            onChange={(item) =>
                onLineageChange?.({ [field]: item?.lineage ?? undefined } as { [key in Lineage]: string | undefined })
            }
            itemToString={(item) => item?.lineage ?? ''}
            placeholderText={placeholderText}
            formatItemInList={formatItemInList}
        />
    );
};

function filterByInputValue(item: LineageItem, inputValue: string | null) {
    if (inputValue === null || inputValue === '') {
        return true;
    }
    return item.lineage.toLowerCase().includes(inputValue.toLowerCase() || '');
}
