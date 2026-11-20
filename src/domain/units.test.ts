import { describe, expect, it } from "vitest";
import { carryingLimits } from "./carryingCapacity";
import {
  formatLength,
  formatMass,
  formatMeasurementProse,
  feetFromMeters,
  kilogramsFromPounds,
  kilometersFromMiles,
  metersFromFeet,
  parseLocalizedDecimal,
  parseMeasurementSystem,
  poundsFromKilograms,
} from "./units";

describe("formatLength", () => {
  it("keeps book feet in imperial mode", () => {
    expect(formatLength(30, "imperial")).toBe("30 ft.");
    expect(formatLength(0, "imperial")).toBe("0 ft.");
  });

  it("uses the 5 ft → 1.5 m book step", () => {
    expect(formatLength(5, "metric")).toBe("1.5 m");
    expect(formatLength(10, "metric")).toBe("3 m");
    expect(formatLength(25, "metric")).toBe("7.5 m");
    expect(formatLength(30, "metric")).toBe("9 m");
    expect(formatLength(0, "metric")).toBe("0 m");
  });

  it("shows a metric override only in metric mode", () => {
    expect(formatLength(5, "metric", 2)).toBe("2 m");
    expect(formatLength(5, "imperial", 2)).toBe("5 ft.");
    expect(metersFromFeet(5, 2)).toBe(2);
  });
});

describe("formatMass", () => {
  it("keeps pounds in imperial mode", () => {
    expect(formatMass(1, "imperial")).toBe("1 lb.");
    expect(formatMass(1.5, "imperial")).toBe("1.5 lb.");
    expect(formatMass(2.5, "imperial")).toBe("2.5 lb.");
  });

  it("uses the 1 lb → 0.5 kg book step", () => {
    expect(formatMass(1, "metric")).toBe("0.5 kg");
    expect(formatMass(2, "metric")).toBe("1 kg");
    expect(formatMass(10, "metric")).toBe("5 kg");
    expect(formatMass(1.5, "metric")).toBe("0.75 kg");
  });

  it("shows a metric override only in metric mode", () => {
    expect(formatMass(2, "metric", 0.9)).toBe("0.9 kg");
    expect(formatMass(2, "imperial", 0.9)).toBe("2 lb.");
    expect(kilogramsFromPounds(2, 0.9)).toBe(0.9);
  });
});

describe("measurement preference", () => {
  it("defaults anything other than metric to imperial", () => {
    expect(parseMeasurementSystem(null)).toBe("imperial");
    expect(parseMeasurementSystem("")).toBe("imperial");
    expect(parseMeasurementSystem("imperial")).toBe("imperial");
    expect(parseMeasurementSystem("metric")).toBe("metric");
  });
});

describe("formatMeasurementProse", () => {
  it("leaves text unchanged in imperial mode", () => {
    const sample = "Each creature in a 5-foot-radius Sphere within 30 feet.";
    expect(formatMeasurementProse(sample, "imperial")).toBe(sample);
  });

  it("converts hyphenated radius and plural feet", () => {
    expect(formatMeasurementProse("a 5-foot-radius Sphere", "metric")).toBe("a 1.5-meter-radius Sphere");
    expect(formatMeasurementProse("within 30 feet of you", "metric")).toBe("within 9 meters of you");
    expect(formatMeasurementProse("1 foot in diameter", "metric")).toBe("0.3 meter in diameter");
  });

  it("converts foot ranges and spell-style emanations", () => {
    expect(formatMeasurementProse("5 to 20 feet in diameter", "metric")).toBe("1.5 to 6 meters in diameter");
    expect(formatMeasurementProse("Self (10-foot Emanation)", "metric")).toBe("Self (3-meter Emanation)");
    expect(formatMeasurementProse("120 feet", "metric")).toBe("36 meters");
    expect(formatMeasurementProse("180 feet", "metric")).toBe("54 meters");
  });

  it("converts mass and miles with book steps", () => {
    expect(formatMeasurementProse("weighs 500 pounds", "metric")).toBe("weighs 250 kilograms");
    expect(formatMeasurementProse("1 mile away", "metric")).toBe("1.5 kilometers away");
    expect(formatMeasurementProse("500 miles", "metric")).toBe("750 kilometers");
    expect(kilometersFromMiles(1)).toBe(1.5);
  });

  it("converts glued foothigh typos", () => {
    expect(formatMeasurementProse("40-foothigh Cylinder", "metric")).toBe("12-meterhigh Cylinder");
  });

  it("labels weapon range pairs in imperial mode", () => {
    expect(formatMeasurementProse("Thrown (Range 20/60)", "imperial")).toBe("Thrown (Range 20/60 ft.)");
    expect(formatMeasurementProse("Ammunition (Range 150/600; Arrow)", "imperial")).toBe(
      "Ammunition (Range 150/600 ft.; Arrow)",
    );
  });

  it("converts weapon range pairs to meters in metric mode", () => {
    expect(formatMeasurementProse("Thrown (Range 20/60)", "metric")).toBe("Thrown (Range 6/18 m)");
    expect(formatMeasurementProse("Thrown (Range 30/120)", "metric")).toBe("Thrown (Range 9/36 m)");
    expect(formatMeasurementProse("Ammunition (Range 80/320; Arrow)", "metric")).toBe(
      "Ammunition (Range 24/96 m; Arrow)",
    );
    expect(formatMeasurementProse("Ammunition (Range 150/600; Arrow)", "metric")).toBe(
      "Ammunition (Range 45/180 m; Arrow)",
    );
    expect(formatMeasurementProse("Ammunition (Range 25/100; Needle)", "metric")).toBe(
      "Ammunition (Range 7.5/30 m; Needle)",
    );
  });
});

describe("book-scale inverses and localized decimals", () => {
  it("round-trips mass and length with book steps", () => {
    expect(poundsFromKilograms(0.5)).toBe(1);
    expect(feetFromMeters(1.5)).toBe(5);
    expect(poundsFromKilograms(kilogramsFromPounds(3))).toBe(3);
  });

  it("parses comma decimals", () => {
    expect(parseLocalizedDecimal("1,5")).toBe(1.5);
    expect(parseLocalizedDecimal("2")).toBe(2);
    expect(parseLocalizedDecimal("")).toBeNull();
  });
});

describe("display conversion leaves encumbrance math in pounds", () => {
  it("does not replace carrying limits", () => {
    const limits = carryingLimits(10, "smallMedium");
    expect(limits).toEqual({ carryLb: 150, dragLiftPushLb: 300 });
    expect(formatMass(limits.carryLb, "metric")).toBe("75 kg");
    expect(formatMass(limits.carryLb, "imperial")).toBe("150 lb.");
  });
});
