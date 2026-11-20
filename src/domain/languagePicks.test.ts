import { describe, expect, it } from "vitest";
import { INITIAL_CHARACTER, characterReducer } from "../state/characterState";
import {
  automaticLanguageGrants,
  grantedLanguageKeys,
  languagePickMaxCount,
  ORIGIN_LANGUAGE_PICK_COUNT,
} from "./languageGrants";
import { canAddLanguagePick } from "./languagePicks";

describe("language grants", () => {
  it("always grants Common", () => {
    expect(grantedLanguageKeys(INITIAL_CHARACTER)).toEqual(["common"]);
  });

  it("grants Druidic for druids and Thieves' Cant plus an extra pick for rogues", () => {
    const druid = { ...INITIAL_CHARACTER, classKey: "druid", level: 1 };
    expect(grantedLanguageKeys(druid)).toEqual(["common", "druidic"]);

    const rogue = { ...INITIAL_CHARACTER, classKey: "rogue", level: 1 };
    expect(grantedLanguageKeys(rogue)).toEqual(["common", "thieves-cant"]);
    expect(languagePickMaxCount(rogue)).toBe(ORIGIN_LANGUAGE_PICK_COUNT + 1);
  });

  it("grants Draconic from the Cult of the Dragon Initiate feat", () => {
    const withFeat = { ...INITIAL_CHARACTER, featKey: "cult-of-the-dragon-initiate" };
    expect(grantedLanguageKeys(withFeat)).toContain("draconic");
  });

  it("does not grant species languages in the 2024 ruleset", () => {
    const elf = { ...INITIAL_CHARACTER, speciesKey: "elf" };
    expect(automaticLanguageGrants(elf).some((grant) => grant.languageKey === "elvish")).toBe(false);
  });
});

describe("language picks", () => {
  it("adds up to two origin languages by default", () => {
    let state = characterReducer(INITIAL_CHARACTER, { type: "ADD_LANGUAGE_PICK", languageKey: "elvish" });
    expect(state.languagePicks).toEqual(["elvish"]);

    state = characterReducer(state, { type: "ADD_LANGUAGE_PICK", languageKey: "draconic" });
    expect(state.languagePicks).toEqual(["elvish", "draconic"]);

    const duplicate = characterReducer(state, { type: "ADD_LANGUAGE_PICK", languageKey: "elvish" });
    expect(duplicate.languagePicks).toEqual(state.languagePicks);

    const overCap = characterReducer(state, { type: "ADD_LANGUAGE_PICK", languageKey: "dwarvish" });
    expect(overCap.languagePicks).toEqual(state.languagePicks);
  });

  it("rejects granted languages and invalid keys", () => {
    const commonPick = characterReducer(INITIAL_CHARACTER, { type: "ADD_LANGUAGE_PICK", languageKey: "common" });
    expect(commonPick.languagePicks).toEqual([]);

    const invalid = characterReducer(INITIAL_CHARACTER, { type: "ADD_LANGUAGE_PICK", languageKey: "not-a-language" });
    expect(invalid.languagePicks).toEqual([]);
  });

  it("removes manual picks and drops duplicates when a grant appears", () => {
    let state = characterReducer(INITIAL_CHARACTER, { type: "ADD_LANGUAGE_PICK", languageKey: "draconic" });
    state = characterReducer(state, { type: "ADD_LANGUAGE_PICK", languageKey: "elvish" });
    state = characterReducer(state, { type: "SET_FEAT", key: "cult-of-the-dragon-initiate" });
    expect(state.languagePicks).toEqual(["elvish"]);
    expect(grantedLanguageKeys(state)).toContain("draconic");
  });

  it("allows three manual picks for rogues", () => {
    let state = characterReducer(INITIAL_CHARACTER, { type: "SET_CLASS", key: "rogue" });
    expect(canAddLanguagePick(state, "elvish")).toBe(true);
    state = characterReducer(state, { type: "ADD_LANGUAGE_PICK", languageKey: "elvish" });
    state = characterReducer(state, { type: "ADD_LANGUAGE_PICK", languageKey: "draconic" });
    state = characterReducer(state, { type: "ADD_LANGUAGE_PICK", languageKey: "dwarvish" });
    expect(state.languagePicks).toEqual(["elvish", "draconic", "dwarvish"]);
  });
});
