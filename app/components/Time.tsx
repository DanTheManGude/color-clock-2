"use client";

import { useSyncExternalStore } from "react";
import { CLOCK_CONFIG, ColorClock } from "../utils";

function subscribe(callback: () => void) {
  const timer = setInterval(callback, CLOCK_CONFIG.UPDATE_INTERVAL_MS);
  return () => clearInterval(timer);
}

let currentTimestamp = 0;

function getSnapshot(): number {
  const now = Date.now();
  if (
    Math.floor(now / CLOCK_CONFIG.UPDATE_INTERVAL_MS) !==
    Math.floor(currentTimestamp / CLOCK_CONFIG.UPDATE_INTERVAL_MS)
  ) {
    currentTimestamp = now;
  }
  return currentTimestamp;
}

function getServerSnapshot(): number {
  return 0;
}

const HUE_OFFSET_TICKS = ColorClock.getHueOffsetTickAngles();

export default function Time() {
  const timestamp = useSyncExternalStore(
    subscribe,
    getSnapshot,
    getServerSnapshot,
  );

  if (timestamp === 0) {
    return (
      <main className="min-h-screen w-full flex items-center justify-center bg-slate-900 text-white font-mono">
        <div className="text-xl">Loading...</div>
      </main>
    );
  }

  const currentDate = new Date(timestamp);
  const {
    dayOfYear,
    secondsSinceMidnight,
    minuteAngle,
    hourAngle,
    hue,
    lightness,
    isBright,
    backgroundColor,
    hueWheelGradient,
    brightnessRingGradient,
    hourTicks,
    weekDays,
  } = ColorClock.getClockState(currentDate);

  const textColorClass = isBright ? "text-slate-900" : "text-white";
  const handColorClass = isBright ? "bg-slate-900" : "bg-white";
  const hueTickClass = isBright ? "bg-slate-900/30" : "bg-white/35";
  const ringOutlineColor = isBright
    ? "rgba(15, 23, 42, 0.25)"
    : "rgba(255, 255, 255, 0.35)";
  const activeBorderClass = isBright
    ? "ring-2 ring-slate-900 scale-105"
    : "ring-2 ring-white scale-105";

  return (
    <main
      style={{ backgroundColor }}
      className={`min-h-screen w-full flex flex-col items-center justify-center p-6 font-mono text-center transition-colors duration-1000 ${textColorClass}`}
    >
      {/* Outer 12-Hour Black & White Brightness Ring */}
      <div
        style={{
          background: brightnessRingGradient,
          boxShadow: `0 0 0 3px ${ringOutlineColor}, 0 25px 50px -12px rgba(0, 0, 0, 0.25)`,
        }}
        className="relative w-64 h-64 rounded-full p-4 overflow-hidden mb-8 flex items-center justify-center"
        aria-label={`Color and 12-hour brightness clock showing ${Math.round(hue)} degrees hue and ${Math.round(lightness)}% brightness`}
      >
        {/* 12-Hour Tick Marks (each contrasted against the ring shade directly beneath it) */}
        {hourTicks.map(({ angle, isCardinal, isBrightUnderneath }) => {
          const tickContrastClass = isBrightUnderneath
            ? "bg-slate-900/85"
            : "bg-white/90";

          return (
            <div
              key={`hour-${angle}`}
              style={{ transform: `rotate(${angle}deg)` }}
              className="absolute inset-0 flex justify-center pointer-events-none"
            >
              <div
                className={`${
                  isCardinal ? "w-1 h-3" : "w-0.5 h-2"
                } mt-0.5 rounded-full transition-colors duration-1000 ${tickContrastClass}`}
              />
            </div>
          );
        })}

        {/* Inner Hue Color Wheel */}
        <div
          style={{
            background: hueWheelGradient,
            boxShadow: `0 0 0 2px ${ringOutlineColor}`,
          }}
          className="relative w-full h-full rounded-full overflow-hidden flex items-center justify-center"
        >
          {/* Subtle 40° Hue-Offset Tick Marks inside the Hue Wheel */}
          {HUE_OFFSET_TICKS.map((angle) => (
            <div
              key={`hue-${angle}`}
              style={{ transform: `rotate(${angle}deg)` }}
              className="absolute inset-0 flex justify-center pointer-events-none"
            >
              <div
                className={`w-0.5 h-2.5 mt-1 rounded-full ${hueTickClass}`}
              />
            </div>
          ))}

          {/* 12-Hour Hand */}
          <div
            style={{ transform: `rotate(${hourAngle}deg)` }}
            className="absolute inset-0 flex justify-center items-center transition-transform duration-1000 ease-linear"
          >
            <div
              className={`w-2 h-24 -translate-y-12 rounded-full ${handColorClass} shadow-md`}
            />
          </div>

          {/* Minute / Hue Hand */}
          <div
            style={{ transform: `rotate(${minuteAngle}deg)` }}
            className="absolute inset-0 flex justify-center items-center transition-transform duration-1000 ease-linear"
          >
            <div
              className={`w-1 h-20 -translate-y-10 rounded-full ${handColorClass} shadow-md`}
            />
          </div>

          {/* Center Clock Pin */}
          <div
            className={`w-4 h-4 rounded-full z-10 ${handColorClass} shadow`}
          />
        </div>
      </div>

      {/* Digital Readout */}
      <div className="text-5xl font-bold mb-3">
        {currentDate.toLocaleTimeString()}
      </div>
      <div className="text-xl opacity-90">
        Seconds today: {secondsSinceMidnight}s
      </div>
      <div className="text-sm opacity-75 mt-2 mb-8">
        Day {dayOfYear + 1} • Hue {hue.toFixed(1)}° • Lightness{" "}
        {lightness.toFixed(1)}%
      </div>

      {/* Current Week Starting Hue Boxes */}
      <div className="grid grid-cols-7 gap-2 sm:gap-3 w-full max-w-xl">
        {weekDays.map((day) => (
          <div
            key={day.label}
            style={{
              backgroundColor: `hsl(${day.startingHue}, ${CLOCK_CONFIG.SATURATION_PERCENT}%, 50%)`,
            }}
            className={`flex flex-col items-center justify-center py-3 px-2 rounded-xl text-white shadow-md transition-transform ${
              day.isToday ? activeBorderClass : "opacity-90"
            }`}
          >
            <span className="text-xs font-bold uppercase tracking-wider drop-shadow-sm">
              {day.label}
            </span>
            <span className="text-lg font-bold my-0.5 drop-shadow-sm">
              {day.dayNumber}
            </span>
            <span className="text-[11px] opacity-90 drop-shadow-sm">
              {day.startingHue}°
            </span>
          </div>
        ))}
      </div>
    </main>
  );
}
