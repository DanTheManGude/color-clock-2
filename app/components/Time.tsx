"use client";

import { useCallback, useMemo, useState } from "react";
import { CLOCK_CONFIG, ColorClock } from "../lib/colorClock";
import {
  getCurrentTimestamp,
  useLiveTimestamp,
} from "../hooks/useLiveTimestamp";
import { useWakeLock } from "../hooks/useWakeLock";
import { useDynamicClockMetadata } from "../hooks/useDynamicClockMetadata";
import ColorClockDial from "./ColorClockDial";
import ClockReadout from "./ClockReadout";
import TimeDebugControls from "./TimeDebugControls";

export default function Time() {
  const timestamp = useLiveTimestamp();
  const [offsetMs, setOffsetMs] = useState(0);
  const [isDebugOpen, setIsDebugOpen] = useState(false);

  useWakeLock(true);

  const activeDate = useMemo(
    () => new Date(timestamp + offsetMs),
    [timestamp, offsetMs],
  );

  const clockState = useMemo(
    () => ColorClock.getClockState(activeDate),
    [activeDate],
  );

  useDynamicClockMetadata(timestamp, activeDate, clockState);

  const isSimulated = offsetMs !== 0;
  const isDebugActive = isDebugOpen || isSimulated;
  const textColorClass = clockState.isBright
    ? "text-slate-900"
    : "text-slate-100";

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
      const baseTs = getCurrentTimestamp();
      const currentActive = new Date(baseTs + prev);
      const targetDate = ColorClock.createDateAtSeconds(
        currentActive,
        targetSeconds,
      );
      return targetDate.getTime() - baseTs;
    });
  }, []);

  const handleScrubDayOfYear = useCallback((targetDayOfYear: number) => {
    setOffsetMs((prev) => {
      const baseTs = getCurrentTimestamp();
      const currentActive = new Date(baseTs + prev);
      const targetDate = ColorClock.createDateAtDayOfYear(
        currentActive,
        targetDayOfYear,
      );
      return targetDate.getTime() - baseTs;
    });
  }, []);

  const handleJumpToMonthDay = useCallback(
    (monthIndex: number, dayOfMonth: number) => {
      setOffsetMs((prev) => {
        const baseTs = getCurrentTimestamp();
        const currentActive = new Date(baseTs + prev);
        const targetDate = new Date(
          currentActive.getFullYear(),
          monthIndex,
          dayOfMonth,
          currentActive.getHours(),
          currentActive.getMinutes(),
          currentActive.getSeconds(),
        );
        return targetDate.getTime() - baseTs;
      });
    },
    [],
  );

  const handleShiftMinutes = useCallback((deltaMinutes: number) => {
    setOffsetMs(
      (prev) => prev + deltaMinutes * CLOCK_CONFIG.SECONDS_PER_MINUTE * 1000,
    );
  }, []);

  const handleShiftHours = useCallback((deltaHours: number) => {
    setOffsetMs(
      (prev) => prev + deltaHours * CLOCK_CONFIG.SECONDS_PER_HOUR * 1000,
    );
  }, []);

  const handleShiftDays = useCallback((deltaDays: number) => {
    setOffsetMs((prev) => prev + deltaDays * CLOCK_CONFIG.MS_PER_DAY);
  }, []);

  if (timestamp === 0) {
    return (
      <main className="min-h-dvh w-full flex items-center justify-center bg-slate-900 text-slate-100 font-mono">
        <div className="text-xl">Loading...</div>
      </main>
    );
  }

  return (
    <main
      style={mainStyle}
      className={`min-h-dvh w-full flex flex-col items-center px-4 pt-[max(1rem,env(safe-area-inset-top))] pb-[max(1rem,env(safe-area-inset-bottom))] sm:p-6 font-mono text-center transition-colors duration-500 ${textColorClass}`}
    >
      <div className="my-auto w-full flex flex-col items-center">
        <ColorClockDial
          hueWheelGradient={clockState.hueWheelGradient}
          brightnessRingGradient={clockState.brightnessRingGradient}
          hourTicks={clockState.hourTicks}
          hourAngle={clockState.hourAngle}
          minuteAngle={clockState.minuteAngle}
          secondAngle={clockState.secondAngle}
          hue={clockState.hue}
          lightness={clockState.lightness}
          isBright={clockState.isBright}
        />

        <ClockReadout
          activeDate={activeDate}
          hue={clockState.hue}
          saturation={clockState.saturation}
          lightness={clockState.lightness}
          hex={clockState.hex}
          rgb={clockState.rgb}
          isDebugActive={isDebugActive}
          isSimulated={isSimulated}
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
          onShiftMinutes={handleShiftMinutes}
          onShiftHours={handleShiftHours}
          onShiftDays={handleShiftDays}
          onReset={handleReset}
        />
      </div>
    </main>
  );
}
