import { type FC } from 'react';

interface ToggleIconButtonProps {
    /** The tooltip and accessible name of the button. */
    title: string;
    /** The iconify class of the icon, e.g. `mdi--percent`. */
    icon: string;
    pressed: boolean;
    onChange: (pressed: boolean) => void;
}

/** A small icon button for a setting that is on or off. It is filled while on. */
export const ToggleIconButton: FC<ToggleIconButtonProps> = ({ title, icon, pressed, onChange }) => {
    return (
        <button
            type='button'
            className={`btn btn-xs ${pressed ? 'border-neutral-600 bg-neutral-600 text-white' : ''}`}
            aria-label={title}
            title={title}
            aria-pressed={pressed}
            onClick={() => onChange(!pressed)}
        >
            <span className={`iconify ${icon}`} />
        </button>
    );
};
