"use client";

import { useCallback, useMemo, useState } from "react";
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

  const activeDate = useMemo(
    () => new Date(timestamp + offsetMs),
    [timestamp, offsetMs],
  );

  const clockState = useMemo(
    () => ColorClock.getClockState(activeDate),
    [activeDate],
  );

  const isSimulated = offsetMs !== 0;
  const isDebugActive = isDebugOpen || isSimulated;
  const textColorClass = clockState.isBright ? "text-slate-900" : "text-white";

  const mainStyle = useMemo(
    () => ({ backgroundColor: clockState.backgroundColor }),
    [clockState.backgroundColor],
  );

  const handleToggleDebugOpen = useCallback(() => {
    setIsDebugOpen((open) => !open);
  }, []);

  const handleReset = useCallback(() => {
    setOffsetMs(0);
  }, []);

  const handleScrubSeconds = useCallback((targetSeconds: number) => {
    setOffsetMs((prev) => {
      const currentActive = new Date(Date.now() + prev);
      const targetDate = ColorClock.createDateAtSeconds(
        currentActive,
        targetSeconds,
      );
      return prev + (targetDate.getTime() - currentActive.getTime());
    });
  }, []);

  const handleScrubDayOfYear = useCallback((targetDayOfYear: number) => {
    setOffsetMs((prev) => {
      const currentActive = new Date(Date.now() + prev);
      const targetDate = ColorClock.createDateAtDayOfYear(
        currentActive,
        targetDayOfYear,
      );
      return prev + (targetDate.getTime() - currentActive.getTime());
    });
  }, []);

  const handleJumpToMonthDay = useCallback(
    (monthIndex: number, dayOfMonth: number) => {
      setOffsetMs((prev) => {
        const currentActive = new Date(Date.now() + prev);
        const targetDate = new Date(
          currentActive.getFullYear(),
          monthIndex,
          dayOfMonth,
          currentActive.getHours(),
          currentActive.getMinutes(),
          currentActive.getSeconds(),
        );
        return prev + (targetDate.getTime() - currentActive.getTime());
      });
    },
    [],
  );

  const handleShiftHours = useCallback((deltaHours: number) => {
    setOffsetMs(
      (prev) => prev + deltaHours * CLOCK_CONFIG.SECONDS_PER_HOUR * 1000,
    );
  }, []);

  const handleShiftDays = useCallback((deltaDays: number) => {
    setOffsetMs((prev) => prev + deltaDays * CLOCK_CONFIG.MS_PER_DAY);
  }, []);

  return (
    <main
      style={mainStyle}
      className={`min-h-dvh w-full flex flex-col items-center justify-center px-4 py-4 sm:p-6 font-mono text-center transition-colors duration-500 ${textColorClass}`}
    >
      <ColorClockDial
        hueWheelGradient={clockState.hueWheelGradient}
        brightnessRingGradient={clockState.brightnessRingGradient}
        hourTicks={clockState.hourTicks}
        hueOffsetTicks={clockState.hueOffsetTicks}
        hourAngle={clockState.hourAngle}
        minuteAngle={clockState.minuteAngle}
        secondAngle={clockState.secondAngle}
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
        onToggleOpen={handleToggleDebugOpen}
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
        onReset={handleReset}
      />
    </main>
  );
}
