"use client";

import { useEffect, useState } from "react";

export function useWakeLock(enabled: boolean = true): boolean {
  const [isActive, setIsActive] = useState(false);

  useEffect(() => {
    if (
      !enabled ||
      typeof navigator === "undefined" ||
      !("wakeLock" in navigator)
    ) {
      return;
    }

    let wakeLock: WakeLockSentinel | null = null;
    let isCancelled = false;

    const handleRelease = () => {
      wakeLock = null;
      if (!isCancelled) {
        setIsActive(false);
      }
    };

    const requestWakeLock = async () => {
      // Skip if we already hold an active, unreleased sentinel
      if (wakeLock && !wakeLock.released) return;

      try {
        const sentinel = await navigator.wakeLock.request("screen");
        if (isCancelled) {
          await sentinel.release();
          return;
        }

        wakeLock = sentinel;
        setIsActive(true);
        sentinel.addEventListener("release", handleRelease);
      } catch {
        // Fails silently if battery saver is active or permission is denied
        if (!isCancelled) {
          setIsActive(false);
        }
      }
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        requestWakeLock();
      }
    };

    requestWakeLock();
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      isCancelled = true;
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      if (wakeLock) {
        wakeLock.removeEventListener("release", handleRelease);
        wakeLock.release().catch(() => {});
        wakeLock = null;
      }
    };
  }, [enabled]);

  return enabled && isActive;
}
