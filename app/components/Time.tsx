"use client";

import { useSyncExternalStore } from "react";

const UPDATE_INTERVAL_MS = 1000;
const DAILY_HUE_OFFSET = 70;
const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function subscribe(callback: () => void) {
  const timer = setInterval(callback, UPDATE_INTERVAL_MS);
  return () => clearInterval(timer);
}

let currentTimestamp = 0;

function getSnapshot(): number {
  const now = Date.now();
  if (
    Math.floor(now / UPDATE_INTERVAL_MS) !==
    Math.floor(currentTimestamp / UPDATE_INTERVAL_MS)
  ) {
    currentTimestamp = now;
  }
  return currentTimestamp;
}

function getServerSnapshot(): number {
  return 0;
}

// Helper to compute exact lightness (20% at midnight -> 80% at noon) for any second of the day
function getLightnessAtSecond(seconds: number): number {
  const normalized = ((seconds % 86400) + 86400) % 86400;
  const distanceFromMidnight = 43200 - Math.abs(43200 - normalized);
  return 20 + (distanceFromMidnight / 43200) * 60;
}

// DST-safe day of year calculation (0 on Jan 1, 1 on Jan 2, etc.)
function getDayOfYear(date: Date): number {
  const utcDate = Date.UTC(date.getFullYear(), date.getMonth(), date.getDate());
  const utcStartOfYear = Date.UTC(date.getFullYear(), 0, 1);
  return Math.floor((utcDate - utcStartOfYear) / 86400000);
}

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
  const dayOfYear = getDayOfYear(currentDate);
  const currentDayOfWeek = currentDate.getDay(); // 0 (Sun) -> 6 (Sat)

  const secondsSinceMidnight =
    currentDate.getHours() * 3600 +
    currentDate.getMinutes() * 60 +
    currentDate.getSeconds();

  // 1. Hue & Minute Hand (cycles 0° -> 360° every hour)
  const secondsInCurrentHour = secondsSinceMidnight % 3600;
  const minuteAngle = (secondsInCurrentHour / 3600) * 360;

  // Daily offset of 40° places today's noon/midnight hue at 12 o'clock on the inner wheel
  const dayOffset = (dayOfYear * DAILY_HUE_OFFSET) % 360;
  const hue = (minuteAngle + dayOffset) % 360;

  // 2. Standard 12-Hour Hand & Current Lightness
  const hourAngle = ((secondsSinceMidnight % 43200) / 43200) * 360;
  const lightness = getLightnessAtSecond(secondsSinceMidnight);

  const backgroundColor = `hsl(${hue.toFixed(2)}, 70%, ${lightness.toFixed(2)}%)`;

  // Dynamic contrast for text and clock hands
  const isBright = lightness > 55;
  const textColorClass = isBright ? "text-slate-900" : "text-white";
  const handColorClass = isBright ? "bg-slate-900" : "bg-white";
  const ringOutlineColor = isBright
    ? "rgba(15, 23, 42, 0.25)"
    : "rgba(255, 255, 255, 0.35)";
  const activeBorderClass = isBright
    ? "ring-2 ring-slate-900 scale-105"
    : "ring-2 ring-white scale-105";

  // Inner hue wheel rotated so today's noon/midnight hue is at 12 o'clock
  const wheelStartAngle = (360 - dayOffset) % 360;
  const hueWheelGradient = `conic-gradient(from ${wheelStartAngle}deg,
    hsl(0, 70%, ${lightness}%),
    hsl(60, 70%, ${lightness}%),
    hsl(120, 70%, ${lightness}%),
    hsl(180, 70%, ${lightness}%),
    hsl(240, 70%, ${lightness}%),
    hsl(300, 70%, ${lightness}%),
    hsl(360, 70%, ${lightness}%)
  )`;

  // Outer 12-Hour Black & White Brightness Ring
  const brightnessStops = Array.from({ length: 25 }, (_, i) => {
    const offsetHours = i - 12;
    const angleDeg = i * 15;
    const stopLightness = getLightnessAtSecond(
      secondsSinceMidnight + offsetHours * 3600,
    );
    return `hsl(0, 0%, ${stopLightness.toFixed(1)}%) ${angleDeg}deg`;
  }).join(", ");

  const ringStartAngle = (hourAngle + 180) % 360;
  const brightnessRingGradient = `conic-gradient(from ${ringStartAngle.toFixed(2)}deg, ${brightnessStops})`;

  // Build the 7 days of the current week (Sunday -> Saturday) with each day's 40°-stepped starting hue
  const weekDays = DAY_LABELS.map((label, index) => {
    const dateForDay = new Date(
      currentDate.getFullYear(),
      currentDate.getMonth(),
      currentDate.getDate() + (index - currentDayOfWeek),
    );
    const targetDayOfYear = getDayOfYear(dateForDay);
    const startingHue =
      (((targetDayOfYear * DAILY_HUE_OFFSET) % 360) + 360) % 360;
    const isToday = index === currentDayOfWeek;

    return {
      label,
      dayNumber: dateForDay.getDate(),
      startingHue,
      isToday,
    };
  });

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
        {/* Inner Hue Color Wheel */}
        <div
          style={{
            background: hueWheelGradient,
            boxShadow: `0 0 0 2px ${ringOutlineColor}`,
          }}
          className="relative w-full h-full rounded-full overflow-hidden flex items-center justify-center"
        >
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
            style={{ backgroundColor: `hsl(${day.startingHue}, 70%, 50%)` }}
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
