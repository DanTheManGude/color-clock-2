import { memo, useMemo } from "react";
import { CLOCK_CONFIG, HourTick } from "../lib/colorClock";

interface ColorClockDialProps {
  hueWheelGradient: string;
  brightnessRingGradient: string;
  hourTicks: HourTick[];
  hourAngle: number;
  minuteAngle: number;
  secondAngle: number;
  hue: number;
  lightness: number;
  isBright: boolean;
}

// Precompute static hour rotation styles once at module load (0°, 30°, ..., 330°)
const STATIC_HOUR_ROTATIONS: Record<number, { transform: string }> =
  Object.fromEntries(
    Array.from({ length: CLOCK_CONFIG.HOURS_ON_DIAL }, (_, i) => {
      const deg = i * CLOCK_CONFIG.DEGREES_PER_HOUR;
      return [deg, { transform: `rotate(${deg}deg)` }];
    }),
  );

const HourTickLayer = memo(function HourTickLayer({
  hourTicks,
}: {
  hourTicks: HourTick[];
}) {
  return (
    <>
      {hourTicks.map(({ angle, isCardinal, isBrightUnderneath }) => {
        const tickContrastClass = isBrightUnderneath
          ? "bg-slate-900/85"
          : "bg-slate-100/90";

        return (
          <div
            key={`hour-${angle}`}
            style={STATIC_HOUR_ROTATIONS[angle]}
            className="absolute inset-0 flex justify-center pointer-events-none"
          >
            <div
              className={`${
                isCardinal ? "w-1 h-3" : "w-0.5 h-2"
              } mt-0.5 rounded-full transition-colors duration-500 ${tickContrastClass}`}
            />
          </div>
        );
      })}
    </>
  );
});

function ColorClockDial({
  hueWheelGradient,
  brightnessRingGradient,
  hourTicks,
  hourAngle,
  minuteAngle,
  secondAngle,
  hue,
  lightness,
  isBright,
}: ColorClockDialProps) {
  const handColorClass = useMemo(
    () => (isBright ? "bg-slate-800/85" : "bg-slate-100/85"),
    [isBright],
  );
  const secondHandClass = useMemo(
    () => (isBright ? "bg-slate-800/65" : "bg-slate-100/65"),
    [isBright],
  );
  const pinColorClass = useMemo(
    () => (!isBright ? "bg-slate-800" : "bg-slate-100"),
    [isBright],
  );
  const ringOutlineColor = useMemo(
    () => (isBright ? "rgba(15, 23, 42, 0.25)" : "rgba(255, 255, 255, 0.35)"),
    [isBright],
  );

  const outerRingStyle = useMemo(
    () => ({
      background: brightnessRingGradient,
      boxShadow: `0 0 0 3px ${ringOutlineColor}, 0 25px 50px -12px rgba(0, 0, 0, 0.25)`,
    }),
    [brightnessRingGradient, ringOutlineColor],
  );

  const innerWheelStyle = useMemo(
    () => ({
      background: hueWheelGradient,
      boxShadow: `0 0 0 2px ${ringOutlineColor}`,
    }),
    [hueWheelGradient, ringOutlineColor],
  );

  const hourHandStyle = useMemo(
    () => ({ transform: `rotate(${hourAngle}deg)` }),
    [hourAngle],
  );

  const minuteHandStyle = useMemo(
    () => ({ transform: `rotate(${minuteAngle}deg)` }),
    [minuteAngle],
  );

  const secondHandStyle = useMemo(
    () => ({ transform: `rotate(${secondAngle}deg)` }),
    [secondAngle],
  );

  const ariaLabel = useMemo(
    () =>
      `Color and 12-hour lightness clock showing ${Math.round(hue)} degrees hue and ${Math.round(lightness)}% lightness`,
    [hue, lightness],
  );

  return (
    <div
      style={outerRingStyle}
      className="relative w-52 h-52 sm:w-64 sm:h-64 rounded-full p-3.5 sm:p-4 overflow-hidden mb-4 sm:mb-8 flex items-center justify-center shrink-0"
      aria-label={ariaLabel}
    >
      <HourTickLayer hourTicks={hourTicks} />

      {/* Inner HSL Hue Wheel */}
      <div
        style={innerWheelStyle}
        className="relative w-full h-full rounded-full overflow-hidden flex items-center justify-center"
      >
        {/* Hour Hand (Short & Thick) */}
        <div
          style={hourHandStyle}
          className="absolute inset-0 flex justify-center items-center transition-transform duration-300 ease-linear will-change-transform"
        >
          <div
            className={`w-2 sm:w-2.5 h-11 -translate-y-5.5 sm:h-14 sm:-translate-y-7 rounded-full ${handColorClass}`}
          />
        </div>

        {/* Minute / Hue Hand (Long & Thin) */}
        <div
          style={minuteHandStyle}
          className="absolute inset-0 flex justify-center items-center transition-transform duration-300 ease-linear will-change-transform"
        >
          <div
            className={`w-1 h-19 -translate-y-9.5 sm:h-24 sm:-translate-y-12 rounded-full ${handColorClass}`}
          />
        </div>

        {/* Second Hand (Ultra-Thin with Counterweight Tail) */}
        <div
          style={secondHandStyle}
          className="absolute inset-0 flex justify-center items-center transition-transform duration-150 ease-out will-change-transform"
        >
          <div
            className={`w-0.5 h-22 -translate-y-8 sm:h-28 sm:-translate-y-10 rounded-full ${secondHandClass}`}
          />
        </div>

        {/* Center Clock Pin */}
        <div
          className={`w-3 h-3 sm:w-3.5 sm:h-3.5 rounded-full z-10 ${pinColorClass}`}
        />
      </div>
    </div>
  );
}

export default memo(ColorClockDial);
