import { type Placement } from '@floating-ui/utils';
import { type ReactNode } from 'react';

import { HoverTooltip } from './HoverTooltip';

const SIZES = {
    /** Next to a panel title. */
    large: 'relative top-0.5 text-xl',
    /** Next to a field label in the sidebar. */
    small: 'text-lg',
};

/** A help icon that shows `info` on hover or focus. */
export function HelpButton({
    info,
    ariaLabel,
    size = 'large',
    placement = 'bottom-start',
}: {
    info: ReactNode;
    ariaLabel: string;
    size?: keyof typeof SIZES;
    placement?: Placement;
}) {
    const className = `flex items-center text-gray-500 hover:text-gray-800 ${SIZES[size]}`;
    return (
        <HoverTooltip content={info} placement={placement}>
            <button type='button' className={className} aria-label={ariaLabel}>
                <span className='iconify mdi--information-outline' />
            </button>
        </HoverTooltip>
    );
}
