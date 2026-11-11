"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
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

  // Sync browser tab title, theme-color, and dynamic SVG favicon with live color
  useEffect(() => {
    if (timestamp === 0) return;

    const activeDate = new Date(timestamp + offsetMs);
    const clockState = ColorClock.getClockState(activeDate);

    const formattedTime = activeDate.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
    document.title = `${formattedTime} • ${Math.round(clockState.hue)}° Color Clock`;

    // Update mobile/PWA browser chrome theme color
    let themeMeta = document.querySelector<HTMLMetaElement>(
      'meta[name="theme-color"]',
    );
    if (!themeMeta) {
      themeMeta = document.createElement("meta");
      themeMeta.name = "theme-color";
      document.head.appendChild(themeMeta);
    }
    themeMeta.content = clockState.backgroundColor;

    // Generate live SVG icon showing current background hue & clock hands
    const handStroke = clockState.isBright ? "#0f172a" : "#ffffff";
    const svg = `<svg xmlns="http://w3.org" viewBox="0 0 64 64">
      <circle cx="32" cy="32" r="30" fill="${clockState.backgroundColor}" stroke="${handStroke}" stroke-width="3"/>
      <line x1="32" y1="32" x2="32" y2="16" stroke="${handStroke}" stroke-width="4" stroke-linecap="round" transform="rotate(${clockState.hourAngle} 32 32)"/>
      <line x1="32" y1="32" x2="32" y2="10" stroke="${handStroke}" stroke-width="2.5" stroke-linecap="round" transform="rotate(${clockState.minuteAngle} 32 32)"/>
      <circle cx="32" cy="32" r="3" fill="${handStroke}"/>
    </svg>`;

    // Update all existing icon links (including Next.js static icon) or create one
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

  const isDebugActive = isDebugOpen || offsetMs !== 0;
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

  const handleShiftHours = (deltaHours: number) => {
    setOffsetMs(
      (prev) => prev + deltaHours * CLOCK_CONFIG.SECONDS_PER_HOUR * 1000,
    );
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
        onShiftHours={handleShiftHours}
        onShiftDays={handleShiftDays}
        onReset={() => setOffsetMs(0)}
      />
    </main>
  );
}
