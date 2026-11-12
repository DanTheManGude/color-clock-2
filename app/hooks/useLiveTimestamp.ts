"use client";

import { useSyncExternalStore } from "react";
import { CLOCK_CONFIG } from "../lib/colorClock";

function subscribe(callback: () => void) {
  let timeoutId: ReturnType<typeof setTimeout>;

  const scheduleNextTick = () => {
    clearTimeout(timeoutId);
    const now = Date.now();
    // Exact milliseconds remaining until the start of the next wall-clock second (.000ms)
    const msUntilNextSecond =
      CLOCK_CONFIG.UPDATE_INTERVAL_MS - (now % CLOCK_CONFIG.UPDATE_INTERVAL_MS);

    timeoutId = setTimeout(() => {
      callback();
      scheduleNextTick();
    }, msUntilNextSecond);
  };

  const handleVisibilityChange = () => {
    if (document.visibilityState === "visible") {
      callback();
      scheduleNextTick();
    }
  };

  scheduleNextTick();
  document.addEventListener("visibilitychange", handleVisibilityChange);

  return () => {
    clearTimeout(timeoutId);
    document.removeEventListener("visibilitychange", handleVisibilityChange);
  };
}

let currentTimestamp = 0;

export function getCurrentTimestamp(): number {
  const now = Date.now();
  const flooredSecond =
    Math.floor(now / CLOCK_CONFIG.UPDATE_INTERVAL_MS) *
    CLOCK_CONFIG.UPDATE_INTERVAL_MS;

  if (flooredSecond !== currentTimestamp) {
    currentTimestamp = flooredSecond;
  }
  return currentTimestamp;
}

function getServerSnapshot(): number {
  return 0;
}

export function useLiveTimestamp(): number {
  return useSyncExternalStore(
    subscribe,
    getCurrentTimestamp,
    getServerSnapshot,
  );
}
