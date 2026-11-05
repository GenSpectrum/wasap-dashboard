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
}

export function LabeledField({ label, children, info }: LabeledFieldProps) {
    return (
        <div>
            <div className={`flex flex-row items-center justify-between gap-2 ${info !== undefined ? 'mb-2' : ''}`}>
                <label className='label'>
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
