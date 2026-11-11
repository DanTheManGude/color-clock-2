"use client";

import { useSyncExternalStore } from "react";

function subscribe(callback: () => void) {
  const timer = setInterval(callback, 500);
  return () => clearInterval(timer);
}

let currentTimestamp = 0;

function getSnapshot(): number {
  const now = Date.now();
  if (Math.floor(now / 500) !== Math.floor(currentTimestamp / 500)) {
    currentTimestamp = now;
  }
  return currentTimestamp;
}

function getServerSnapshot(): number {
  return 0;
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

  // Calculate days elapsed in the current year (0 on Jan 1, 1 on Jan 2, etc.)
  const startOfYear = new Date(currentDate.getFullYear(), 0, 1);
  const dayOfYear = Math.floor(
    (currentDate.getTime() - startOfYear.getTime()) / 86400000,
  );

  const secondsSinceMidnight =
    currentDate.getHours() * 3600 +
    currentDate.getMinutes() * 60 +
    currentDate.getSeconds() +
    currentDate.getMilliseconds() / 1000;

  // Hue cycles 0° -> 360° every hour, offset by 60° for each day of the year
  const secondsInCurrentHour = secondsSinceMidnight % 3600;
  const baseHue = (secondsInCurrentHour / 3600) * 360;
  const hue = (baseHue + dayOfYear * 60) % 360;

  // Brightness (HSL Lightness) scales from 20% at midnight (0s & 86400s) to 80% at noon (43200s)
  const distanceFromMidnight = 43200 - Math.abs(43200 - secondsSinceMidnight);
  const lightness = 20 + (distanceFromMidnight / 43200) * 60;

  const backgroundColor = `hsl(${hue.toFixed(2)}, 70%, ${lightness.toFixed(2)}%)`;

  // Switch text to dark slate when background lightness exceeds 55% for readability
  const textColorClass = lightness > 55 ? "text-slate-900" : "text-white";

  return (
    <main
      style={{ backgroundColor }}
      className={`min-h-screen w-full flex flex-col items-center justify-center font-mono text-center transition-colors duration-500 ${textColorClass}`}
    >
      <div className="text-5xl font-bold mb-3">
        {currentDate.toLocaleTimeString()}
      </div>
      <div className="text-xl opacity-90">
        Seconds today: {secondsSinceMidnight.toFixed(1)}s
      </div>
      <div className="text-sm opacity-75 mt-2">
        Day {dayOfYear + 1} • {backgroundColor}
      </div>
    </main>
  );
}
