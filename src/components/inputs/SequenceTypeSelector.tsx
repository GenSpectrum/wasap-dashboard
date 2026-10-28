import { RadioSelect } from './RadioSelect';
import { type SequenceType } from '../../domain/mutations';

export function SequenceTypeSelector({
    value,
    onChange,
}: {
    value: SequenceType;
    onChange: (newType: SequenceType) => void;
}) {
    return (
        <RadioSelect
            label='Sequence type'
            value={value}
            options={[
                { value: 'nucleotide', label: 'Nucleotide' },
                { value: 'amino acid', label: 'Amino acid' },
            ]}
            onChange={onChange}
        />
    );
}
