export const CLOCK_CONFIG = {
  UPDATE_INTERVAL_MS: 1000,
  DAILY_HUE_OFFSET_DEG: 60,
  HOURS_ON_DIAL: 12,
  DEGREES_PER_HOUR: 30,
  MIN_SATURATION_PERCENT: 27,
  MAX_SATURATION_PERCENT: 87,
  SUMMER_SOLSTICE_DAY_OF_YEAR: 171, // June 21 (0-indexed)
  MIN_VALUE_PERCENT: 20,
  MAX_VALUE_PERCENT: 80,
  WEEK_SWATCH_VALUE_PERCENT: 65,
  LUMINANCE_CONTRAST_THRESHOLD: 0.179, // WCAG
  BEZEL_LUMINANCE_CONTRAST_THRESHOLD: 0.28,
  SECONDS_PER_MINUTE: 60,
  SECONDS_PER_HOUR: 3600,
  SECONDS_PER_HALF_DAY: 43200,
  SECONDS_PER_DAY: 86400,
  MS_PER_DAY: 86400000,
  DAY_LABELS: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const,
};

export interface RgbColor {
  r: number;
  g: number;
  b: number;
}

export interface WeekDaySwatch {
  label: string;
  dayOffset: number;
  startingHue: number;
  saturation: number;
  backgroundColor: string;
  isBright: boolean;
  isToday: boolean;
}

export interface HourTick {
  angle: number;
  isCardinal: boolean;
  isBrightUnderneath: boolean;
}

export interface HueOffsetTick {
  angle: number;
  isBrightUnderneath: boolean;
}

// Precompute sRGB -> linear channel values (0..255) once at module load
const SRGB_TO_LINEAR_LUT = Float64Array.from({ length: 256 }, (_, channel) => {
  const srgb = channel / 255;
  return srgb <= 0.03928 ? srgb / 12.92 : Math.pow((srgb + 0.055) / 1.055, 2.4);
});

const HUE_WHEEL_STOPS = Array.from(
  { length: Math.floor(360 / CLOCK_CONFIG.DAILY_HUE_OFFSET_DEG) + 1 },
  (_, i) => (i * CLOCK_CONFIG.DAILY_HUE_OFFSET_DEG) % 360,
);

const RELATIVE_DAY_SPECS = [
  { label: "Yesterday", dayOffset: -1 },
  { label: "Today", dayOffset: 0 },
  { label: "Tomorrow", dayOffset: 1 },
] as const;

export class ColorClock {
  // Lightweight memo caches so React.memo children skip re-renders when values don't change
  private static cachedHourTicks: { key: string; value: HourTick[] } | null =
    null;
  private static cachedHueTicks: {
    key: string;
    value: HueOffsetTick[];
  } | null = null;
  private static cachedWeekSwatches: {
    key: string;
    value: WeekDaySwatch[];
  } | null = null;

  /**
   * Computes a DST-safe day of the year index (0 on Jan 1, 1 on Jan 2, etc.).
   */
  static getDayOfYear(date: Date): number {
    const utcDate = Date.UTC(
      date.getFullYear(),
      date.getMonth(),
      date.getDate(),
    );
    const utcStartOfYear = Date.UTC(date.getFullYear(), 0, 1);
    return Math.floor((utcDate - utcStartOfYear) / CLOCK_CONFIG.MS_PER_DAY);
  }

  /**
   * Returns 366 on leap years and 365 on common years.
   */
  static getDaysInYear(year: number): number {
    return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0 ? 366 : 365;
  }

  /**
   * Computes seasonal saturation (35% on Winter Solstice -> 95% on Summer Solstice).
   */
  static getSeasonalSaturation(date: Date): number {
    const {
      MIN_SATURATION_PERCENT,
      MAX_SATURATION_PERCENT,
      SUMMER_SOLSTICE_DAY_OF_YEAR,
    } = CLOCK_CONFIG;

    const year = date.getFullYear();
    const daysInYear = this.getDaysInYear(year);
    const summerSolsticeDay =
      SUMMER_SOLSTICE_DAY_OF_YEAR + (daysInYear === 366 ? 1 : 0);

    const fractionalDayOfYear =
      this.getDayOfYear(date) +
      this.getSecondsSinceMidnight(date) / CLOCK_CONFIG.SECONDS_PER_DAY;

    const angleRad =
      ((fractionalDayOfYear - summerSolsticeDay) / daysInYear) * 2 * Math.PI;
    const normalizedSolarFactor = (Math.cos(angleRad) + 1) / 2;

    const saturationRange = MAX_SATURATION_PERCENT - MIN_SATURATION_PERCENT;
    return MIN_SATURATION_PERCENT + normalizedSolarFactor * saturationRange;
  }

  /**
   * Returns total seconds elapsed since midnight for the given Date.
   */
  static getSecondsSinceMidnight(date: Date): number {
    return (
      date.getHours() * CLOCK_CONFIG.SECONDS_PER_HOUR +
      date.getMinutes() * CLOCK_CONFIG.SECONDS_PER_MINUTE +
      date.getSeconds()
    );
  }

  /**
   * Returns a new Date on the same calendar day set to the given seconds since midnight.
   */
  static createDateAtSeconds(
    baseDate: Date,
    secondsSinceMidnight: number,
  ): Date {
    const result = new Date(
      baseDate.getFullYear(),
      baseDate.getMonth(),
      baseDate.getDate(),
      0,
      0,
      0,
      0,
    );
    result.setSeconds(secondsSinceMidnight);
    return result;
  }

  /**
   * Returns a new Date in the same year set to the given 0-indexed day of year,
   * preserving the current hours, minutes, and seconds.
   */
  static createDateAtDayOfYear(baseDate: Date, targetDayOfYear: number): Date {
    return new Date(
      baseDate.getFullYear(),
      0,
      1 + targetDayOfYear,
      baseDate.getHours(),
      baseDate.getMinutes(),
      baseDate.getSeconds(),
      0,
    );
  }

  /**
   * Computes HSV Value (20% at midnight -> 80% at noon) for any second of the day.
   */
  static getValueAtSecond(seconds: number): number {
    const {
      SECONDS_PER_DAY,
      SECONDS_PER_HALF_DAY,
      MIN_VALUE_PERCENT,
      MAX_VALUE_PERCENT,
    } = CLOCK_CONFIG;

    const normalized =
      ((seconds % SECONDS_PER_DAY) + SECONDS_PER_DAY) % SECONDS_PER_DAY;
    const distanceFromMidnight =
      SECONDS_PER_HALF_DAY - Math.abs(SECONDS_PER_HALF_DAY - normalized);
    const valueRange = MAX_VALUE_PERCENT - MIN_VALUE_PERCENT;

    return (
      MIN_VALUE_PERCENT +
      (distanceFromMidnight / SECONDS_PER_HALF_DAY) * valueRange
    );
  }

  /**
   * Computes the starting hue (noon/midnight hue) for a given day of the year.
   */
  static getDailyStartingHue(dayOfYear: number): number {
    return (
      (((dayOfYear * CLOCK_CONFIG.DAILY_HUE_OFFSET_DEG) % 360) + 360) % 360
    );
  }

  /**
   * Converts HSV values (h in [0,360), s & v in) to standard 0-255 RGB integers.
   */
  static hsvToRgb(h: number, s: number, v: number): RgbColor {
    const normalizedH = ((h % 360) + 360) % 360;
    const sat = Math.max(0, Math.min(100, s)) / 100;
    const val = Math.max(0, Math.min(100, v)) / 100;

    const c = val * sat;
    const x = c * (1 - Math.abs(((normalizedH / 60) % 2) - 1));
    const m = val - c;

    let r1 = 0;
    let g1 = 0;
    let b1 = 0;

    if (normalizedH < 60) {
      [r1, g1, b1] = [c, x, 0];
    } else if (normalizedH < 120) {
      [r1, g1, b1] = [x, c, 0];
    } else if (normalizedH < 180) {
      [r1, g1, b1] = [0, c, x];
    } else if (normalizedH < 240) {
      [r1, g1, b1] = [0, x, c];
    } else if (normalizedH < 300) {
      [r1, g1, b1] = [x, 0, c];
    } else {
      [r1, g1, b1] = [c, 0, x];
    }

    return {
      r: Math.round((r1 + m) * 255),
      g: Math.round((g1 + m) * 255),
      b: Math.round((b1 + m) * 255),
    };
  }

  /**
   * Converts an RgbColor object (0-255 channels) into an uppercase #RRGGBB hex string.
   */
  static rgbToHex({ r, g, b }: RgbColor): string {
    const hexValue = ((r & 0xff) << 16) | ((g & 0xff) << 8) | (b & 0xff);
    return `#${hexValue.toString(16).padStart(6, "0").toUpperCase()}`;
  }

  /**
   * Converts HSV directly to a CSS rgb(r, g, b) string.
   */
  static hsvToCssRgb(h: number, s: number, v: number): string {
    const rgb = this.hsvToRgb(h, s, v);
    return this.rbgToCss(rgb);
  }

  /**
   * Converts RGB Color directly to a CSS rgb(r, g, b) string.
   */
  static rbgToCss({ r, g, b }: RgbColor): string {
    return `rgb(${r}, ${g}, ${b})`;
  }

  /**
   * Computes WCAG relative luminance (0.0 -> 1.0) using the precomputed sRGB lookup table.
   */
  static getRelativeLuminance({ r, g, b }: RgbColor): number {
    return (
      0.2126 * SRGB_TO_LINEAR_LUT[r] +
      0.7152 * SRGB_TO_LINEAR_LUT[g] +
      0.0722 * SRGB_TO_LINEAR_LUT[b]
    );
  }

  /**
   * Computes the 12 hour tick marks with per-tick contrast based on the grayscale
   * HSV Value directly beneath each tick, returning a stable array reference when unchanged.
   */
  static getHourTicks(
    secondsSinceMidnight: number,
    hourAngle: number,
  ): HourTick[] {
    const normalizedHourAngle = ((hourAngle % 360) + 360) % 360;
    const ticks = Array.from({ length: CLOCK_CONFIG.HOURS_ON_DIAL }, (_, i) => {
      const angle = i * CLOCK_CONFIG.DEGREES_PER_HOUR;
      const rawDelta = (((angle - normalizedHourAngle) % 360) + 360) % 360;
      const signedDeltaDeg = rawDelta >= 180 ? rawDelta - 360 : rawDelta;

      const offsetSeconds =
        (signedDeltaDeg / CLOCK_CONFIG.DEGREES_PER_HOUR) *
        CLOCK_CONFIG.SECONDS_PER_HOUR;
      const valueAtTick = this.getValueAtSecond(
        secondsSinceMidnight + offsetSeconds,
      );
      const luminance = this.getRelativeLuminance(
        this.hsvToRgb(0, 0, valueAtTick),
      );

      return {
        angle,
        isCardinal: angle % 90 === 0,
        isBrightUnderneath:
          luminance > CLOCK_CONFIG.BEZEL_LUMINANCE_CONTRAST_THRESHOLD,
      };
    });

    const key = ticks.map((t) => (t.isBrightUnderneath ? "1" : "0")).join("");
    if (this.cachedHourTicks?.key === key) {
      return this.cachedHourTicks.value;
    }

    this.cachedHourTicks = { key, value: ticks };
    return ticks;
  }

  /**
   * Computes the daily hue-offset ticks with per-tick perceptual contrast against the HSV color underneath,
   * returning a stable array reference when unchanged.
   */
  static getHueOffsetTicks(
    dayOffset: number,
    value: number,
    saturation: number,
  ): HueOffsetTick[] {
    const stepDeg = CLOCK_CONFIG.DAILY_HUE_OFFSET_DEG;
    const count = Math.floor(360 / stepDeg);

    const ticks = Array.from({ length: count }, (_, i) => {
      const angle = i * stepDeg;
      const hueAtTick = (((dayOffset + angle) % 360) + 360) % 360;
      const luminance = this.getRelativeLuminance(
        this.hsvToRgb(hueAtTick, saturation, value),
      );

      return {
        angle,
        isBrightUnderneath:
          luminance > CLOCK_CONFIG.LUMINANCE_CONTRAST_THRESHOLD,
      };
    });

    const key = `${stepDeg}:${ticks.map((t) => (t.isBrightUnderneath ? "1" : "0")).join("")}`;
    if (this.cachedHueTicks?.key === key) {
      return this.cachedHueTicks.value;
    }

    this.cachedHueTicks = { key, value: ticks };
    return ticks;
  }

  /**
   * Builds the CSS conic-gradient string for the inner HSV hue wheel.
   */
  static getHueWheelGradient(
    dayOffset: number,
    value: number,
    saturation: number,
  ): string {
    const wheelStartAngle = (360 - dayOffset) % 360;
    const stops = HUE_WHEEL_STOPS.map((deg) =>
      this.hsvToCssRgb(deg, saturation, value),
    ).join(", ");
    return `conic-gradient(from ${wheelStartAngle}deg, ${stops})`;
  }
  /**
   * Builds the CSS conic-gradient string for the 12-hour rolling grayscale HSV Value ring,
   * feathering the ±6h seam opposite the hour hand so -6h and +6h blend smoothly.
   */
  static getBrightnessRingGradient(
    secondsSinceMidnight: number,
    hourAngle: number,
  ): string {
    const steps = 48;
    const sixHoursSeconds = 6 * CLOCK_CONFIG.SECONDS_PER_HOUR;
    const minus6Value = this.getValueAtSecond(
      secondsSinceMidnight - sixHoursSeconds,
    );
    const plus6Value = this.getValueAtSecond(
      secondsSinceMidnight + sixHoursSeconds,
    );
    const seamColor = this.hsvToCssRgb(0, 0, (minus6Value + plus6Value) / 2);
    const interiorStops = Array.from({ length: steps - 1 }, (_, idx) => {
      const i = idx + 1;
      const offsetHours = -6 + (i / steps) * 12;
      const angleDeg = (i / steps) * 360;
      const stopValue = this.getValueAtSecond(
        secondsSinceMidnight + offsetHours * CLOCK_CONFIG.SECONDS_PER_HOUR,
      );
      return `${this.hsvToCssRgb(0, 0, stopValue)} ${angleDeg.toFixed(2)}deg`;
    });
    const allStops = [
      `${seamColor} 0deg`,
      ...interiorStops,
      `${seamColor} 360deg`,
    ].join(", ");
    const normalizedHourAngle = ((hourAngle % 360) + 360) % 360;
    const ringStartAngle = (normalizedHourAngle + 180) % 360;
    return `conic-gradient(from ${ringStartAngle.toFixed(2)}deg, ${allStops})`;
  }

  /**
   * Generates the 3-day swatch list (Yesterday, Today, Tomorrow) using the active HSV Value,
   * returning a stable array reference when the rendered swatch colors haven't changed.
   */
  static getWeekSwatches(date: Date, value: number): WeekDaySwatch[] {
    const swatches = RELATIVE_DAY_SPECS.map(({ label, dayOffset }) => {
      const dateForDay = new Date(
        date.getFullYear(),
        date.getMonth(),
        date.getDate() + dayOffset,
        date.getHours(),
        date.getMinutes(),
        date.getSeconds(),
      );
      const targetDayOfYear = this.getDayOfYear(dateForDay);
      const startingHue = this.getDailyStartingHue(targetDayOfYear);
      const saturation = this.getSeasonalSaturation(dateForDay);
      const rgb = this.hsvToRgb(
        startingHue,
        saturation,
        (value + CLOCK_CONFIG.WEEK_SWATCH_VALUE_PERCENT) / 2.0,
      );

      return {
        label,
        dayOffset,
        startingHue,
        saturation,
        backgroundColor: this.rbgToCss(rgb),
        isBright:
          this.getRelativeLuminance(rgb) >
          CLOCK_CONFIG.LUMINANCE_CONTRAST_THRESHOLD,
        isToday: dayOffset === 0,
      };
    });

    const key = swatches
      .map((s) => `${s.startingHue}:${s.backgroundColor}:${s.isBright ? 1 : 0}`)
      .join("|");
    if (this.cachedWeekSwatches?.key === key) {
      return this.cachedWeekSwatches.value;
    }

    this.cachedWeekSwatches = { key, value: swatches };
    return swatches;
  }

  /**
• Computes all derived HSV visual and numeric values for a given Date.
*/
  static getClockState(date: Date) {
    const dayOfYear = this.getDayOfYear(date);
    const secondsSinceMidnight = this.getSecondsSinceMidnight(date);

    // Continuous cumulative angles prevent CSS transitions from spinning backwards at 360° -> 0°
    const secondAngle =
      (secondsSinceMidnight / CLOCK_CONFIG.SECONDS_PER_MINUTE) * 360;
    const minuteAngle =
      (secondsSinceMidnight / CLOCK_CONFIG.SECONDS_PER_HOUR) * 360;
    const hourAngle =
      (secondsSinceMidnight / CLOCK_CONFIG.SECONDS_PER_HALF_DAY) * 360;

    // Normalize hue into [0, 360)
    const dayOffset = this.getDailyStartingHue(dayOfYear);
    const hue = (((minuteAngle + dayOffset) % 360) + 360) % 360;
    const saturation = this.getSeasonalSaturation(date);
    const value = this.getValueAtSecond(secondsSinceMidnight);
    const rgb = this.hsvToRgb(hue, saturation, value);
    const hex = this.rgbToHex(rgb);
    const isBright =
      this.getRelativeLuminance(rgb) >
      CLOCK_CONFIG.LUMINANCE_CONTRAST_THRESHOLD;
    return {
      dayOfYear,
      secondsSinceMidnight,
      secondAngle,
      minuteAngle,
      hourAngle,
      hue,
      saturation,
      value,
      rgb,
      hex,
      isBright,
      backgroundColor: hex,
      hueWheelGradient: this.getHueWheelGradient(dayOffset, value, saturation),
      brightnessRingGradient: this.getBrightnessRingGradient(
        secondsSinceMidnight,
        hourAngle,
      ),
      hourTicks: this.getHourTicks(secondsSinceMidnight, hourAngle),
      hueOffsetTicks: this.getHueOffsetTicks(dayOffset, value, saturation),
      weekDays: this.getWeekSwatches(date, value),
    };
  }
}
