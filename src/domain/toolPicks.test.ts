import { describe, expect, it } from "vitest";
import { BACKGROUNDS, CLASSES, findByKey } from "../data";
import {
  applyToolPick,
  ALL_TOOL_OPTIONS,
  backgroundFixedTool,
  backgroundToolOptions,
  backgroundToolSlotCount,
  classToolSlotCount,
  classToolOptions,
  classToolGrantLabelProfile,
  mergeProficientTools,
  retainValidToolPicks,
  suggestedBackgroundTools,
  suggestedClassTools,
} from "./toolPicks";

describe("tool grant counts", () => {
  it("grants 3 musical instrument slots for bard", () => {
    expect(classToolSlotCount(findByKey(CLASSES, "bard"))).toBe(3);
    expect(classToolOptions(findByKey(CLASSES, "bard"))).toHaveLength(10);
  });

  it("grants 1 artisan or musical instrument slot for monk", () => {
    expect(classToolSlotCount(findByKey(CLASSES, "monk"))).toBe(1);
    expect(classToolOptions(findByKey(CLASSES, "monk")).length).toBeGreaterThan(10);
  });

  it("grants 1 slot with herbalism kit suggested for druid", () => {
    expect(classToolSlotCount(findByKey(CLASSES, "druid"))).toBe(1);
    expect(suggestedClassTools(findByKey(CLASSES, "druid"))).toEqual(["herbalism-kit"]);
  });

  it("lists the fixed tool as the only option for druid and rogue", () => {
    expect(classToolOptions(findByKey(CLASSES, "druid"))).toEqual(["herbalism-kit"]);
    expect(classToolOptions(findByKey(CLASSES, "rogue"))).toEqual(["thieves-tools"]);
  });

  it("grants 1 slot with thieves tools suggested for rogue", () => {
    expect(classToolSlotCount(findByKey(CLASSES, "rogue"))).toBe(1);
    expect(suggestedClassTools(findByKey(CLASSES, "rogue"))).toEqual(["thieves-tools"]);
  });

  it("grants 1 gaming set slot for soldier background", () => {
    expect(backgroundToolSlotCount(findByKey(BACKGROUNDS, "soldier"))).toBe(1);
  });

  it("suggests calligrapher supplies for acolyte", () => {
    expect(suggestedBackgroundTools(findByKey(BACKGROUNDS, "acolyte"))).toEqual(["calligraphers-supplies"]);
    expect(backgroundFixedTool(findByKey(BACKGROUNDS, "acolyte"))).toBe("calligraphers-supplies");
  });

  it("lists the fixed tool as the only option for acolyte, criminal, and sage", () => {
    expect(backgroundToolOptions(findByKey(BACKGROUNDS, "acolyte"))).toEqual(["calligraphers-supplies"]);
    expect(backgroundToolOptions(findByKey(BACKGROUNDS, "criminal"))).toEqual(["thieves-tools"]);
    expect(backgroundToolOptions(findByKey(BACKGROUNDS, "sage"))).toEqual(["calligraphers-supplies"]);
  });

  it("lists gaming sets for soldier background", () => {
    const options = backgroundToolOptions(findByKey(BACKGROUNDS, "soldier"));
    expect(options).toHaveLength(4);
    expect(options.every((id) => id.startsWith("gaming-set-"))).toBe(true);
  });
});

describe("tool pick validation", () => {
  it("rejects duplicate tool picks within the same source", () => {
    const next = applyToolPick(
      ["musical-instrument-lute", null, null],
      1,
      "musical-instrument-lute",
      ALL_TOOL_OPTIONS,
      [],
    );
    expect(next).toBeNull();
  });

  it("rejects picks outside grant categories", () => {
    const bardOptions = classToolOptions(findByKey(CLASSES, "bard"));
    const next = applyToolPick([null], 0, "disguise-kit", bardOptions, []);
    expect(next).toBeNull();
    const valid = applyToolPick([null], 0, "musical-instrument-lute", bardOptions, []);
    expect(valid).toEqual(["musical-instrument-lute"]);
  });

  it("retains valid picks when grant count changes", () => {
    const bardOptions = classToolOptions(findByKey(CLASSES, "bard"));
    expect(
      retainValidToolPicks(
        ["musical-instrument-lute", "musical-instrument-flute"],
        1,
        bardOptions,
        [],
      ),
    ).toEqual(["musical-instrument-lute"]);
  });
});

describe("tool grant labels", () => {
  it("maps bard grants to musical instrument labels", () => {
    expect(classToolGrantLabelProfile(findByKey(CLASSES, "bard"))).toBe("musicalInstrument");
  });

  it("maps monk grants to artisan or musical instrument labels", () => {
    expect(classToolGrantLabelProfile(findByKey(CLASSES, "monk"))).toBe("artisanOrMusicalInstrument");
  });
});

describe("mergeProficientTools", () => {
  it("merges picks from all sources without duplicates", () => {
    expect(
      mergeProficientTools(
        ["thieves-tools"],
        ["herbalism-kit", "musical-instrument-lute"],
        [{ kind: "tool", id: "disguise-kit" }],
      ),
    ).toEqual(["thieves-tools", "herbalism-kit", "musical-instrument-lute", "disguise-kit"]);
  });

  it("deduplicates the same tool chosen in background and class slots", () => {
    expect(mergeProficientTools(["thieves-tools"], ["thieves-tools"], [])).toEqual(["thieves-tools"]);
  });
});
