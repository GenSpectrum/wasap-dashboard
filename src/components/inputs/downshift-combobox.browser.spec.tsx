import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render } from 'vitest-browser-react';

import { DownshiftCombobox } from './downshift-combobox';

type Item = { name: string };
const names = ['A', 'A.1', 'B', 'B.1'];

/** Like the filters do: new items, a new selected item and a new `itemToString` on every render. */
function combobox(value: string | null, onChange: (item: Item | null) => void) {
    const items = names.map((name) => ({ name }));
    return (
        <DownshiftCombobox
            allItems={items}
            value={items.find((item) => item.name === value) ?? null}
            filterItemsByInputValue={(item, input) => item.name.includes(input)}
            onChange={onChange}
            itemToString={(item) => item?.name ?? ''}
            placeholderText='Lineage'
            formatItemInList={(item) => <span>{item.name}</span>}
        />
    );
}

function Controlled({ onChange }: { onChange: (item: Item | null) => void }) {
    const [value, setValue] = useState<string | null>('A');
    return combobox(value, (item) => {
        setValue(item?.name ?? null);
        onChange(item);
    });
}

describe('DownshiftCombobox', () => {
    it('keeps what is typed, and the items it matches, when the parent renders again', async () => {
        const screen = render(combobox('A', vi.fn()));
        const input = screen.getByPlaceholder('Lineage');
        await expect.element(input).toHaveValue('A');

        await input.fill('B');
        await expect.element(screen.getByRole('option', { name: 'B.1' })).toBeInTheDocument();
        await expect.element(screen.getByRole('option', { name: 'A.1' })).not.toBeInTheDocument();

        screen.rerender(combobox('A', vi.fn()));

        await expect.element(input).toHaveValue('B');
        await expect.element(screen.getByRole('option', { name: 'B.1' })).toBeInTheDocument();
        await expect.element(screen.getByRole('option', { name: 'A.1' })).not.toBeInTheDocument();
    });

    it('shows the item picked and reports it', async () => {
        const onChange = vi.fn();
        const screen = render(<Controlled onChange={onChange} />);
        const input = screen.getByPlaceholder('Lineage');

        await input.fill('B');
        await screen.getByRole('option', { name: 'B.1' }).click();

        expect(onChange).toHaveBeenLastCalledWith({ name: 'B.1' });
        await expect.element(input).toHaveValue('B.1');
    });

    it('shows a value that changes from outside', async () => {
        const screen = render(combobox('A', vi.fn()));
        await expect.element(screen.getByPlaceholder('Lineage')).toHaveValue('A');

        screen.rerender(combobox('B.1', vi.fn()));

        await expect.element(screen.getByPlaceholder('Lineage')).toHaveValue('B.1');
    });
});
