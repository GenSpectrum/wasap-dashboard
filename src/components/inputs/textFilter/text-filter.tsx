import { useStringFieldOptions } from '../../../dataLayer/hooks/stringFieldOptions';
import { ErrorBoundary } from '../../shared/error-boundary';
import { LoadingDisplay } from '../../shared/loading-display';
import { DownshiftCombobox } from '../downshift-combobox';

export type TextFilterProps<Field extends string = string> = {
    field: Field;
    placeholderText?: string;
    value?: string;
    hideCounts?: boolean;
    onInputChange?: (input: { [key in Field]: string | undefined }) => void;
};

export function TextFilter<Field extends string = string>(props: TextFilterProps<Field>) {
    return (
        <ErrorBoundary layout='horizontal' resetKeys={[props.field]}>
            <div className='h-12'>
                <TextFilterWithoutErrors {...props} />
            </div>
        </ErrorBoundary>
    );
}

function TextFilterWithoutErrors<Field extends string>(props: TextFilterProps<Field>) {
    const { data, error, isLoading } = useStringFieldOptions(props.field);

    if (isLoading) {
        return <LoadingDisplay />;
    }

    if (error !== null) {
        throw error;
    }

    return (
        <TextSelector {...props} data={(data ?? []).map((option) => ({ value: option.name, count: option.count }))} />
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
}: TextFilterProps<Field> & {
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
