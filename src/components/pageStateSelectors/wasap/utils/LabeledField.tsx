import type { ReactNode } from 'react';

import { Modal } from '../../../shared/modal';

interface LabeledFieldProps {
    /**
     * The text label displayed above the field
     */
    label: string;
    /**
     * The form control element(s) to be displayed under the label
     */
    children: React.ReactNode;
    /**
     * Optional informational content displayed in a modal when the user clicks the "?" button.
     * If provided, a help button will be shown next to the label.
     */
    info?: ReactNode;
}

export function LabeledField({ label, children, info }: LabeledFieldProps) {
    return (
        <div className='form-control'>
            <div className={`flex flex-row items-baseline justify-between gap-2 ${info !== undefined ? 'mb-2' : ''}`}>
                <label className='label'>
                    <span className='label-text'>{label}</span>
                </label>
                {info !== undefined && (
                    <Modal
                        buttonClassName='btn btn-xs'
                        buttonAriaLabel={`Show information about ${label}`}
                        modalContent={info}
                        size='large'
                    >
                        ?
                    </Modal>
                )}
            </div>
            {children}
        </div>
    );
}
