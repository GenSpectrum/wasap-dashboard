import type { ResistanceAnalysis } from '../../../pageState/wasap/analysisFilter';
import { RadioSelect } from '../../inputs/RadioSelect';

export function ResistanceMutationsFilter({
    pageState,
    setPageState,
    resistanceSetNames,
}: {
    pageState: ResistanceAnalysis;
    setPageState: (newState: ResistanceAnalysis) => void;
    resistanceSetNames: string[];
}) {
    if (resistanceSetNames.length === 0) {
        return <p className='text-error'>Resistance mutation sets could not be loaded.</p>;
    }

    return (
        <RadioSelect
            label='Resistance mutation set'
            value={pageState.resistanceSet}
            options={resistanceSetNames.map((name) => ({ value: name, label: name }))}
            onChange={(resistanceSet) => setPageState({ ...pageState, resistanceSet })}
            direction='vertical'
        />
    );
}
