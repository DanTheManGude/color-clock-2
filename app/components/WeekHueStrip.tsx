import { memo, useCallback, useMemo } from "react";
import { WeekDaySwatch } from "../lib/colorClock";

interface WeekHueStripProps {
  weekDays: WeekDaySwatch[];
  isBright: boolean;
  onSelectDayOffset: (deltaDays: number) => void;
}

interface SwatchButtonProps {
  day: WeekDaySwatch;
  baseBorderClass: string;
  activeBorderClass: string;
  onSelectDayOffset: (deltaDays: number) => void;
}

const SwatchButton = memo(function SwatchButton({
  day,
  baseBorderClass,
  activeBorderClass,
  onSelectDayOffset,
}: SwatchButtonProps) {
  const buttonStyle = useMemo(
    () => ({ backgroundColor: day.backgroundColor }),
    [day.backgroundColor],
  );

  const handleClick = useCallback(() => {
    onSelectDayOffset(day.dayOffset);
  }, [onSelectDayOffset, day.dayOffset]);

  return (
    <button
      type="button"
      onClick={handleClick}
      title={`Jump to ${day.label}`}
      style={buttonStyle}
      className={`flex flex-col items-center justify-center py-2.5 sm:py-3 px-3 rounded-xl shadow-md transition-transform cursor-pointer ${
        day.isBright ? "text-slate-900" : "text-slate-100"
      } ${
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
  );
});

function WeekHueStrip({
  weekDays,
  isBright,
  onSelectDayOffset,
}: WeekHueStripProps) {
  const baseBorderClass = useMemo(
    () =>
      isBright ? "border border-slate-900/25" : "border border-slate-100/30",
    [isBright],
  );

  const activeBorderClass = useMemo(
    () =>
      isBright
        ? "border border-slate-900/80 ring-2 ring-slate-900 scale-105"
        : "border border-slate-100/90 ring-2 ring-slate-100 scale-105",
    [isBright],
  );

  return (
    <div className="grid grid-cols-3 gap-2.5 sm:gap-3 w-full max-w-md mb-5 sm:mb-8">
      {weekDays.map((day) => (
        <SwatchButton
          key={day.label}
          day={day}
          baseBorderClass={baseBorderClass}
          activeBorderClass={activeBorderClass}
          onSelectDayOffset={onSelectDayOffset}
        />
      ))}
    </div>
  );
}

export default memo(WeekHueStrip);
