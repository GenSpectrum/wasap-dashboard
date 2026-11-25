import { type FC, useEffect, useRef, useState } from 'react';

type ToStringable = {
    toString: () => string;
};

export type DataValue = string | number | boolean | null | undefined | ToStringable;

export type CsvRows = Record<string, DataValue>[];

/** What a download's `getData` is handed: to stop when the button goes away, and to report how far it is. */
export type CsvDownloadContext = {
    /** Aborted when the button unmounts, e.g. because the filters changed. */
    signal: AbortSignal;
    /** How much of the data is in hand so far, as a fraction from 0 to 1; shown on the button. */
    onProgress: (fraction: number) => void;
};

export interface CsvDownloadButtonProps {
    /** Not shown, the button is an icon: used as its tooltip and accessible name. */
    label?: string;
    filename?: string;
    getData: (context: CsvDownloadContext) => CsvRows | Promise<CsvRows>;
    className?: string;
}

export const CsvDownloadButton: FC<CsvDownloadButtonProps> = ({
    label = 'Download',
    filename = 'data.csv',
    getData,
    className,
}) => {
    const [isDownloading, setIsDownloading] = useState(false);
    // `undefined` while `getData` has reported no progress: then the spinner shows on its own.
    const [progress, setProgress] = useState<number | undefined>(undefined);
    const [error, setError] = useState<string | undefined>(undefined);
    const abortController = useRef<AbortController | undefined>(undefined);

    useEffect(() => () => abortController.current?.abort(), []);

    const download = async () => {
        const controller = new AbortController();
        abortController.current = controller;
        setIsDownloading(true);
        setProgress(undefined);
        setError(undefined);
        try {
            const content = await getDownloadContent({ signal: controller.signal, onProgress: setProgress });
            if (controller.signal.aborted) {
                return;
            }
            const blob = new Blob([content], { type: 'text/csv' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = filename;
            a.click();
            URL.revokeObjectURL(url);
        } catch (caught) {
            if (!controller.signal.aborted) {
                setError(caught instanceof Error ? caught.message : String(caught));
            }
        } finally {
            setIsDownloading(false);
            setProgress(undefined);
        }
    };

    const getDownloadContent = async (context: CsvDownloadContext) => {
        const data = await getData(context);
        const keys = getDataKeys(data);
        const header = keys.join(',');
        const rows = data.map((row) => keys.map((key) => row[key]).join(',')).join('\n');
        return `${header}\n${rows}\n`;
    };

    const getDataKeys = (data: CsvRows) => {
        const keysSet = data
            .map((row) => Object.keys(row))
            .reduce((accumulatedKeys, keys) => {
                keys.forEach((key) => accumulatedKeys.add(key));
                return accumulatedKeys;
            }, new Set<string>());

        return [...keysSet];
    };

    const title = error === undefined ? label : `${label} (the last try failed: ${error})`;

    return (
        <button
            className={className}
            onClick={() => void download()}
            disabled={isDownloading}
            aria-label={label}
            title={title}
        >
            {isDownloading ? (
                <>
                    <span className='loading loading-spinner loading-xs' />
                    {progress !== undefined && (
                        <span className='tabular-nums' role='status'>
                            {Math.floor(progress * 100)}%
                        </span>
                    )}
                </>
            ) : (
                <span className={error === undefined ? 'iconify mdi--download' : 'iconify mdi--alert text-error'} />
            )}
        </button>
    );
};
