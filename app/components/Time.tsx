"use client";

import { useState } from "react";
import { CLOCK_CONFIG, ColorClock } from "../lib/colorClock";
import { useLiveTimestamp } from "../hooks/useLiveTimestamp";
import { useWakeLock } from "../hooks/useWakeLock";
import { useDynamicClockMetadata } from "../hooks/useDynamicClockMetadata";
import ColorClockDial from "./ColorClockDial";
import ClockReadout from "./ClockReadout";
import WeekHueStrip from "./WeekHueStrip";
import TimeDebugControls from "./TimeDebugControls";

export default function Time() {
  const timestamp = useLiveTimestamp();
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

      <ClockReadout
        activeDate={activeDate}
        hue={clockState.hue}
        saturation={clockState.saturation}
        value={clockState.value}
        hex={clockState.hex}
        rgb={clockState.rgb}
        secondsSinceMidnight={clockState.secondsSinceMidnight}
        isDebugActive={isDebugActive}
        isSimulated={isSimulated}
      />

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
