"use client";

import { useState, useSyncExternalStore } from "react";
import { CLOCK_CONFIG, ColorClock } from "../utils";
import ColorClockDial from "./ColorClockDial";
import WeekHueStrip from "./WeekHueStrip";
import TimeDebugControls from "./TimeDebugControls";

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

export default function Time() {
  const timestamp = useSyncExternalStore(
    subscribe,
    getSnapshot,
    getServerSnapshot,
  );
  const [offsetMs, setOffsetMs] = useState(0);

  if (timestamp === 0) {
    return (
      <main className="min-h-screen w-full flex items-center justify-center bg-slate-900 text-white font-mono">
        <div className="text-xl">Loading...</div>
      </main>
    );
  }

  const realDate = new Date(timestamp);
  const activeDate = new Date(timestamp + offsetMs);
  const clockState = ColorClock.getClockState(activeDate);

  const textColorClass = clockState.isBright ? "text-slate-900" : "text-white";

  const handleScrubSeconds = (targetSeconds: number) => {
    const targetDate = ColorClock.createDateAtSeconds(
      activeDate,
      targetSeconds,
    );
    setOffsetMs(targetDate.getTime() - realDate.getTime());
  };

  const handleShiftDays = (deltaDays: number) => {
    setOffsetMs((prev) => prev + deltaDays * CLOCK_CONFIG.MS_PER_DAY);
  };

  return (
    <main
      style={{ backgroundColor: clockState.backgroundColor }}
      className={`min-h-screen w-full flex flex-col items-center justify-center p-6 font-mono text-center transition-colors duration-500 ${textColorClass}`}
    >
      <ColorClockDial
        hueWheelGradient={clockState.hueWheelGradient}
        brightnessRingGradient={clockState.brightnessRingGradient}
        hourTicks={clockState.hourTicks}
        hourAngle={clockState.hourAngle}
        minuteAngle={clockState.minuteAngle}
        hue={clockState.hue}
        lightness={clockState.lightness}
        isBright={clockState.isBright}
      />

      {/* Digital Readout */}
      <div className="text-5xl font-bold mb-3">
        {activeDate.toLocaleTimeString()}
      </div>
      <div className="text-xl opacity-90">
        Seconds today: {clockState.secondsSinceMidnight}s
      </div>
      <div className="text-sm opacity-75 mt-2 mb-8">
        Day {clockState.dayOfYear + 1} • Hue {clockState.hue.toFixed(1)}° •
        Lightness {clockState.lightness.toFixed(1)}%{" "}
        {offsetMs !== 0 && "• (Simulated)"}
      </div>

      <WeekHueStrip
        weekDays={clockState.weekDays}
        activeDayIndex={activeDate.getDay()}
        isBright={clockState.isBright}
        onSelectDayOffset={handleShiftDays}
      />

      <TimeDebugControls
        activeDate={activeDate}
        secondsSinceMidnight={clockState.secondsSinceMidnight}
        isDebugActive={offsetMs !== 0}
        isBright={clockState.isBright}
        onScrubSeconds={handleScrubSeconds}
        onShiftDays={handleShiftDays}
        onReset={() => setOffsetMs(0)}
      />
    </main>
  );
}
