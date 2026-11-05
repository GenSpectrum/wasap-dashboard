import { type Placement } from '@floating-ui/utils';
import { type ReactNode } from 'react';

import { HoverTooltip } from './HoverTooltip';
import { Modal } from './Modal';

const SIZES = {
    /** Next to a panel title. */
    large: 'relative top-0.5 text-xl',
    /** Next to a field label in the sidebar. */
    small: 'text-lg',
};

/**
 * A help icon. With `info`, it shows it on hover or focus; with `infoModal`, a click opens it in a
 * large dialog, for long help texts.
 */
export function HelpButton({
    info,
    infoModal,
    ariaLabel,
    size = 'large',
    placement = 'bottom-start',
}: {
    info?: ReactNode;
    infoModal?: ReactNode;
    ariaLabel: string;
    size?: keyof typeof SIZES;
    placement?: Placement;
}) {
    const className = `flex items-center text-gray-500 hover:text-gray-800 ${SIZES[size]}`;
    const icon = <span className='iconify mdi--help-circle-outline' />;
    if (infoModal !== undefined) {
        return (
            <Modal buttonClassName={className} buttonAriaLabel={ariaLabel} modalContent={infoModal} size='large'>
                {icon}
            </Modal>
        );
    }
    return (
        <HoverTooltip content={info} placement={placement}>
            <button type='button' className={className} aria-label={ariaLabel}>
                {icon}
            </button>
        </HoverTooltip>
    );
}
