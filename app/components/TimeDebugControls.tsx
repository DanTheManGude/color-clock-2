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
  onShiftHours: (deltaHours: number) => void;
  onShiftDays: (deltaDays: number) => void;
  onReset: () => void;
}

const TIME_PRESETS = [
  { label: "Midnight", seconds: 0 },
  { label: "Noon", seconds: 12 * CLOCK_CONFIG.SECONDS_PER_HOUR },
] as const;

const SEASON_PRESETS = [
  { label: "Summer Solstice", month: 5, day: 21 },
  { label: "Winter Solstice", month: 11, day: 21 },
] as const;

export default function TimeDebugControls({
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
  onShiftHours,
  onShiftDays,
  onReset,
}: TimeDebugControlsProps) {
  const daysInYear = ColorClock.getDaysInYear(activeDate.getFullYear());

  const panelBgClass = isBright
    ? "bg-slate-900/10 border-slate-900/20"
    : "bg-white/10 border-white/20";
  const buttonBgClass = isBright
    ? "bg-slate-900/15 hover:bg-slate-900/25"
    : "bg-white/15 hover:bg-white/25";

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
        <div
          className={`mt-3 p-4 rounded-2xl border backdrop-blur-sm text-left space-y-4 ${panelBgClass}`}
        >
          {/* 24-Hour Time Scrubber Slider */}
          <div>
            <div className="flex justify-between text-xs font-semibold mb-1.5">
              <span>Time of Day Scrubber</span>
              <span>{activeDate.toLocaleTimeString()}</span>
            </div>
            <input
              type="range"
              min={0}
              max={CLOCK_CONFIG.SECONDS_PER_DAY - 1}
              step={CLOCK_CONFIG.SECONDS_PER_MINUTE}
              value={secondsSinceMidnight}
              onChange={(e) => onScrubSeconds(Number(e.target.value))}
              className="w-full accent-current cursor-pointer"
              aria-label="Scrub simulated time of day"
            />
          </div>

          {/* 365-Day Year Scrubber Slider */}
          <div>
            <div className="flex justify-between text-xs font-semibold mb-1.5">
              <span>Day of Year Scrubber</span>
              <span>
                {activeDate.toDateString()} ({dayOfYear + 1}/{daysInYear})
              </span>
            </div>
            <input
              type="range"
              min={0}
              max={daysInYear - 1}
              step={1}
              value={dayOfYear}
              onChange={(e) => onScrubDayOfYear(Number(e.target.value))}
              className="w-full accent-current cursor-pointer"
              aria-label="Scrub simulated day of the year"
            />
          </div>

          {/* Quick Time-of-Day, Season Presets & Hour/Day Stepping */}
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap gap-1.5">
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
            </div>

            <div className="flex flex-wrap gap-1.5">
              <button
                type="button"
                onClick={() => onShiftHours(-1)}
                className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors cursor-pointer ${buttonBgClass}`}
              >
                -1 Hr
              </button>
              <button
                type="button"
                onClick={() => onShiftHours(1)}
                className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors cursor-pointer ${buttonBgClass}`}
              >
                +1 Hr
              </button>
              <button
                type="button"
                onClick={() => onShiftDays(-1)}
                className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors cursor-pointer ${buttonBgClass}`}
              >
                -1 Day
              </button>
              <button
                type="button"
                onClick={() => onShiftDays(1)}
                className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors cursor-pointer ${buttonBgClass}`}
              >
                +1 Day
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
