"use client";

import { useEffect, useRef } from "react";
import { ColorClock } from "../lib/colorClock";

type ClockState = ReturnType<typeof ColorClock.getClockState>;

function renderClockFavicon(
  backgroundColor: string,
  hourAngle: number,
  minuteAngle: number,
  isBright: boolean,
): string | null {
  const canvas = document.createElement("canvas");
  canvas.width = 64;
  canvas.height = 64;
  const ctx = canvas.getContext("2d");

  if (!ctx) return null;

  const handStroke = isBright ? "#1e293b" : "#f1f5f9";

  // Background circle
  ctx.beginPath();
  ctx.arc(32, 32, 30, 0, Math.PI * 2);
  ctx.fillStyle = backgroundColor;
  ctx.fill();
  ctx.lineWidth = 3;
  ctx.strokeStyle = handStroke;
  ctx.stroke();

  // Hour hand (short & thick)
  ctx.save();
  ctx.translate(32, 32);
  ctx.rotate((hourAngle * Math.PI) / 180);
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(0, -15);
  ctx.lineWidth = 4.5;
  ctx.lineCap = "round";
  ctx.strokeStyle = handStroke;
  ctx.stroke();
  ctx.restore();

  // Minute hand (long & thin)
  ctx.save();
  ctx.translate(32, 32);
  ctx.rotate((minuteAngle * Math.PI) / 180);
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(0, -23);
  ctx.lineWidth = 2.5;
  ctx.lineCap = "round";
  ctx.strokeStyle = handStroke;
  ctx.stroke();
  ctx.restore();

  // Center pin
  ctx.beginPath();
  ctx.arc(32, 32, 3, 0, Math.PI * 2);
  ctx.fillStyle = handStroke;
  ctx.fill();

  return canvas.toDataURL("image/png");
}

export function useDynamicClockMetadata(
  timestamp: number,
  activeDate: Date,
  clockState: ClockState,
) {
  const lastTitleRef = useRef("");
  const lastColorRef = useRef("");
  const lastIconKeyRef = useRef("");

  useEffect(() => {
    if (timestamp === 0) return;

    // 1. Update browser tab title only when the minute or rounded hue changes
    const formattedTime = activeDate.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
    const nextTitle = `${formattedTime} • ${Math.round(clockState.hue)}° Color Clock`;
    if (lastTitleRef.current !== nextTitle) {
      document.title = nextTitle;
      lastTitleRef.current = nextTitle;
    }

    // 2. Update <html>, <body>, and <meta name="theme-color"> only when hex color changes
    if (lastColorRef.current !== clockState.backgroundColor) {
      document.documentElement.style.backgroundColor =
        clockState.backgroundColor;
      document.body.style.backgroundColor = clockState.backgroundColor;

      document
        .querySelectorAll('meta[name="theme-color"]')
        .forEach((el) => el.remove());
      const themeMeta = document.createElement("meta");
      themeMeta.name = "theme-color";
      themeMeta.content = clockState.backgroundColor;
      document.head.appendChild(themeMeta);

      lastColorRef.current = clockState.backgroundColor;
    }

    // 3. Redraw the 64x64 Canvas favicon only when color or whole-degree hand angles change
    const roundedHourDeg = Math.round(clockState.hourAngle) % 360;
    const roundedMinuteDeg = Math.round(clockState.minuteAngle) % 360;
    const nextIconKey = `${clockState.backgroundColor}:${clockState.isBright}:${roundedHourDeg}:${roundedMinuteDeg}`;

    if (lastIconKeyRef.current !== nextIconKey) {
      const pngUrl = renderClockFavicon(
        clockState.backgroundColor,
        roundedHourDeg,
        roundedMinuteDeg,
        clockState.isBright,
      );

      if (pngUrl) {
        document
          .querySelectorAll('link[rel*="icon"]:not([data-dynamic="true"])')
          .forEach((el) => el.remove());

        let dynamicIcon = document.querySelector<HTMLLinkElement>(
          'link[rel="icon"][data-dynamic="true"]',
        );
        if (!dynamicIcon) {
          dynamicIcon = document.createElement("link");
          dynamicIcon.rel = "icon";
          dynamicIcon.type = "image/png";
          dynamicIcon.dataset.dynamic = "true";
          document.head.appendChild(dynamicIcon);
        }
        dynamicIcon.href = pngUrl;
      }

      lastIconKeyRef.current = nextIconKey;
    }
  }, [timestamp, activeDate, clockState]);
}
