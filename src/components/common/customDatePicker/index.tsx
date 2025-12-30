import { useState, useEffect, useRef, forwardRef, useImperativeHandle } from "react";
import DatePicker from "@/components/ui/DatePicker";
import "./CustomDatePicker.css";

type CustomDatePickerProps = {
    title?: {
        text: string;
        className?: string;
    };
    startDate: Date | null;
    endDate: Date | null;
    onChange: (dates: { startDate: Date | null; endDate: Date | null }) => void;
    className?: string;
    startPlaceholder?: string;
    endPlaceholder?: string;
    width?: number | string;
    height?: number | string;
    fontSize?: number;
};

const CustomDatePicker = forwardRef<HTMLDivElement, CustomDatePickerProps>((props, ref) => {
    const { title, startDate, endDate, onChange, className = "", startPlaceholder = "", endPlaceholder = "", width = 120, height = 22, fontSize = 10 } = props;
    const propsWidth = typeof width === "number" ? `${width}px` : width;
    const propsHeight = typeof height === "number" ? `${height}px` : height;

    const datePickerRef = useRef<HTMLDivElement>(null);
    useImperativeHandle(ref, () => datePickerRef.current as HTMLDivElement);
    const [dates, setDates] = useState({
        startDate: startDate,
        endDate: endDate,
    });

    useEffect(() => {
        if (datePickerRef.current) {
            const inputHeight = datePickerRef.current.offsetHeight;

            const closeButtons = datePickerRef.current.querySelectorAll(".close-button");
            closeButtons.forEach((button) => {
                button.setAttribute("width", `${inputHeight * 0.1}px`);
                button.setAttribute("height", `${inputHeight * 0.1}px`);
            });

            const closeButtonSVGs = datePickerRef.current.querySelectorAll(".close-button svg");
            closeButtonSVGs.forEach((svg) => {
                svg.setAttribute("width", `${inputHeight * 0.3}px`);
                svg.setAttribute("height", `${inputHeight * 0.3}px`);
            });
        }
    }, [dates.startDate, dates.endDate]);

    const dateChange = (date: Date | null, type: "start" | "end") => {
        const updatedDates = {
            ...dates,
            [type === "start" ? "startDate" : "endDate"]: date,
        };

        setDates(updatedDates);

        if (updatedDates.startDate && updatedDates.endDate) {
            onChange(updatedDates);
        } else {
            onChange({ startDate: null, endDate: null });
        }
    };

    useEffect(() => {
        if (datePickerRef.current) {
            const inputs = datePickerRef.current.querySelectorAll('input');
            inputs.forEach(input => input.style.fontSize = `${fontSize}px`);
        }
    }, [fontSize]);

    return (
        <div ref={datePickerRef} className={`flex p-1 items-center gap-1 ${className}`}>
            {title?.text && (
                <div
                    className={title.className}
                >
                    {title.text}
                </div>
            )}
            {/* 시작 날짜 입력 필드 */}
            <div className="flex items-center">
                <DatePicker
                    placeholder={startPlaceholder}
                    value={dates.startDate}
                    maxDate={endDate || undefined}
                    className={`custom-datePicker-input h-[${propsHeight}] w-[${propsWidth}]`}
                    onChange={(date) => dateChange(date, "start")}
                />
            </div>

            <span className="text-gray-500">~</span>

            {/* 종료 날짜 입력 필드 */}
            <div className="flex items-center ">
                <DatePicker
                    placeholder={endPlaceholder}
                    value={dates.endDate}
                    minDate={startDate || undefined}
                    className={`custom-datePicker-input h-[${propsHeight}] w-[${propsWidth}]`}
                    onChange={(date) => dateChange(date, "end")}
                />
            </div>
        </div>
    )
});

CustomDatePicker.displayName = "CustomDatePicker";

export default CustomDatePicker;