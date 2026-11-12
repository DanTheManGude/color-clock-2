import { HourTick, HueOffsetTick } from "../lib/colorClock";

interface ColorClockDialProps {
  hueWheelGradient: string;
  brightnessRingGradient: string;
  hourTicks: HourTick[];
  hueOffsetTicks: HueOffsetTick[];
  hourAngle: number;
  minuteAngle: number;
  secondAngle: number;
  hue: number;
  value: number;
  isBright: boolean;
}

export default function ColorClockDial({
  hueWheelGradient,
  brightnessRingGradient,
  hourTicks,
  hueOffsetTicks,
  hourAngle,
  minuteAngle,
  secondAngle,
  hue,
  value,
  isBright,
}: ColorClockDialProps) {
  const handColorClass = isBright ? "bg-slate-800/85" : "bg-slate-100/85";
  const secondHandClass = isBright ? "bg-slate-800/65" : "bg-slate-100/65";
  const pinColorClass = isBright ? "bg-slate-800/90" : "bg-slate-100/90";

  const ringOutlineColor = isBright
    ? "rgba(15, 23, 42, 0.25)"
    : "rgba(255, 255, 255, 0.35)";

  return (
    <div
      style={{
        background: brightnessRingGradient,
        boxShadow: `0 0 0 3px ${ringOutlineColor}, 0 25px 50px -12px rgba(0, 0, 0, 0.25)`,
      }}
      className="relative w-64 h-64 rounded-full p-4 overflow-hidden mb-8 flex items-center justify-center"
      aria-label={`Color and 12-hour value clock showing ${Math.round(hue)} degrees hue and ${Math.round(value)}% value`}
    >
      {/* 12-Hour Bezel Tick Marks */}
      {hourTicks.map(({ angle, isCardinal, isBrightUnderneath }) => {
        const tickContrastClass = isBrightUnderneath
          ? "bg-slate-900/85"
          : "bg-white/90";

        return (
          <div
            key={`hour-${angle}`}
            style={{ transform: `rotate(${angle}deg)` }}
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

      {/* Inner HSV Hue Wheel */}
      <div
        style={{
          background: hueWheelGradient,
          boxShadow: `0 0 0 2px ${ringOutlineColor}`,
        }}
        className="relative w-full h-full rounded-full overflow-hidden flex items-center justify-center"
      >
        {/* Per-Tick Contrasted 40° Hue-Offset Tick Marks */}
        {hueOffsetTicks.map(({ angle, isBrightUnderneath }) => {
          const hueTickContrastClass = isBrightUnderneath
            ? "bg-slate-900/70"
            : "bg-white/80";

          return (
            <div
              key={`hue-${angle}`}
              style={{ transform: `rotate(${angle}deg)` }}
              className="absolute inset-0 flex justify-center pointer-events-none"
            >
              <div
                className={`w-0.5 h-2.5 mt-1 rounded-full transition-colors duration-500 ${hueTickContrastClass}`}
              />
            </div>
          );
        })}

        {/* Hour Hand (Short & Thick) */}
        <div
          style={{ transform: `rotate(${hourAngle}deg)` }}
          className="absolute inset-0 flex justify-center items-center transition-transform duration-300 ease-linear"
        >
          <div
            className={`w-2.5 h-14 -translate-y-7 rounded-full ${handColorClass}`}
          />
        </div>

        {/* Minute / Hue Hand (Long & Thin) */}
        <div
          style={{ transform: `rotate(${minuteAngle}deg)` }}
          className="absolute inset-0 flex justify-center items-center transition-transform duration-300 ease-linear"
        >
          <div
            className={`w-1 h-24 -translate-y-12 rounded-full ${handColorClass}`}
          />
        </div>

        {/* Second Hand (Ultra-Thin with Counterweight Tail) */}
        <div
          style={{ transform: `rotate(${secondAngle}deg)` }}
          className="absolute inset-0 flex justify-center items-center transition-transform duration-150 ease-out"
        >
          <div
            className={`w-0.5 h-28 -translate-y-10 rounded-full ${secondHandClass}`}
          />
        </div>

        {/* Center Clock Pin */}
        <div className={`w-3 h-3 rounded-full z-10 ${pinColorClass}`} />
      </div>
    </div>
  );
}
