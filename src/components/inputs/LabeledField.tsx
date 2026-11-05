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
    /** Long help, opened in a large dialog by a click on the help icon (instead of `info`). */
    infoModal?: ReactNode;
}

export function LabeledField({ label, children, info, infoModal }: LabeledFieldProps) {
    const hasHelp = info !== undefined || infoModal !== undefined;
    return (
        <div>
            <div className={`flex flex-row items-center justify-between gap-2 ${hasHelp ? 'mb-2' : ''}`}>
                <label className='label'>
                    <span>{label}</span>
                </label>
                {hasHelp && (
                    <HelpButton
                        info={info}
                        infoModal={infoModal}
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
