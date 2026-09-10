import { type FC } from 'react';

import { MutationsOverTime, type MutationsOverTimeProps } from '../mutationsOverTime/mutations-over-time';

export type GsMutationsOverTimeProps = Omit<MutationsOverTimeProps, 'initialMeanProportionInterval'> & {
    initialMeanProportionInterval?: MutationsOverTimeProps['initialMeanProportionInterval'];
};

// Default reproduces the old gs-mutations-over-time Lit component's @property field initializer.
export const GsMutationsOverTime: FC<GsMutationsOverTimeProps> = ({
    initialMeanProportionInterval = { min: 0.05, max: 0.9 },
    ...rest
}) => <MutationsOverTime initialMeanProportionInterval={initialMeanProportionInterval} {...rest} />;
