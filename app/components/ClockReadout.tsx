import { memo, useMemo } from "react";
import { RgbColor } from "../lib/colorClock";

interface ClockReadoutProps {
  activeDate: Date;
  hue: number;
  saturation: number;
  lightness: number;
  hex: string;
  rgb: RgbColor;
  isDebugActive: boolean;
  isSimulated: boolean;
}

function ClockReadout({
  activeDate,
  hue,
  saturation,
  lightness,
  hex,
  rgb,
  isDebugActive,
  isSimulated,
}: ClockReadoutProps) {
  const formattedDate = useMemo(
    () =>
      activeDate.toLocaleDateString([], {
        weekday: "long",
        month: "short",
        day: "numeric",
      }),
    [activeDate],
  );

  const formattedTime = useMemo(
    () => activeDate.toLocaleTimeString(),
    [activeDate],
  );

  const hslSummary = useMemo(
    () =>
      `Hue ${hue.toFixed(1)}° • Sat ${saturation.toFixed(1)}% • Lit ${lightness.toFixed(1)}%`,
    [hue, saturation, lightness],
  );

  const rgbHexSummary = useMemo(
    () => `RGB(${rgb.r}, ${rgb.g}, ${rgb.b}) — ${hex}`,
    [rgb.r, rgb.g, rgb.b, hex],
  );

  const debugSummary = useMemo(
    () => (isSimulated ? "(Simulated)" : ""),
    [isSimulated],
  );

  return (
    <>
      {/* Digital Date & Time Readout */}
      <div className="text-lg font-semibold uppercase tracking-widest opacity-80 mb-1">
        {formattedDate}
      </div>
      <div className="text-5xl font-bold mb-3">{formattedTime}</div>

      {/* Primary Hue / Seasonal Saturation / Lightness Summary */}
      <div className="text-base sm:text-xl opacity-90 mb-0.5 sm:mb-1">
        {hslSummary}
      </div>

      {/* Live RGB Readout */}
      <div
        className={`text-base opacity-85 ${isDebugActive ? "mb-2" : "mb-8"}`}
      >
        {rgbHexSummary}
      </div>

      {/* Debug-Only Seconds Today Readout */}
      {isDebugActive && (
        <div className="text-sm opacity-75 mb-6">{debugSummary}</div>
      )}
    </>
  );
}

export default memo(ClockReadout);
