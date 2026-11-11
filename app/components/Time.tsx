"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { CLOCK_CONFIG, ColorClock } from "../lib/colorClock";
import { useWakeLock } from "../hooks/useWakeLock";
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
  useEffect(() => {
    if (timestamp === 0) return;

    const activeDate = new Date(timestamp + offsetMs);
    const clockState = ColorClock.getClockState(activeDate);

    const formattedTime = activeDate.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
    document.title = `${formattedTime} • ${Math.round(clockState.hue)}° Color Clock`;

    let themeMeta = document.querySelector<HTMLMetaElement>(
      'meta[name="theme-color"]',
    );
    if (!themeMeta) {
      themeMeta = document.createElement("meta");
      themeMeta.name = "theme-color";
      document.head.appendChild(themeMeta);
    }
    themeMeta.content = clockState.backgroundColor;

    const handStroke = clockState.isBright ? "#0f172a" : "#ffffff";
    const svg = `<svg xmlns="http://w3.org" viewBox="0 0 64 64">
      <circle cx="32" cy="32" r="30" fill="${clockState.backgroundColor}" stroke="${handStroke}" stroke-width="3"/>
      <line x1="32" y1="32" x2="32" y2="16" stroke="${handStroke}" stroke-width="4" stroke-linecap="round" transform="rotate(${clockState.hourAngle} 32 32)"/>
      <line x1="32" y1="32" x2="32" y2="10" stroke="${handStroke}" stroke-width="2.5" stroke-linecap="round" transform="rotate(${clockState.minuteAngle} 32 32)"/>
      <circle cx="32" cy="32" r="3" fill="${handStroke}"/>
    </svg>`;

    const encodedSvg = `data:image/svg+xml,${encodeURIComponent(svg)}`;
    const iconLinks =
      document.querySelectorAll<HTMLLinkElement>('link[rel*="icon"]');

    if (iconLinks.length > 0) {
      iconLinks.forEach((link) => {
        link.type = "image/svg+xml";
        link.href = encodedSvg;
      });
    } else {
      const link = document.createElement("link");
      link.rel = "icon";
      link.type = "image/svg+xml";
      link.href = encodedSvg;
      document.head.appendChild(link);
    }
  }, [timestamp, offsetMs]);

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
        Hue {clockState.hue.toFixed(1)}° • Sat{" "}
        {clockState.saturation.toFixed(1)}% • Value{" "}
        {clockState.value.toFixed(1)}%
      </div>

      {/* Live RGB Hex Readout */}
      <div
        className={`text-base opacity-85 tracking-wider ${isDebugActive ? "mb-2" : "mb-8"}`}
      >
        {clockState.hex}
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
        activeDayIndex={activeDate.getDay()}
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
