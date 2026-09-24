import { useMemo } from 'react';

import { type WasapPageConfigFor } from '../../../../config/wasapPageConfig';
import { ResistancePageStateHandler } from '../../../../pageState/wasap/handlers/ResistancePageStateHandler';
import { ResistanceResult } from '../../../dataDisplay/ResistanceResult';
import { WasapResults } from '../../../dataDisplay/WasapResults';
import { ResistanceMutationsFilter } from '../../../filterSidebar/filters/ResistanceMutationsFilter';
import { ModePageLayout } from '../ModePageLayout';
import { useModePage } from '../useModePage';

export function ResistancePage({ config }: { config: WasapPageConfigFor<'resistance'> }) {
    const pageStateHandler = useMemo(() => new ResistancePageStateHandler(config), [config]);
    const page = useModePage(config, pageStateHandler);

    return (
        <ModePageLayout
            sidebar={
                // The only setting is the resistance set, so it is applied right away, without a button.
                <ResistanceMutationsFilter
                    pageState={page.analysis}
                    setPageState={(analysis) => page.setPageState((pageState) => ({ ...pageState, analysis }))}
                    resistanceSetNames={page.resistanceSetNames}
                />
            }
        >
            <WasapResults page={page}>
                {(data) => (
                    <ResistanceResult
                        page={page}
                        data={data}
                        onProportionRangeChange={(proportionRange) =>
                            page.setPageState((pageState) => ({
                                ...pageState,
                                analysis: { ...pageState.analysis, proportionRange },
                            }))
                        }
                    />
                )}
            </WasapResults>
        </ModePageLayout>
    );
}
