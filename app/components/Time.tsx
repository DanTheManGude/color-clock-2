"use client";

import { useState, useSyncExternalStore } from "react";
import { CLOCK_CONFIG, ColorClock } from "../lib/colorClock";
import { useWakeLock } from "../hooks/useWakeLock";
import { useDynamicClockMetadata } from "../hooks/useDynamicClockMetadata";
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

  // Keep screen awake while clock is open
  useWakeLock(true);

  // Sync browser tab title, theme-color, and dynamic SVG favicon with live HSV color
  useDynamicClockMetadata(timestamp, offsetMs);

  const realDate = new Date(timestamp);
  const activeDate = new Date(timestamp + offsetMs);
  const clockState = ColorClock.getClockState(activeDate);

  const isSimulated = offsetMs !== 0;
  const isDebugActive = isDebugOpen || isSimulated;
  const textColorClass = clockState.isBright ? "text-slate-900" : "text-white";

  const handleScrubSeconds = (targetSeconds: number) => {
    const targetDate = ColorClock.createDateAtSeconds(
      activeDate,
      targetSeconds,
    );
    setOffsetMs(targetDate.getTime() - realDate.getTime());
  };

  const handleScrubDayOfYear = (targetDayOfYear: number) => {
    const targetDate = ColorClock.createDateAtDayOfYear(
      activeDate,
      targetDayOfYear,
    );
    setOffsetMs(targetDate.getTime() - realDate.getTime());
  };

  const handleJumpToMonthDay = (monthIndex: number, dayOfMonth: number) => {
    const targetDate = new Date(
      activeDate.getFullYear(),
      monthIndex,
      dayOfMonth,
      activeDate.getHours(),
      activeDate.getMinutes(),
      activeDate.getSeconds(),
    );
    setOffsetMs(targetDate.getTime() - realDate.getTime());
  };

  const handleShiftHours = (deltaHours: number) => {
    setOffsetMs(
      (prev) => prev + deltaHours * CLOCK_CONFIG.SECONDS_PER_HOUR * 1000,
    );
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
        value={clockState.value}
        isBright={clockState.isBright}
      />

      {/* Digital Date & Time Readout */}
      <div className="text-lg font-semibold uppercase tracking-widest opacity-80 mb-1">
        {activeDate.toLocaleDateString([], {
          weekday: "long",
          month: "short",
          day: "numeric",
        })}
      </div>
      <div className="text-5xl font-bold mb-3">
        {activeDate.toLocaleTimeString()}
      </div>

      {/* Primary Hue / Seasonal Saturation / Value Summary */}
      <div className="text-xl opacity-90 mb-1">
        {`Hue ${clockState.hue.toFixed(1)}° • Sat ${clockState.saturation.toFixed(1)}% • Value ${clockState.value.toFixed(1)}%`}
      </div>

      {/* Live RGB Readout */}
      <div
        className={`text-base opacity-85 ${isDebugActive ? "mb-2" : "mb-8"}`}
      >
        {`RGB(${clockState.rgb.r}, ${clockState.rgb.g}, ${clockState.rgb.b}) — ${clockState.hex}`}
      </div>

      {/* Debug-Only Seconds Today Readout */}
      {isDebugActive && (
        <div className="text-sm opacity-75 mb-8">
          Seconds today: {clockState.secondsSinceMidnight}s
          {isSimulated && " • (Simulated)"}
        </div>
      )}

      <WeekHueStrip
        weekDays={clockState.weekDays}
        isBright={clockState.isBright}
        onSelectDayOffset={handleShiftDays}
      />

      <TimeDebugControls
        isOpen={isDebugOpen}
        onToggleOpen={() => setIsDebugOpen((open) => !open)}
        activeDate={activeDate}
        dayOfYear={clockState.dayOfYear}
        secondsSinceMidnight={clockState.secondsSinceMidnight}
        isSimulated={isSimulated}
        isBright={clockState.isBright}
        onScrubSeconds={handleScrubSeconds}
        onScrubDayOfYear={handleScrubDayOfYear}
        onJumpToMonthDay={handleJumpToMonthDay}
        onShiftHours={handleShiftHours}
        onShiftDays={handleShiftDays}
        onReset={() => setOffsetMs(0)}
      />
    </main>
  );
}
