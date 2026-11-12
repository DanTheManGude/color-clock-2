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

export default function ClockReadout({
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
  return (
    <>
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
        {`Hue ${hue.toFixed(1)}° • Sat ${saturation.toFixed(1)}% • Value ${value.toFixed(1)}%`}
      </div>

      {/* Live RGB Readout */}
      <div
        className={`text-base opacity-85 ${isDebugActive ? "mb-2" : "mb-8"}`}
      >
        {`RGB(${rgb.r}, ${rgb.g}, ${rgb.b}) — ${hex}`}
      </div>

      {/* Debug-Only Seconds Today Readout */}
      {isDebugActive && (
        <div className="text-sm opacity-75 mb-8">
          Seconds today: {secondsSinceMidnight}s
          {isSimulated && " • (Simulated)"}
        </div>
      )}
    </>
  );
}
