export type MeasurementSystem = "imperial" | "metric";

/**
 * Book-style length steps. Not an SI conversion.
 * An exact `feet` match uses that row. Any other distance scales from the first row
 * (5 ft → 1.5 m in the 2024 translations this app follows).
 */
export const LENGTH_STEPS: readonly { feet: number; meters: number }[] = [{ feet: 5, meters: 1.5 }];

/**
 * Book-style mass steps. Not an SI conversion.
 * An exact `pounds` match uses that row. Any other weight scales from the first row
 * (1 lb → 0.5 kg).
 */
export const MASS_STEPS: readonly { pounds: number; kilograms: number }[] = [{ pounds: 1, kilograms: 0.5 }];

/** Book-style mile steps (1 mile → 1.5 km in 2024 translations this app follows). */
export const MILE_STEPS: readonly { miles: number; kilometers: number }[] = [{ miles: 1, kilometers: 1.5 }];

export const MEASUREMENT_STORAGE_KEY = "measurementSystem";

const PROSE_NUMBER = String.raw`\d+(?:\.\d+)?`;

export function parseMeasurementSystem(value: string | null | undefined): MeasurementSystem {
  return value === "metric" ? "metric" : "imperial";
}

function formatQuantity(value: number): string {
  if (!Number.isFinite(value)) return "0";
  const rounded = Math.round(value * 100) / 100;
  if (Object.is(rounded, -0) || rounded === 0) return "0";
  if (Number.isInteger(rounded)) return String(rounded);
  return rounded.toFixed(2).replace(/\.?0+$/, "");
}

function fromStep(
  value: number,
  steps: readonly { from: number; to: number }[],
): number {
  const exact = steps.find((step) => step.from === value);
  if (exact) return exact.to;
  const base = steps[0];
  if (!base || base.from === 0) return value;
  return (value / base.from) * base.to;
}

export function metersFromFeet(feet: number, metricMeters?: number): number {
  if (metricMeters !== undefined) return metricMeters;
  return fromStep(
    feet,
    LENGTH_STEPS.map((step) => ({ from: step.feet, to: step.meters })),
  );
}

export function kilogramsFromPounds(pounds: number, metricKg?: number): number {
  if (metricKg !== undefined) return metricKg;
  return fromStep(
    pounds,
    MASS_STEPS.map((step) => ({ from: step.pounds, to: step.kilograms })),
  );
}

function toStep(
  value: number,
  steps: readonly { from: number; to: number }[],
): number {
  const exact = steps.find((step) => step.to === value);
  if (exact) return exact.from;
  const base = steps[0];
  if (!base || base.to === 0) return value;
  return (value / base.to) * base.from;
}

/** Inverse of the book mass step (0.5 kg → 1 lb). */
export function poundsFromKilograms(kilograms: number): number {
  return toStep(
    kilograms,
    MASS_STEPS.map((step) => ({ from: step.pounds, to: step.kilograms })),
  );
}

/** Inverse of the book length step (1.5 m → 5 ft). */
export function feetFromMeters(meters: number): number {
  return toStep(
    meters,
    LENGTH_STEPS.map((step) => ({ from: step.feet, to: step.meters })),
  );
}

/** Accepts `1,5` or `1.5` for form input. */
export function parseLocalizedDecimal(raw: string): number | null {
  const trimmed = raw.trim().replace(",", ".");
  if (!trimmed) return null;
  const value = Number(trimmed);
  if (!Number.isFinite(value) || value < 0) return null;
  return value;
}

export function kilometersFromMiles(miles: number): number {
  return fromStep(
    miles,
    MILE_STEPS.map((step) => ({ from: step.miles, to: step.kilometers })),
  );
}

function proseLengthUnit(meters: number): "meter" | "meters" {
  return formatQuantity(meters) === "1" ? "meter" : "meters";
}

function proseMassUnit(kilograms: number): "kilogram" | "kilograms" {
  return formatQuantity(kilograms) === "1" ? "kilogram" : "kilograms";
}

function proseDistanceUnit(kilometers: number): "kilometer" | "kilometers" {
  return formatQuantity(kilometers) === "1" ? "kilometer" : "kilometers";
}

/** Weapon property strings store normal/long range in feet as `Range 20/60`. */
function formatWeaponRangeInProse(text: string, system: MeasurementSystem): string {
  const weaponRangePattern = new RegExp(`Range\\s+(${PROSE_NUMBER})/(${PROSE_NUMBER})\\b`, "gi");
  return text.replace(weaponRangePattern, (_match, normalFeet: string, longFeet: string) => {
    const normal = Number(normalFeet);
    const long = Number(longFeet);
    if (system === "metric") {
      return `Range ${formatQuantity(metersFromFeet(normal))}/${formatQuantity(metersFromFeet(long))} m`;
    }
    return `Range ${formatQuantity(normal)}/${formatQuantity(long)} ft.`;
  });
}

/**
 * Rewrites English measurement phrases in rules prose for metric display.
 * Imperial mode leaves most prose unchanged; weapon `Range N/M` pairs get ft. labels.
 * Does not alter stored catalog text.
 */
export function formatMeasurementProse(text: string, system: MeasurementSystem): string {
  if (!text) return text;

  let result = formatWeaponRangeInProse(text, system);
  if (system === "imperial") return result;

  const feetRangePattern = new RegExp(
    `(${PROSE_NUMBER})\\s+(?:to|–|-)\\s+(${PROSE_NUMBER})\\s+feet\\b`,
    "gi",
  );
  result = result.replace(feetRangePattern, (_match, fromFeet: string, toFeet: string) => {
    const fromM = formatQuantity(metersFromFeet(Number(fromFeet)));
    const toM = formatQuantity(metersFromFeet(Number(toFeet)));
    return `${fromM} to ${toM} meters`;
  });

  const hyphenFootSuffixPattern = new RegExp(
    `(${PROSE_NUMBER})-foot(-[a-z]+(?:-[a-z]+)*|[a-z][a-z]*)`,
    "gi",
  );
  result = result.replace(hyphenFootSuffixPattern, (_match, feet: string, suffix: string) => {
    const meters = formatQuantity(metersFromFeet(Number(feet)));
    if (suffix.startsWith("-")) return `${meters}-meter${suffix}`;
    return `${meters}-meter${suffix}`;
  });

  const hyphenFootSpacePattern = new RegExp(`(${PROSE_NUMBER})-foot(\\s+)`, "gi");
  result = result.replace(hyphenFootSpacePattern, (_match, feet: string, spacing: string) => {
    return `${formatQuantity(metersFromFeet(Number(feet)))}-meter${spacing}`;
  });

  const feetPattern = new RegExp(`\\b(${PROSE_NUMBER})\\s+feet\\b`, "gi");
  result = result.replace(feetPattern, (_match, feet: string) => {
    const meters = metersFromFeet(Number(feet));
    return `${formatQuantity(meters)} ${proseLengthUnit(meters)}`;
  });

  const footPattern = new RegExp(`\\b(${PROSE_NUMBER})\\s+foot(\\s+)`, "gi");
  result = result.replace(footPattern, (_match, feet: string, spacing: string) => {
    const meters = metersFromFeet(Number(feet));
    return `${formatQuantity(meters)} meter${spacing}`;
  });

  const poundsPattern = new RegExp(`\\b(${PROSE_NUMBER})\\s+pounds\\b`, "gi");
  result = result.replace(poundsPattern, (_match, pounds: string) => {
    const kg = kilogramsFromPounds(Number(pounds));
    return `${formatQuantity(kg)} ${proseMassUnit(kg)}`;
  });

  const poundPattern = new RegExp(`\\b(${PROSE_NUMBER})\\s+pound(\\s+)`, "gi");
  result = result.replace(poundPattern, (_match, pounds: string, spacing: string) => {
    const kg = kilogramsFromPounds(Number(pounds));
    return `${formatQuantity(kg)} ${proseMassUnit(kg)}${spacing}`;
  });

  const milesPattern = new RegExp(`\\b(${PROSE_NUMBER})\\s+miles\\b`, "gi");
  result = result.replace(milesPattern, (_match, miles: string) => {
    const km = kilometersFromMiles(Number(miles));
    return `${formatQuantity(km)} ${proseDistanceUnit(km)}`;
  });

  const milePattern = new RegExp(`\\b(${PROSE_NUMBER})\\s+mile(\\s+)`, "gi");
  result = result.replace(milePattern, (_match, miles: string, spacing: string) => {
    const km = kilometersFromMiles(Number(miles));
    return `${formatQuantity(km)} ${proseDistanceUnit(km)}${spacing}`;
  });

  return result;
}

/** Display caption for a length stored in feet. `metricMeters` overrides the table in metric mode only. */
export function formatLength(feet: number, system: MeasurementSystem, metricMeters?: number): string {
  if (system === "metric") {
    return `${formatQuantity(metersFromFeet(feet, metricMeters))} m`;
  }
  return `${formatQuantity(feet)} ft.`;
}

/** Display caption for a mass stored in pounds. `metricKg` overrides the table in metric mode only. */
export function formatMass(pounds: number, system: MeasurementSystem, metricKg?: number): string {
  if (system === "metric") {
    return `${formatQuantity(kilogramsFromPounds(pounds, metricKg))} kg`;
  }
  return `${formatQuantity(pounds)} lb.`;
}
