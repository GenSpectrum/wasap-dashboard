import { type FC } from 'react';

import { QueriesOverTime, type QueriesOverTimeProps } from '../preact/queriesOverTime/queries-over-time';

export type GsQueriesOverTimeProps = Omit<QueriesOverTimeProps, 'initialMeanProportionInterval'> & {
    initialMeanProportionInterval?: QueriesOverTimeProps['initialMeanProportionInterval'];
};

// Default reproduces the old gs-queries-over-time Lit component's @property field initializer.
export const GsQueriesOverTime: FC<GsQueriesOverTimeProps> = ({
    initialMeanProportionInterval = { min: 0, max: 1 },
    ...rest
}) => <QueriesOverTime initialMeanProportionInterval={initialMeanProportionInterval} {...rest} />;
