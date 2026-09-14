import {
    useCallback,
    useEffect,
    useState,
    type FormEvent,
    type Dispatch,
    type FC,
    type JSX,
    type SetStateAction,
} from 'react';

import { Dropdown } from './dropdown';
import { useRawMutationAnnotations } from '../MutationAnnotationsContext';
import { type MutationFilter } from '../mutationsOverTime/getFilteredMutationCodes';
import { DeleteIcon } from './icons/DeleteIcon';

export type MutationsOverTimeMutationsFilterProps = {
    setFilterValue: Dispatch<SetStateAction<MutationFilter>>;
    value: MutationFilter;
};

export function MutationsOverTimeMutationsFilter({ setFilterValue, value }: MutationsOverTimeMutationsFilterProps) {
    return (
        <div className={'inline-flex w-28'}>
            <Dropdown buttonTitle={getButtonTitle(value)} placement={'bottom-start'}>
                <TextInput value={value} setFilterValue={setFilterValue} />
                <AnnotationCheckboxes value={value} setFilterValue={setFilterValue} />
            </Dropdown>
        </div>
    );
}

function getButtonTitle(value: MutationFilter) {
    if (value.textFilter === '' && value.annotationNameFilter.size === 0) {
        return `Filter mutations`;
    }

    return [value.textFilter, ...value.annotationNameFilter].filter((it) => it !== '').join(', ');
}

const TextInput: FC<MutationsOverTimeMutationsFilterProps> = ({ setFilterValue, value }) => {
    const onInput = useCallback(
        (newValue: string) => {
            setFilterValue((previousFilter) => ({
                ...previousFilter,
                textFilter: newValue,
            }));
        },
        [setFilterValue],
    );

    const onDeleteClick = () => {
        setFilterValue((previousFilter) => ({
            ...previousFilter,
            textFilter: '',
        }));
    };

    return (
        <div>
            <label className='input input-xs flex gap-1'>
                <DebouncedInput placeholder={'Filter'} onInput={onInput} value={value.textFilter} type='text' />
                {value.textFilter !== '' && (
                    <button className={'cursor-pointer'} onClick={onDeleteClick}>
                        <DeleteIcon />
                    </button>
                )}
            </label>
        </div>
    );
};

function DebouncedInput({
    value: initialValue,
    onInput,
    debounce = 500,
    ...props
}: {
    onInput: (value: string) => void;
    debounce?: number;
    value?: string;
} & Omit<JSX.IntrinsicElements['input'], 'onInput'>) {
    const [value, setValue] = useState<string | undefined>(initialValue);

    useEffect(() => {
        setValue(initialValue);
    }, [initialValue]);

    useEffect(() => {
        const timeout = setTimeout(() => {
            onInput(value ?? '');
        }, debounce);

        return () => clearTimeout(timeout);
    }, [value, debounce, onInput]);

    const onChangeInput = useCallback((event: FormEvent<HTMLInputElement>) => {
        setValue(event.currentTarget.value);
    }, []);

    return <input {...props} value={value} onInput={onChangeInput} />;
}

const AnnotationCheckboxes: FC<MutationsOverTimeMutationsFilterProps> = ({ value, setFilterValue }) => {
    const mutationAnnotations = useRawMutationAnnotations();

    if (mutationAnnotations.length === 0) {
        return null;
    }

    return (
        <>
            <div className='divider mt-0.5 mb-0' />
            <div className='text-sm'>
                <div className='mb-1 font-bold'>Filter by annotations</div>
                <div className='max-h-72 overflow-scroll'>
                    {mutationAnnotations.map((annotation, index) => (
                        <li className='flex flex-row items-center' key={annotation.name}>
                            <label>
                                <input
                                    className={'mr-2'}
                                    type='checkbox'
                                    id={`item-${index}`}
                                    checked={value.annotationNameFilter.has(annotation.name)}
                                    onChange={() => {
                                        setFilterValue((previousFilter) => {
                                            const newAnnotationFilter = previousFilter.annotationNameFilter.has(
                                                annotation.name,
                                            )
                                                ? [...previousFilter.annotationNameFilter].filter(
                                                      (name) => name !== annotation.name,
                                                  )
                                                : [...previousFilter.annotationNameFilter, annotation.name];
                                            return {
                                                ...previousFilter,
                                                annotationNameFilter: new Set(newAnnotationFilter),
                                            };
                                        });
                                    }}
                                />
                                {annotation.name} (<span className='text-red-600'>{annotation.symbol}</span>)
                            </label>
                        </li>
                    ))}
                </div>
            </div>
        </>
    );
};
