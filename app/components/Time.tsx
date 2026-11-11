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
  const [isDebugOpen, setIsDebugOpen] = useState(false);

  if (timestamp === 0) {
    return (
      <main className="min-h-screen w-full flex items-center justify-center bg-slate-900 text-white font-mono">
        <div className="text-xl">Loading...</div>
      </main>
    );
  }

  const realDate = new Date(timestamp);
  const activeDate = new Date(timestamp + offsetMs);
  const isDebugActive = isDebugOpen || offsetMs !== 0;
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
        hueOffsetTicks={clockState.hueOffsetTicks}
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

      {/* Primary Hue / Lightness Summary */}
      <div className={`text-xl opacity-90 ${isDebugActive ? "mb-2" : "mb-8"}`}>
        Hue {clockState.hue.toFixed(1)}° • Lightness{" "}
        {clockState.lightness.toFixed(1)}%
      </div>

      {/* Debug-Only Seconds Today Readout */}
      {isDebugActive && (
        <div className="text-sm opacity-75 mb-8">
          Seconds today: {clockState.secondsSinceMidnight}s
          {offsetMs !== 0 && " • (Simulated)"}
        </div>
      )}

      <WeekHueStrip
        weekDays={clockState.weekDays}
        activeDayIndex={activeDate.getDay()}
        isBright={clockState.isBright}
        onSelectDayOffset={handleShiftDays}
      />

      <TimeDebugControls
        isOpen={isDebugOpen}
        onToggleOpen={() => setIsDebugOpen((open) => !open)}
        activeDate={activeDate}
        secondsSinceMidnight={clockState.secondsSinceMidnight}
        isSimulated={offsetMs !== 0}
        isBright={clockState.isBright}
        onScrubSeconds={handleScrubSeconds}
        onShiftDays={handleShiftDays}
        onReset={() => setOffsetMs(0)}
      />
    </main>
  );
}
