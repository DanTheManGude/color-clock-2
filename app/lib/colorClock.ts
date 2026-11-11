export const CLOCK_CONFIG = {
  UPDATE_INTERVAL_MS: 1000,
  DAILY_HUE_OFFSET_DEG: 40,
  HOURS_ON_DIAL: 12,
  DEGREES_PER_HOUR: 30,
  SATURATION_PERCENT: 70,
  MIN_LIGHTNESS_PERCENT: 20,
  MAX_LIGHTNESS_PERCENT: 80,
  CONTRAST_THRESHOLD_PERCENT: 50,
  LUMINANCE_CONTRAST_THRESHOLD: 0.179,
  SECONDS_PER_MINUTE: 60,
  SECONDS_PER_HOUR: 3600,
  SECONDS_PER_HALF_DAY: 43200,
  SECONDS_PER_DAY: 86400,
  MS_PER_DAY: 86400000,
  DAY_LABELS: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const,
};

export interface WeekDaySwatch {
  label: string;
  startingHue: number;
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
   * Computes lightness (20% at midnight -> 80% at noon) for any second of the day.
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
   * Computes the starting hue (noon/midnight hue) for a given day of the year.
   */
  static getDailyStartingHue(dayOfYear: number): number {
    return (
      (((dayOfYear * CLOCK_CONFIG.DAILY_HUE_OFFSET_DEG) % 360) + 360) % 360
    );
  }

  /**
   * Computes WCAG relative luminance (0.0 -> 1.0) from HSL values.
   */
  static getHslRelativeLuminance(h: number, s: number, l: number): number {
    const sat = s / 100;
    const light = l / 100;
    const c = (1 - Math.abs(2 * light - 1)) * sat;
    const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
    const m = light - c / 2;

    let r1 = 0;
    let g1 = 0;
    let b1 = 0;

    if (h < 60) {
      [r1, g1, b1] = [c, x, 0];
    } else if (h < 120) {
      [r1, g1, b1] = [x, c, 0];
    } else if (h < 180) {
      [r1, g1, b1] = [0, c, x];
    } else if (h < 240) {
      [r1, g1, b1] = [0, x, c];
    } else if (h < 300) {
      [r1, g1, b1] = [x, 0, c];
    } else {
      [r1, g1, b1] = [c, 0, x];
    }

    const toLinear = (channel: number) =>
      channel <= 0.03928
        ? channel / 12.92
        : Math.pow((channel + 0.055) / 1.055, 2.4);

    const r = toLinear(r1 + m);
    const g = toLinear(g1 + m);
    const b = toLinear(b1 + m);

    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  }

  /**
   * Computes the 12 hour tick marks with per-tick contrast based on the ring's lightness
   * at each tick's position (-6h to +6h window centered on hourAngle).
   */
  static getHourTicks(
    secondsSinceMidnight: number,
    hourAngle: number,
  ): HourTick[] {
    return Array.from({ length: CLOCK_CONFIG.HOURS_ON_DIAL }, (_, i) => {
      const angle = i * CLOCK_CONFIG.DEGREES_PER_HOUR;
      const deltaDeg = ((angle - hourAngle + 540) % 360) - 180;
      const offsetSeconds =
        (deltaDeg / CLOCK_CONFIG.DEGREES_PER_HOUR) *
        CLOCK_CONFIG.SECONDS_PER_HOUR;
      const lightnessAtTick = this.getLightnessAtSecond(
        secondsSinceMidnight + offsetSeconds,
      );

      return {
        angle,
        isCardinal: angle % 90 === 0,
        isBrightUnderneath:
          lightnessAtTick > CLOCK_CONFIG.CONTRAST_THRESHOLD_PERCENT,
      };
    });
  }

  /**
   * Computes the 40° hue-offset ticks with per-tick perceptual contrast against the hue underneath.
   */
  static getHueOffsetTicks(
    dayOffset: number,
    lightness: number,
    saturation: number = CLOCK_CONFIG.SATURATION_PERCENT,
  ): HueOffsetTick[] {
    const count = Math.floor(360 / CLOCK_CONFIG.DAILY_HUE_OFFSET_DEG);

    return Array.from({ length: count }, (_, i) => {
      const angle = i * CLOCK_CONFIG.DAILY_HUE_OFFSET_DEG;
      const hueAtTick = (((dayOffset + angle) % 360) + 360) % 360;
      const luminance = this.getHslRelativeLuminance(
        hueAtTick,
        saturation,
        lightness,
      );

      return {
        angle,
        isBrightUnderneath:
          luminance > CLOCK_CONFIG.LUMINANCE_CONTRAST_THRESHOLD,
      };
    });
  }

  /**
   * Builds the CSS conic-gradient string for the inner hue wheel.
   */
  static getHueWheelGradient(
    dayOffset: number,
    lightness: number,
    saturation: number = CLOCK_CONFIG.SATURATION_PERCENT,
  ): string {
    const wheelStartAngle = (360 - dayOffset) % 360;
    const stops = [0, 60, 120, 180, 240, 300, 360]
      .map((deg) => `hsl(${deg}, ${saturation}%, ${lightness}%)`)
      .join(", ");

    return `conic-gradient(from ${wheelStartAngle}deg, ${stops})`;
  }

  /**
   * Builds the CSS conic-gradient string for the 12-hour rolling grayscale brightness ring.
   */
  static getBrightnessRingGradient(
    secondsSinceMidnight: number,
    hourAngle: number,
  ): string {
    const brightnessStops = Array.from({ length: 25 }, (_, i) => {
      const offsetHours = i - 12;
      const angleDeg = i * 15;
      const stopLightness = this.getLightnessAtSecond(
        secondsSinceMidnight + offsetHours * CLOCK_CONFIG.SECONDS_PER_HOUR,
      );
      return `hsl(0, 0%, ${stopLightness.toFixed(1)}%) ${angleDeg}deg`;
    }).join(", ");

    const ringStartAngle = (hourAngle + 180) % 360;
    return `conic-gradient(from ${ringStartAngle.toFixed(2)}deg, ${brightnessStops})`;
  }

  /**
   * Generates the 7-day swatch list for the current week (Sun -> Sat).
   */
  static getWeekSwatches(date: Date): WeekDaySwatch[] {
    const currentDayOfWeek = date.getDay();

    return CLOCK_CONFIG.DAY_LABELS.map((label, index) => {
      const dateForDay = new Date(
        date.getFullYear(),
        date.getMonth(),
        date.getDate() + (index - currentDayOfWeek),
      );
      const targetDayOfYear = this.getDayOfYear(dateForDay);

      return {
        label,
        startingHue: this.getDailyStartingHue(targetDayOfYear),
        isToday: index === currentDayOfWeek,
      };
    });
  }

  /**
   * Computes all derived visual and numeric values for a given Date and saturation.
   */
  static getClockState(
    date: Date,
    saturation: number = CLOCK_CONFIG.SATURATION_PERCENT,
  ) {
    const dayOfYear = this.getDayOfYear(date);
    const secondsSinceMidnight = this.getSecondsSinceMidnight(date);

    // Continuous cumulative angles prevent CSS transitions from spinning backwards at 360° -> 0°
    const minuteAngle =
      (secondsSinceMidnight / CLOCK_CONFIG.SECONDS_PER_HOUR) * 360;
    const hourAngle =
      (secondsSinceMidnight / CLOCK_CONFIG.SECONDS_PER_HALF_DAY) * 360;

    // Normalize hue into [0, 360) for HSL color output
    const dayOffset = this.getDailyStartingHue(dayOfYear);
    const hue = (((minuteAngle + dayOffset) % 360) + 360) % 360;

    const lightness = this.getLightnessAtSecond(secondsSinceMidnight);
    const isBright = lightness > CLOCK_CONFIG.CONTRAST_THRESHOLD_PERCENT;

    return {
      dayOfYear,
      secondsSinceMidnight,
      minuteAngle,
      hourAngle,
      hue,
      saturation,
      lightness,
      isBright,
      backgroundColor: `hsl(${hue.toFixed(2)}, ${saturation}%, ${lightness.toFixed(2)}%)`,
      hueWheelGradient: this.getHueWheelGradient(
        dayOffset,
        lightness,
        saturation,
      ),
      brightnessRingGradient: this.getBrightnessRingGradient(
        secondsSinceMidnight,
        hourAngle,
      ),
      hourTicks: this.getHourTicks(secondsSinceMidnight, hourAngle),
      hueOffsetTicks: this.getHueOffsetTicks(dayOffset, lightness, saturation),
      weekDays: this.getWeekSwatches(date),
    };
  }
}
