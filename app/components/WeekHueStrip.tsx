import { WeekDaySwatch } from "../lib/colorClock";

interface WeekHueStripProps {
  weekDays: WeekDaySwatch[];
  activeDayIndex: number;
  isBright: boolean;
  onSelectDayOffset: (deltaDays: number) => void;
}

export default function WeekHueStrip({
  weekDays,
  activeDayIndex,
  isBright,
  onSelectDayOffset,
}: WeekHueStripProps) {
  const baseBorderClass = isBright
    ? "border border-slate-900/25"
    : "border border-white/30";

  const activeBorderClass = isBright
    ? "border border-slate-900/80 ring-2 ring-slate-900 scale-105"
    : "border border-white/90 ring-2 ring-white scale-105";

  return (
    <div className="grid grid-cols-7 gap-2 sm:gap-3 w-full max-w-xl mb-8">
      {weekDays.map((day, index) => (
        <button
          key={day.label}
          type="button"
          onClick={() => onSelectDayOffset(index - activeDayIndex)}
          title={`Jump to ${day.label}`}
          style={{ backgroundColor: day.backgroundColor }}
          className={`flex flex-col items-center justify-center py-3 px-2 rounded-xl text-white shadow-md transition-transform cursor-pointer ${
            day.isToday
              ? activeBorderClass
              : `${baseBorderClass} opacity-90 hover:opacity-100`
          }`}
        >
          <span className="text-xs font-bold uppercase tracking-wider drop-shadow-sm">
            {day.label}
          </span>
          <span className="text-sm font-semibold mt-1 opacity-95 drop-shadow-sm">
            {day.startingHue}°
          </span>
        </button>
      ))}
    </div>
  );
}
