import type { ReactNode } from 'react';

import { HelpButton } from '../ui/HelpButton';

interface LabeledFieldProps {
    /**
     * The text label displayed above the field
     */
    label: string;
    /**
     * The form control element(s) to be displayed under the label
     */
    children: React.ReactNode;
    /** Help shown on hover or focus of a help icon next to the label. */
    info?: ReactNode;
    /** An id for the label, for a field to name itself by (`aria-labelledby`) that a `<label>` can't name. */
    labelId?: string;
}

export function LabeledField({ label, children, info, labelId }: LabeledFieldProps) {
    return (
        <div>
            <div className={`flex flex-row items-center justify-between gap-2 ${info !== undefined ? 'mb-2' : ''}`}>
                <label id={labelId} className='label'>
                    <span>{label}</span>
                </label>
                {info !== undefined && (
                    <HelpButton
                        info={info}
                        ariaLabel={`Show information about ${label}`}
                        size='small'
                        placement='right-start'
                    />
                )}
            </div>
            {children}
        </div>
    );
}
