import { memo, useMemo } from "react";
import { RgbColor } from "../lib/colorClock";

interface ClockReadoutProps {
  activeDate: Date;
  hue: number;
  saturation: number;
  value: number;
  hex: string;
  rgb: RgbColor;
  secondsSinceMidnight: number;
  isDebugActive: boolean;
  isSimulated: boolean;
}

function ClockReadout({
  activeDate,
  hue,
  saturation,
  value,
  hex,
  rgb,
  secondsSinceMidnight,
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

  const hsvSummary = useMemo(
    () =>
      `Hue ${hue.toFixed(0)}° • Sat ${saturation.toFixed(0)}% • Val ${value.toFixed(0)}%`,
    [hue, saturation, value],
  );

  const rgbHexSummary = useMemo(
    () => `RGB(${rgb.r}, ${rgb.g}, ${rgb.b}) — ${hex}`,
    [rgb.r, rgb.g, rgb.b, hex],
  );

  const debugSummary = useMemo(
    () =>
      `Seconds today: ${secondsSinceMidnight}s${isSimulated ? " • (Simulated)" : ""}`,
    [secondsSinceMidnight, isSimulated],
  );

  return (
    <>
      {/* Digital Date & Time Readout */}
      <div className="text-lg font-semibold uppercase tracking-widest opacity-80 mb-1">
        {formattedDate}
      </div>
      <div className="text-5xl font-bold mb-3">{formattedTime}</div>

      {/* Primary Hue / Seasonal Saturation / Value Summary */}
      <div className="text-xl opacity-90 mb-1">{hsvSummary}</div>

      {/* Live RGB Readout */}
      <div
        className={`text-base opacity-85 ${isDebugActive ? "mb-2" : "mb-8"}`}
      >
        {rgbHexSummary}
      </div>

      {/* Debug-Only Seconds Today Readout */}
      {isDebugActive && (
        <div className="text-sm opacity-75 mb-8">{debugSummary}</div>
      )}
    </>
  );
}

export default memo(ClockReadout);
