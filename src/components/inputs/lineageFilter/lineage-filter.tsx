import { useMemo } from 'react';

import { useLineageOptions, type LineageItem } from '../../../dataLayer/hooks/lineageOptions';
import { ErrorBoundary } from '../../shared/error-boundary';
import { LoadingDisplay } from '../../shared/loading-display';
import { DownshiftCombobox, DownshiftMultiCombobox } from '../downshift-combobox';

export type LineageFilterProps<Lineage extends string = string> = {
    field: Lineage;
    placeholderText?: string;
    hideCounts?: boolean;
} & (
    | {
          multiSelect?: false;
          value?: string;
          onLineageChange?: (lineage: { [key in Lineage]: string | undefined }) => void;
      }
    | {
          multiSelect: true;
          value?: string[];
          onLineageMultiChange?: (lineage: { [key in Lineage]: string[] | undefined }) => void;
      }
);

export function LineageFilter<Lineage extends string = string>(props: LineageFilterProps<Lineage>) {
    return (
        <ErrorBoundary layout='horizontal' resetKeys={[props.field]}>
            <div className='min-h-12'>
                <LineageFilterWithoutErrors {...props} />
            </div>
        </ErrorBoundary>
    );
}

function LineageFilterWithoutErrors<Lineage extends string>(props: LineageFilterProps<Lineage>) {
    const { data, error, isLoading } = useLineageOptions(props.field);

    if (isLoading) {
        return <LoadingDisplay />;
    }

    if (error !== null) {
        throw error;
    }

    return <LineageSelector {...props} data={data ?? []} />;
}

function LineageSelector<Lineage extends string>(props: LineageFilterProps<Lineage> & { data: LineageItem[] }) {
    const { field, value, placeholderText, data, hideCounts = false } = props;
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

    if (props.multiSelect === true) {
        const { onLineageMultiChange } = props;
        return (
            <DownshiftMultiCombobox
                allItems={data}
                value={selectedItems}
                filterItemsByInputValue={filterByInputValue}
                onChange={(items) => {
                    const lineages = items.length > 0 ? items.map((item) => item.lineage) : undefined;
                    onLineageMultiChange?.({ [field]: lineages } as { [key in Lineage]: string[] | undefined });
                }}
                itemToString={lineageToString}
                placeholderText={placeholderText ?? 'Select lineages'}
                formatItemInList={formatItemInList}
                formatSelectedItem={(item: LineageItem) => <span>{item.lineage}</span>}
            />
        );
    }
    const { onLineageChange } = props;
    return (
        <DownshiftCombobox
            allItems={data}
            value={selectedItem}
            filterItemsByInputValue={filterByInputValue}
            onChange={(item) =>
                onLineageChange?.({ [field]: item?.lineage ?? undefined } as { [key in Lineage]: string | undefined })
            }
            itemToString={lineageToString}
            placeholderText={placeholderText}
            formatItemInList={formatItemInList}
        />
    );
}

function lineageToString(item: LineageItem | null | undefined) {
    return item?.lineage ?? '';
}

function filterByInputValue(item: LineageItem, inputValue: string | null) {
    if (inputValue === null || inputValue === '') {
        return true;
    }
    return item.lineage.toLowerCase().includes(inputValue.toLowerCase() || '');
}
