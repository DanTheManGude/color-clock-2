"use client";

import { useEffect } from "react";
import { ColorClock } from "../lib/colorClock";

export function useDynamicClockMetadata(timestamp: number, offsetMs: number) {
  useEffect(() => {
    if (timestamp === 0) return;

    const activeDate = new Date(timestamp + offsetMs);
    const clockState = ColorClock.getClockState(activeDate);

    // 1. Update browser tab title
    const formattedTime = activeDate.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
    document.title = `${formattedTime} • ${Math.round(clockState.hue)}° Color Clock`;

    // 2. Update or create dedicated theme-color meta tag
    let themeMeta = document.querySelector<HTMLMetaElement>(
      'meta[name="theme-color"][data-dynamic="true"]',
    );
    if (!themeMeta) {
      document
        .querySelectorAll('meta[name="theme-color"]')
        .forEach((el) => el.remove());
      themeMeta = document.createElement("meta");
      themeMeta.name = "theme-color";
      themeMeta.dataset.dynamic = "true";
      document.head.appendChild(themeMeta);
    }
    themeMeta.content = clockState.backgroundColor;

    // 3. Draw live clock icon onto a 64x64 Canvas
    const canvas = document.createElement("canvas");
    canvas.width = 64;
    canvas.height = 64;
    const ctx = canvas.getContext("2d");

    if (ctx) {
      const handStroke = clockState.isBright ? "#1e293b" : "#f1f5f9";

      // Background circle
      ctx.beginPath();
      ctx.arc(32, 32, 30, 0, Math.PI * 2);
      ctx.fillStyle = clockState.backgroundColor;
      ctx.fill();
      ctx.lineWidth = 3;
      ctx.strokeStyle = handStroke;
      ctx.stroke();

      // Hour hand (short & thick)
      ctx.save();
      ctx.translate(32, 32);
      ctx.rotate((clockState.hourAngle * Math.PI) / 180);
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
      ctx.rotate((clockState.minuteAngle * Math.PI) / 180);
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

      const pngUrl = canvas.toDataURL("image/png");

      // Remove static icon links so the dynamic canvas icon takes priority
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
  }, [timestamp, offsetMs]);
}
