import { type FC, useEffect, useState } from 'react';

import { parsePositionToken } from './parsePositionToken';
import { type SequenceType } from '../../../types/domain';
import { singleGraphColorRGBByName } from '../../ui/charts/colors';

export type PositionFilterProps = {
    sequenceType: SequenceType;
    /** Already-validated position labels, as produced by this component (see `parsePositionToken`). */
    initialValue: string[] | undefined;
    onPositionsChange: (positions: string[]) => void;
};

/**
 * A free-text list of bare sequence positions (no ref/alt symbol), e.g. `501` for
 * nucleotide or `S:501` for amino acid — the positions a co-occurrence pattern is
 * built from. Deliberately simpler than `MutationFilter`: there's no reference-genome
 * autocomplete to offer, just parsing and chip display.
 */
export const PositionFilter: FC<PositionFilterProps> = ({ sequenceType, initialValue, onPositionsChange }) => {
    const [selected, setSelected] = useState<string[]>(() => normalizeInitial(initialValue, sequenceType));
    const [inputValue, setInputValue] = useState('');
    const [showErrorIndicator, setShowErrorIndicator] = useState(false);

    useEffect(() => {
        setSelected((previous) => {
            const next = previous.filter((token) => parsePositionToken(token, sequenceType) !== null);
            if (next.length !== previous.length) {
                onPositionsChange(next);
            }
            return next;
        });
        // Only re-validate when the sequence type itself changes (e.g. nucleotide
        // positions no longer parse once amino acid is selected) — not on every
        // parent-driven `onPositionsChange`, which would re-run this on every commit.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [sequenceType]);

    const commit = (tokens: string[]) => {
        setSelected(tokens);
        onPositionsChange(tokens);
    };

    const addToken = (raw: string): boolean => {
        const parsed = parsePositionToken(raw, sequenceType);
        if (parsed === null) {
            return false;
        }
        if (!selected.includes(parsed.label)) {
            commit([...selected, parsed.label]);
        }
        setInputValue('');
        setShowErrorIndicator(false);
        return true;
    };

    const handleInputChange = (value: string) => {
        setShowErrorIndicator(false);
        if (!/[,\s]/.test(value)) {
            setInputValue(value);
            return;
        }

        const parts = value.split(/[,\s]+/).filter((part) => part !== '');
        const rejected: string[] = [];
        let next = selected;
        for (const part of parts) {
            const parsed = parsePositionToken(part, sequenceType);
            if (parsed === null) {
                rejected.push(part);
            } else if (!next.includes(parsed.label)) {
                next = [...next, parsed.label];
            }
        }
        commit(next);
        setInputValue(rejected.join(', '));
    };

    const removeToken = (token: string) => {
        commit(selected.filter((selectedToken) => selectedToken !== token));
    };

    return (
        <div>
            <div className='label'>
                <span>Positions</span>
            </div>
            <div className={`input flex h-fit w-full flex-wrap gap-x-1 p-1 ${showErrorIndicator ? 'input-error' : ''}`}>
                {selected.map((token) => (
                    <span
                        key={token}
                        className='my-1 inline-flex items-center px-2 py-1 text-black'
                        style={{ backgroundColor: singleGraphColorRGBByName('green', 0.4) }}
                    >
                        {token}
                        <button
                            className='ml-1 cursor-pointer'
                            aria-label={`remove position ${token}`}
                            onClick={() => removeToken(token)}
                        >
                            ×
                        </button>
                    </span>
                ))}
                <div className='flex grow gap-0.5 p-1'>
                    <input
                        placeholder={sequenceType === 'nucleotide' ? 'e.g. 23403' : 'e.g. S:501'}
                        className='w-full min-w-8 focus:outline-none'
                        value={inputValue}
                        onChange={(event) => handleInputChange(event.target.value)}
                        onKeyDown={(event) => {
                            if (event.key === 'Enter') {
                                event.preventDefault();
                                if (inputValue.trim() !== '' && !addToken(inputValue)) {
                                    setShowErrorIndicator(true);
                                }
                            }
                        }}
                        onBlur={() => {
                            if (inputValue.trim() !== '' && !addToken(inputValue)) {
                                setShowErrorIndicator(true);
                            }
                        }}
                        size={10}
                    />
                </div>
            </div>
        </div>
    );
};

function normalizeInitial(initialValue: string[] | undefined, sequenceType: SequenceType): string[] {
    if (initialValue === undefined) {
        return [];
    }
    const labels = initialValue
        .map((token) => parsePositionToken(token, sequenceType))
        .filter((token) => token !== null)
        .map((token) => token.label);
    return [...new Set(labels)];
}
