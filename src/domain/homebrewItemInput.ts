import type { HomebrewItemData, HomebrewItemRange } from "./homebrewItems";
import type { MeasurementSystem } from "./units";
import { feetFromMeters, parseLocalizedDecimal, poundsFromKilograms } from "./units";

export function parseMassInput(raw: string, system: MeasurementSystem): Pick<HomebrewItemData, "weightLb" | "weightKg"> | null {
  const value = parseLocalizedDecimal(raw);
  if (value == null) return null;
  if (system === "metric") {
    return { weightLb: poundsFromKilograms(value), weightKg: value };
  }
  return { weightLb: value };
}

export function parseOptionalRangeInput(
  normalRaw: string,
  longRaw: string,
  system: MeasurementSystem,
): HomebrewItemRange | undefined {
  const normalTrim = normalRaw.trim();
  const longTrim = longRaw.trim();
  if (!normalTrim && !longTrim) return undefined;
  const normalValue = parseLocalizedDecimal(normalTrim);
  const longValue = parseLocalizedDecimal(longTrim);
  if (normalValue == null || longValue == null) return undefined;
  if (system === "metric") {
    return {
      normalFeet: feetFromMeters(normalValue),
      longFeet: feetFromMeters(longValue),
      normalMeters: normalValue,
      longMeters: longValue,
    };
  }
  return { normalFeet: normalValue, longFeet: longValue };
}

export function formatHomebrewRangeLine(
  range: HomebrewItemRange,
  formatLength: (feet: number, metricMeters?: number) => string,
): string {
  const normal = formatLength(range.normalFeet, range.normalMeters);
  const long = formatLength(range.longFeet, range.longMeters);
  return `${normal}/${long}`;
}
