import { DayPicker, getDefaultClassNames } from "react-day-picker";
import { ChevronDown, ChevronLeft, ChevronRight, Circle } from "lucide-react";
import "react-day-picker/style.css";
import { es } from "date-fns/locale";

interface CalendarProps {
  selected?: Date;
  onSelect: (date: Date | undefined) => void;
}

function Calendar({ selected, onSelect }: CalendarProps) {
  const defaultClassNames = getDefaultClassNames();
  const today = new Date();
  const startYear = new Date(2010, 0);
  const endYear = new Date(2027, 0);

  return (
    <div className="flex flex-col items-center justify-center text-gray-900">
      <DayPicker
        locale={es}
        mode="single"
        selected={selected}
        onSelect={onSelect}
        disabled={[{ before: today }]}
        startMonth={startYear}
        endMonth={endYear}
        classNames={{
          today: 'bg-gray-300 text-gray-900',
          selected: "text-white",
          root: `${defaultClassNames.root} shadow-lg p-3`,
          day: `group w-10 h-10 rounded-full ${defaultClassNames.day}`,
          caption_label: "text-base",
        }}
        components={{
          DayButton: (props) => {
            const { day, ...buttonProps } = props;
            return (
              <button
                {...buttonProps}
                className="bg-zinc-200 w-10 h-10 group-aria-selected:bg-blue-400 rounded-full"
                onClick={(e) => {
                  buttonProps.onClick?.(e);
                  onSelect(day.date);
                  const formattedDate = new Intl.DateTimeFormat("es-ES", {
                    day: "2-digit",
                    month: "2-digit",
                    year: "numeric"
                  }).format(day.date);
                }}
              />
            );
          },
          Chevron: ({ className, orientation, ...chevronProps }) => {
            switch (orientation) {
              case "left":
                return <ChevronLeft className={`${className} w-4 h-4 fill-amber-700`} {...chevronProps} />;
              case "right":
                return <ChevronRight className={`${className} w-4 h-4 fill-amber-700`} {...chevronProps} />;
              case "down":
              case "up":
                return <ChevronDown className={`${className} w-4 h-4 fill-amber-700`} {...chevronProps} />;
              default:
                return <Circle className={`${className} w-4 h-4 fill-amber-700`} />;
            }
          },
        }}
      />
    </div>
  );
}

export { Calendar };