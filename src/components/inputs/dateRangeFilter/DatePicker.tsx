import flatpickr from 'flatpickr';
import { useEffect, useRef, useState } from 'react';
import 'flatpickr/dist/flatpickr.css';
import './datePicker.css';

const DATE_FORMAT = 'Y-m-d';

/** A date field with a calendar. Dates are `YYYY-MM-DD`, read as calendar dates (no time zone shift). */
export function DatePicker({
    onChange,
    value,
    minDate,
    maxDate,
    placeholderText,
    className,
}: {
    /** Called with a date picked in the calendar, or typed (once the field loses the focus, or on Enter). */
    onChange?: (date: string | undefined) => void;
    value?: string;
    minDate?: string;
    maxDate?: string;
    placeholderText?: string;
    className?: string;
}) {
    const inputRef = useRef<HTMLInputElement>(null);

    const [datePicker, setDatePicker] = useState<flatpickr.Instance | null>(null);

    const calendarRef = useRef<HTMLDivElement>(null);

    // The calendar reports with the current `onChange`, without being set up again for each new one.
    const onChangeRef = useRef(onChange);
    onChangeRef.current = onChange;
    // The date last given or reported, so that each change is reported once.
    const reportedRef = useRef(value);

    // Set up once: setting it up again (e.g. for a new `minDate` once the other date of a range is
    // in) would put back the old date over one being typed in the meantime.
    useEffect(() => {
        if (!inputRef.current || !calendarRef.current) {
            return;
        }

        const report = (dateString: string) => {
            const date = dateString === '' ? undefined : dateString;
            if (date !== reportedRef.current) {
                reportedRef.current = date;
                onChangeRef.current?.(date);
            }
        };

        const instance = flatpickr(inputRef.current, {
            allowInput: true,
            dateFormat: DATE_FORMAT,
            appendTo: calendarRef.current,
            // Positioned under the field by CSS, not at page coordinates: those are off inside a
            // positioned container, such as the dropdown it is in.
            static: true,
            // A day picked, or a date typed (on Enter or blur) or cleared.
            onChange: (_, dateString) => report(dateString),
            // Also a date typed: a click elsewhere while the calendar is open takes it, but without `onChange`.
            onClose: (_, dateString) => report(dateString),
        });

        setDatePicker(instance);

        return () => {
            instance.destroy();
        };
    }, []);

    useEffect(() => {
        datePicker?.set({ minDate, maxDate });
    }, [datePicker, minDate, maxDate]);

    useEffect(() => {
        reportedRef.current = value;
        if (datePicker !== null && datePicker.input.value !== (value ?? '')) {
            datePicker.setDate(value ?? [], false);
        }
    }, [datePicker, value]);

    return (
        <div className='relative w-full'>
            <input className={`input w-full ${className}`} type='text' placeholder={placeholderText} ref={inputRef} />
            <div ref={calendarRef} />
        </div>
    );
}
