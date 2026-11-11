"use client";

import { useEffect, useState } from "react";

export function useWakeLock(enabled: boolean = true) {
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

    const requestWakeLock = async () => {
      try {
        const sentinel = await navigator.wakeLock.request("screen");
        if (isCancelled) {
          await sentinel.release();
          return;
        }
        wakeLock = sentinel;
        setIsActive(true);

        sentinel.addEventListener("release", () => {
          setIsActive(false);
        });
      } catch {
        // Fails silently if battery saver is active or permission is denied
        setIsActive(false);
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
        wakeLock.release().catch(() => {});
        wakeLock = null;
      }
      setIsActive(false);
    };
  }, [enabled]);

  return isActive;
}
