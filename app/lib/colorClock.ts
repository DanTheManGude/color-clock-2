export const CLOCK_CONFIG = {
  UPDATE_INTERVAL_MS: 1000,
  DAILY_HUE_OFFSET_DEG: 60,
  HOURS_ON_DIAL: 12,
  DEGREES_PER_HOUR: 30,
  MIN_SATURATION_PERCENT: 35,
  MAX_SATURATION_PERCENT: 95,
  SUMMER_SOLSTICE_DAY_OF_YEAR: 171, // June 21 (0-indexed)
  MIN_VALUE_PERCENT: 20,
  MAX_VALUE_PERCENT: 80,
  WEEK_SWATCH_VALUE_PERCENT: 65,
  LUMINANCE_CONTRAST_THRESHOLD: 0.179,
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

export class ColorClock {
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
    const isLeapYear = daysInYear === 366;
    const summerSolsticeDay =
      SUMMER_SOLSTICE_DAY_OF_YEAR + (isLeapYear ? 1 : 0);

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
    const toHex = (value: number) =>
      Math.max(0, Math.min(255, Math.round(value)))
        .toString(16)
        .padStart(2, "0");

    return `#${toHex(r)}${toHex(g)}${toHex(b)}`.toUpperCase();
  }

  /**
   * Converts HSV directly to a CSS rgb(r, g, b) string.
   */
  static hsvToCssRgb(h: number, s: number, v: number): string {
    const { r, g, b } = this.hsvToRgb(h, s, v);
    return `rgb(${r}, ${g}, ${b})`;
  }

  /**
   * Computes WCAG relative luminance (0.0 -> 1.0) from an RgbColor.
   */
  static getRelativeLuminance({ r, g, b }: RgbColor): number {
    const toLinear = (channel: number) => {
      const srgb = channel / 255;
      return srgb <= 0.03928
        ? srgb / 12.92
        : Math.pow((srgb + 0.055) / 1.055, 2.4);
    };

    return 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b);
  }

  /**
   * Computes the 12 hour tick marks with per-tick contrast based on the grayscale
   * HSV Value (S = 0%, V = 20%..80%) directly beneath each tick.
   */
  static getHourTicks(
    secondsSinceMidnight: number,
    hourAngle: number,
  ): HourTick[] {
    const normalizedHourAngle = ((hourAngle % 360) + 360) % 360;

    return Array.from({ length: CLOCK_CONFIG.HOURS_ON_DIAL }, (_, i) => {
      const angle = i * CLOCK_CONFIG.DEGREES_PER_HOUR;
      // Signed angular distance from the hour hand in [-180°, +180°)
      const rawDelta = (((angle - normalizedHourAngle) % 360) + 360) % 360;
      const signedDeltaDeg = rawDelta >= 180 ? rawDelta - 360 : rawDelta;

      // Convert angular offset on a 12h dial (30° = 1h) to seconds
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
        // Threshold ~0.28 (~56% gray) ensures dark ticks only render on genuinely bright gray
        isBrightUnderneath: luminance > 0.28,
      };
    });
  }

  /**
   * Computes the 40° hue-offset ticks with per-tick perceptual contrast against the HSV color underneath.
   */
  static getHueOffsetTicks(
    dayOffset: number,
    value: number,
    saturation: number,
  ): HueOffsetTick[] {
    const count = Math.floor(360 / CLOCK_CONFIG.DAILY_HUE_OFFSET_DEG);

    return Array.from({ length: count }, (_, i) => {
      const angle = i * CLOCK_CONFIG.DAILY_HUE_OFFSET_DEG;
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
    const stops = [0, 60, 120, 180, 240, 300, 360]
      .map((deg) => this.hsvToCssRgb(deg, saturation, value))
      .join(", ");

    return `conic-gradient(from ${wheelStartAngle}deg, ${stops})`;
  }

  /**
   * Builds the CSS conic-gradient string for the 12-hour rolling grayscale HSV Value ring,
   * subtly feathering the ±6h boundary opposite the hour hand so -6h and +6h blend smoothly.
   */
  static getBrightnessRingGradient(
    secondsSinceMidnight: number,
    hourAngle: number,
  ): string {
    const steps = 48; // 15-minute resolution (7.5° per step) across 12 hours
    const minus6Value = this.getValueAtSecond(
      secondsSinceMidnight - 6 * CLOCK_CONFIG.SECONDS_PER_HOUR,
    );
    const plus6Value = this.getValueAtSecond(
      secondsSinceMidnight + 6 * CLOCK_CONFIG.SECONDS_PER_HOUR,
    );
    const seamMidpointValue = (minus6Value + plus6Value) / 2;

    const interiorStops = Array.from({ length: steps - 1 }, (_, idx) => {
      const i = idx + 1; // 1 to 47 (7.5° to 352.5°), leaving 0° and 360° for the blended seam
      const offsetHours = -6 + (i / steps) * 12;
      const angleDeg = (i / steps) * 360;
      const stopValue = this.getValueAtSecond(
        secondsSinceMidnight + offsetHours * CLOCK_CONFIG.SECONDS_PER_HOUR,
      );
      return `${this.hsvToCssRgb(0, 0, stopValue)} ${angleDeg.toFixed(2)}deg`;
    });

    const seamColor = this.hsvToCssRgb(0, 0, seamMidpointValue);
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
   * Generates the 3-day swatch list (Yesterday, Today, Tomorrow) using the active HSV Value.
   */
  static getWeekSwatches(date: Date, value: number): WeekDaySwatch[] {
    const relativeDays = [
      { label: "Yesterday", dayOffset: -1 },
      { label: "Today", dayOffset: 0 },
      { label: "Tomorrow", dayOffset: 1 },
    ] as const;

    return relativeDays.map(({ label, dayOffset }) => {
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

      return {
        label,
        dayOffset,
        startingHue,
        saturation,
        backgroundColor: this.hsvToCssRgb(
          startingHue,
          saturation,
          (value + CLOCK_CONFIG.WEEK_SWATCH_VALUE_PERCENT) / 2,
        ),
        isToday: dayOffset === 0,
      };
    });
  }

  /**
• Computes all derived HSV visual and numeric values for a given Date.
*/
  static getClockState(date: Date) {
    const dayOfYear = this.getDayOfYear(date);
    const secondsSinceMidnight = this.getSecondsSinceMidnight(date);
    // Continuous cumulative angles prevent CSS transitions from spinning backwards at 360° -> 0°
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
