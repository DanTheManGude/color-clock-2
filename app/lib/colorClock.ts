export const CLOCK_CONFIG = {
  UPDATE_INTERVAL_MS: 1000,
  STARTING_HUE: 0,
  HUE_OFFSET_DEG: 30,
  HOURS_ON_DIAL: 12,
  DEGREES_PER_HOUR: 360 / 12,
  MIN_SATURATION_PERCENT: 30,
  MAX_SATURATION_PERCENT: 65,
  SUMMER_SOLSTICE_DAY_OF_YEAR: 171, // June 21 (0-indexed)
  MIN_LIGHTNESS_PERCENT: 15,
  MAX_LIGHTNESS_PERCENT: 60,
  LUMINANCE_CONTRAST_THRESHOLD: 0.179, // WCAG
  BEZEL_LUMINANCE_CONTRAST_THRESHOLD: 0.28,
  SECONDS_PER_MINUTE: 60,
  SECONDS_PER_HOUR: 3600,
  SECONDS_PER_HALF_DAY: 43200,
  SECONDS_PER_DAY: 86400,
  MS_PER_DAY: 86400000,
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
  { length: Math.floor(360 / CLOCK_CONFIG.HUE_OFFSET_DEG) + 1 },
  (_, i) => (i * CLOCK_CONFIG.HUE_OFFSET_DEG) % 360,
);

export class ColorClock {
  // Lightweight memo caches so React.memo children skip re-renders when values don't change
  private static cachedHourTicks: { key: string; value: HourTick[] } | null =
    null;

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
   * Computes seasonal saturation (27% on Winter Solstice -> 87% on Summer Solstice).
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
   * Computes HSL Lightness (20% at midnight -> 80% at noon) for any second of the day.
   */
  static getLightnessAtSecond(seconds: number): number {
    const {
      SECONDS_PER_DAY,
      SECONDS_PER_HALF_DAY,
      MIN_LIGHTNESS_PERCENT,
      MAX_LIGHTNESS_PERCENT,
    } = CLOCK_CONFIG;

    const normalized =
      ((seconds % SECONDS_PER_DAY) + SECONDS_PER_DAY) % SECONDS_PER_DAY;
    const distanceFromMidnight =
      SECONDS_PER_HALF_DAY - Math.abs(SECONDS_PER_HALF_DAY - normalized);
    const lightnessRange = MAX_LIGHTNESS_PERCENT - MIN_LIGHTNESS_PERCENT;

    return (
      MIN_LIGHTNESS_PERCENT +
      (distanceFromMidnight / SECONDS_PER_HALF_DAY) * lightnessRange
    );
  }

  /**
   * Converts HSL values (h in [0,360), s & l in) to standard 0-255 RGB integers.
   */
  static hslToRgb(h: number, s: number, l: number): RgbColor {
    const normalizedH = h % 360;
    const sat = Math.max(0, Math.min(100, s)) / 100;
    const light = Math.max(0, Math.min(100, l)) / 100;

    const c = (1 - Math.abs(2 * light - 1)) * sat;
    const x = c * (1 - Math.abs(((normalizedH / 60) % 2) - 1));
    const m = light - c / 2;

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
   * Converts HSL directly to a CSS rgb(r, g, b) string.
   */
  static hslToCssRgb(h: number, s: number, l: number): string {
    const rgb = this.hslToRgb(h, s, l);
    return this.rgbToCss(rgb);
  }

  /**
   * Converts an RgbColor directly to a CSS rgb(r, g, b) string.
   */
  static rgbToCss({ r, g, b }: RgbColor): string {
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
   * HSL Lightness directly beneath each tick, returning a stable array reference when unchanged.
   */
  static getHourTicks(
    secondsSinceMidnight: number,
    hourAngle: number,
  ): HourTick[] {
    const normalizedHourAngle = hourAngle % 360;
    const ticks = Array.from({ length: CLOCK_CONFIG.HOURS_ON_DIAL }, (_, i) => {
      const angle = i * CLOCK_CONFIG.DEGREES_PER_HOUR;
      const rawDelta = (angle - normalizedHourAngle) % 360;
      const signedDeltaDeg = rawDelta >= 180 ? rawDelta - 360 : rawDelta;

      const offsetSeconds =
        (signedDeltaDeg / CLOCK_CONFIG.DEGREES_PER_HOUR) *
        CLOCK_CONFIG.SECONDS_PER_HOUR;
      const lightnessAtTick = this.getLightnessAtSecond(
        secondsSinceMidnight + offsetSeconds,
      );
      const luminance = this.getRelativeLuminance(
        this.hslToRgb(0, 0, lightnessAtTick),
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
   * Builds the CSS conic-gradient string for the inner HSL hue wheel.
   */
  static getHueWheelGradient(lightness: number, saturation: number): string {
    const wheelStartAngle = (360 - CLOCK_CONFIG.STARTING_HUE) % 360;
    const stops = HUE_WHEEL_STOPS.map((deg) =>
      this.hslToCssRgb(deg, saturation, lightness),
    ).join(", ");
    return `conic-gradient(from ${wheelStartAngle}deg, ${stops})`;
  }

  /**
   * Builds the CSS conic-gradient string for the 12-hour rolling grayscale HSL Lightness ring,
   * feathering the ±6h seam opposite the hour hand so -6h and +6h blend smoothly.
   */
  static getBrightnessRingGradient(
    secondsSinceMidnight: number,
    hourAngle: number,
  ): string {
    const steps = 48;
    const sixHoursSeconds = 6 * CLOCK_CONFIG.SECONDS_PER_HOUR;
    const minus6Lightness = this.getLightnessAtSecond(
      secondsSinceMidnight - sixHoursSeconds,
    );
    const plus6Lightness = this.getLightnessAtSecond(
      secondsSinceMidnight + sixHoursSeconds,
    );
    const seamColor = this.hslToCssRgb(
      0,
      0,
      (minus6Lightness + plus6Lightness) / 2,
    );

    const interiorStops = Array.from({ length: steps - 1 }, (_, idx) => {
      const i = idx + 1;
      const offsetHours = -6 + (i / steps) * 12;
      const angleDeg = (i / steps) * 360;
      const stopLightness = this.getLightnessAtSecond(
        secondsSinceMidnight + offsetHours * CLOCK_CONFIG.SECONDS_PER_HOUR,
      );

      return `${this.hslToCssRgb(0, 0, stopLightness)} ${angleDeg.toFixed(2)}deg`;
    });

    const allStops = [
      `${seamColor} 0deg`,
      ...interiorStops,
      `${seamColor} 360deg`,
    ].join(", ");

    const normalizedHourAngle = hourAngle % 360;
    const ringStartAngle = (normalizedHourAngle + 180) % 360;
    return `conic-gradient(from ${ringStartAngle.toFixed(2)}deg, ${allStops})`;
  }

  /**
   * Computes all derived HSL visual and numeric values for a given Date.
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
    const hue = (minuteAngle + CLOCK_CONFIG.STARTING_HUE) % 360;
    const saturation = this.getSeasonalSaturation(date);
    const lightness = this.getLightnessAtSecond(secondsSinceMidnight);
    const rgb = this.hslToRgb(hue, saturation, lightness);
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
      lightness,
      rgb,
      hex,
      isBright,
      backgroundColor: hex,
      hueWheelGradient: this.getHueWheelGradient(lightness, saturation),
      brightnessRingGradient: this.getBrightnessRingGradient(
        secondsSinceMidnight,
        hourAngle,
      ),
      hourTicks: this.getHourTicks(secondsSinceMidnight, hourAngle),
    };
  }
}
