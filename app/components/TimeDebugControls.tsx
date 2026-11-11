"use client";

import { useState } from "react";
import { CLOCK_CONFIG } from "../utils";

interface TimeDebugControlsProps {
  activeDate: Date;
  secondsSinceMidnight: number;
  isDebugActive: boolean;
  isBright: boolean;
  onScrubSeconds: (targetSeconds: number) => void;
  onShiftDays: (deltaDays: number) => void;
  onReset: () => void;
}

const TIME_PRESETS = [
  { label: "Midnight", seconds: 0 },
  { label: "6:00 AM", seconds: 6 * CLOCK_CONFIG.SECONDS_PER_HOUR },
  { label: "Noon", seconds: 12 * CLOCK_CONFIG.SECONDS_PER_HOUR },
  { label: "6:00 PM", seconds: 18 * CLOCK_CONFIG.SECONDS_PER_HOUR },
] as const;

export default function TimeDebugControls({
  activeDate,
  secondsSinceMidnight,
  isDebugActive,
  isBright,
  onScrubSeconds,
  onShiftDays,
  onReset,
}: TimeDebugControlsProps) {
  const [isOpen, setIsOpen] = useState(false);

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
          onClick={() => setIsOpen((open) => !open)}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors cursor-pointer ${panelBgClass} ${buttonBgClass}`}
        >
          {isOpen ? "Hide Debug Time" : "Debug Time"}
        </button>
        {isDebugActive && (
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
              <span>{activeDate.toDateString()}</span>
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

          {/* Quick Time-of-Day Presets & Day Stepping */}
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
            </div>

            <div className="flex gap-1.5">
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
