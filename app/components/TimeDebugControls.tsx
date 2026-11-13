import { ChangeEvent, memo, useCallback, useMemo } from "react";
import { CLOCK_CONFIG, ColorClock } from "../lib/colorClock";

interface TimeDebugControlsProps {
  isOpen: boolean;
  onToggleOpen: () => void;
  activeDate: Date;
  dayOfYear: number;
  secondsSinceMidnight: number;
  isSimulated: boolean;
  isBright: boolean;
  onScrubSeconds: (targetSeconds: number) => void;
  onScrubDayOfYear: (targetDayOfYear: number) => void;
  onJumpToMonthDay: (monthIndex: number, dayOfMonth: number) => void;
  onShiftMinutes: (deltaMinutes: number) => void;
  onShiftHours: (deltaHours: number) => void;
  onShiftDays: (deltaDays: number) => void;
  onReset: () => void;
}

const TIME_PRESETS = [
  { label: "Midnight", seconds: 0 },
  { label: "Noon", seconds: 12 * CLOCK_CONFIG.SECONDS_PER_HOUR },
] as const;

const SEASON_PRESETS = [
  { label: "Spring Equinox", month: 2, day: 21 },
  { label: "Summer Solstice", month: 5, day: 21 },
  { label: "Fall Equinox", month: 8, day: 21 },
  { label: "Winter Solstice", month: 11, day: 21 },
] as const;

interface DebugDrawerProps {
  activeDate: Date;
  dayOfYear: number;
  secondsSinceMidnight: number;
  panelBgClass: string;
  buttonBgClass: string;
  onScrubSeconds: (targetSeconds: number) => void;
  onScrubDayOfYear: (targetDayOfYear: number) => void;
  onJumpToMonthDay: (monthIndex: number, dayOfMonth: number) => void;
  onShiftMinutes: (deltaMinutes: number) => void;
  onShiftHours: (deltaHours: number) => void;
  onShiftDays: (deltaDays: number) => void;
}

const DebugDrawer = memo(function DebugDrawer({
  activeDate,
  dayOfYear,
  secondsSinceMidnight,
  panelBgClass,
  buttonBgClass,
  onScrubSeconds,
  onScrubDayOfYear,
  onJumpToMonthDay,
  onShiftMinutes,
  onShiftHours,
  onShiftDays,
}: DebugDrawerProps) {
  const year = useMemo(() => activeDate.getFullYear(), [activeDate]);

  const daysInYear = useMemo(() => ColorClock.getDaysInYear(year), [year]);

  const formattedTime = useMemo(
    () => activeDate.toLocaleTimeString(),
    [activeDate],
  );

  const formattedDateSummary = useMemo(
    () => `${activeDate.toDateString()} (${dayOfYear + 1}/${daysInYear})`,
    [activeDate, dayOfYear, daysInYear],
  );

  const handleSecondsChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      onScrubSeconds(Number(e.target.value));
    },
    [onScrubSeconds],
  );

  const handleDayOfYearChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      onScrubDayOfYear(Number(e.target.value));
    },
    [onScrubDayOfYear],
  );

  const handleMinus10Min = useCallback(
    () => onShiftMinutes(-10),
    [onShiftMinutes],
  );
  const handlePlus10Min = useCallback(
    () => onShiftMinutes(10),
    [onShiftMinutes],
  );
  const handleMinus1Min = useCallback(
    () => onShiftMinutes(-1),
    [onShiftMinutes],
  );
  const handlePlus1Min = useCallback(() => onShiftMinutes(1), [onShiftMinutes]);
  const handleMinusHour = useCallback(() => onShiftHours(-1), [onShiftHours]);
  const handlePlusHour = useCallback(() => onShiftHours(1), [onShiftHours]);
  const handleMinusDay = useCallback(() => onShiftDays(-1), [onShiftDays]);
  const handlePlusDay = useCallback(() => onShiftDays(1), [onShiftDays]);

  return (
    <div
      className={`mt-3 p-4 rounded-2xl border backdrop-blur-sm text-left space-y-4 ${panelBgClass}`}
    >
      {/* 24-Hour Time Scrubber Slider */}
      <div>
        <div className="flex justify-between text-xs font-semibold mb-1.5">
          <span>Time of Day Scrubber</span>
          <span>{formattedTime}</span>
        </div>
        <input
          type="range"
          min={0}
          max={CLOCK_CONFIG.SECONDS_PER_DAY - 1}
          step={CLOCK_CONFIG.SECONDS_PER_MINUTE}
          value={secondsSinceMidnight}
          onChange={handleSecondsChange}
          className="w-full accent-current cursor-pointer"
          aria-label="Scrub simulated time of day"
        />
      </div>

      {/* 365-Day Year Scrubber Slider */}
      <div>
        <div className="flex justify-between text-xs font-semibold mb-1.5">
          <span>Day of Year Scrubber</span>
          <span>{formattedDateSummary}</span>
        </div>
        <input
          type="range"
          min={0}
          max={daysInYear - 1}
          step={1}
          value={dayOfYear}
          onChange={handleDayOfYearChange}
          className="w-full accent-current cursor-pointer"
          aria-label="Scrub simulated day of the year"
        />
      </div>

      {/* Quick Time-of-Day, Season Presets & Hour/Day Stepping */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap gap-1.5">
          {SEASON_PRESETS.map((season) => (
            <button
              key={season.label}
              type="button"
              onClick={() => onJumpToMonthDay(season.month, season.day)}
              className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors cursor-pointer ${buttonBgClass}`}
            >
              {season.label}
            </button>
          ))}

          {TIME_PRESETS.map((preset) => (
            <button
              key={preset.label}
              type="button"
              onClick={() => onScrubSeconds(preset.seconds)}
              className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors cursor-pointer ${buttonBgClass}`}
            >
              {preset.label}
            </button>
          ))}

          <button
            type="button"
            onClick={handleMinusDay}
            className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors cursor-pointer ${buttonBgClass}`}
          >
            -1 Day
          </button>
          <button
            type="button"
            onClick={handlePlusDay}
            className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors cursor-pointer ${buttonBgClass}`}
          >
            +1 Day
          </button>
          <button
            type="button"
            onClick={handleMinusHour}
            className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors cursor-pointer ${buttonBgClass}`}
          >
            -1 Hr
          </button>
          <button
            type="button"
            onClick={handlePlusHour}
            className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors cursor-pointer ${buttonBgClass}`}
          >
            +1 Hr
          </button>
          <button
            type="button"
            onClick={handleMinus10Min}
            className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors cursor-pointer ${buttonBgClass}`}
          >
            -10 Min
          </button>
          <button
            type="button"
            onClick={handlePlus10Min}
            className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors cursor-pointer ${buttonBgClass}`}
          >
            +10 Min
          </button>
          <button
            type="button"
            onClick={handleMinus1Min}
            className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors cursor-pointer ${buttonBgClass}`}
          >
            -1 Min
          </button>
          <button
            type="button"
            onClick={handlePlus1Min}
            className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors cursor-pointer ${buttonBgClass}`}
          >
            +1 Min
          </button>
        </div>
      </div>
    </div>
  );
});

function TimeDebugControls({
  isOpen,
  onToggleOpen,
  activeDate,
  dayOfYear,
  secondsSinceMidnight,
  isSimulated,
  isBright,
  onScrubSeconds,
  onScrubDayOfYear,
  onJumpToMonthDay,
  onShiftMinutes,
  onShiftHours,
  onShiftDays,
  onReset,
}: TimeDebugControlsProps) {
  const panelBgClass = useMemo(
    () =>
      isBright
        ? "bg-slate-900/10 border-slate-900/20"
        : "bg-slate-100/10 border-slate-100/20",
    [isBright],
  );
  const buttonBgClass = useMemo(
    () =>
      isBright
        ? "bg-slate-900/15 hover:bg-slate-900/25"
        : "bg-slate-100/15 hover:bg-slate-100/25",
    [isBright],
  );

  return (
    <div className="w-full max-w-xl">
      <div className="flex items-center justify-center gap-2">
        <button
          type="button"
          onClick={onToggleOpen}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors cursor-pointer ${panelBgClass} ${buttonBgClass}`}
        >
          {isOpen ? "Hide Debug Time" : "Debug Time"}
        </button>
        {isSimulated && (
          <button
            type="button"
            onClick={onReset}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors cursor-pointer ${panelBgClass} ${buttonBgClass}`}
          >
            Reset to Live
          </button>
        )}
      </div>

      {isOpen && (
        <DebugDrawer
          activeDate={activeDate}
          dayOfYear={dayOfYear}
          secondsSinceMidnight={secondsSinceMidnight}
          panelBgClass={panelBgClass}
          buttonBgClass={buttonBgClass}
          onScrubSeconds={onScrubSeconds}
          onScrubDayOfYear={onScrubDayOfYear}
          onJumpToMonthDay={onJumpToMonthDay}
          onShiftMinutes={onShiftMinutes}
          onShiftHours={onShiftHours}
          onShiftDays={onShiftDays}
        />
      )}
    </div>
  );
}

export default memo(TimeDebugControls);
