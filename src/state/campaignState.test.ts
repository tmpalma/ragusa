import { describe, expect, it } from "vitest";
import { RAW_TABLE_RULES } from "../domain/tableRules";
import { characterReducer, INITIAL_CHARACTER } from "./characterState";
import { campaignReducer, INITIAL_CAMPAIGN_STATE, memberCaption } from "./campaignState";

function member(
  id: string,
  name: string,
  initiative: number | null = null,
  character = INITIAL_CHARACTER,
) {
  return { id, character: { ...character, name }, initiative };
}

describe("memberCaption", () => {
  it("uses trimmed character name when present", () => {
    expect(memberCaption({ ...INITIAL_CHARACTER, name: "  Aria  " }, 2, "Char {n}")).toBe("Aria");
  });

  it("uses unnamed template with 1-based index when name is blank", () => {
    expect(memberCaption({ ...INITIAL_CHARACTER, name: "" }, 1, "Char {n}")).toBe("Char 1");
    expect(memberCaption({ ...INITIAL_CHARACTER, name: "   " }, 3, "Char {n}")).toBe("Char 3");
  });
});

describe("campaignReducer REMOVE_MEMBER", () => {
  it("removes the member with the matching id", () => {
    const state = {
      members: [member("a", "First"), member("b", "Second")],
    };

    const next = campaignReducer(state, { type: "REMOVE_MEMBER", id: "a" });

    expect(next.members).toHaveLength(1);
    expect(next.members[0]?.id).toBe("b");
    expect(next.members[0]?.character.name).toBe("Second");
  });
});

describe("campaignReducer ADD_MEMBERS", () => {
  it("appends members with stable ids and null initiative", () => {
    const next = campaignReducer(INITIAL_CAMPAIGN_STATE, {
      type: "ADD_MEMBERS",
      characters: [{ ...INITIAL_CHARACTER, name: "Imported" }],
    });

    expect(next.members).toHaveLength(1);
    expect(next.members[0]?.character.name).toBe("Imported");
    expect(next.members[0]?.id).toBeTruthy();
    expect(next.members[0]?.initiative).toBeNull();
  });
});

describe("campaignReducer SET_INITIATIVE", () => {
  it("updates initiative for the matching member", () => {
    const state = { members: [member("a", "First"), member("b", "Second")] };

    const next = campaignReducer(state, { type: "SET_INITIATIVE", id: "b", initiative: 14 });

    expect(next.members[0]?.initiative).toBeNull();
    expect(next.members[1]?.initiative).toBe(14);
  });

  it("clears initiative when set to null", () => {
    const state = { members: [member("a", "First", 10)] };

    const next = campaignReducer(state, { type: "SET_INITIATIVE", id: "a", initiative: null });

    expect(next.members[0]?.initiative).toBeNull();
  });
});

describe("campaignReducer SORT_BY_INITIATIVE", () => {
  it("sorts members by initiative descending", () => {
    const state = {
      members: [member("a", "Low", 5), member("b", "High", 18), member("c", "Mid", 12)],
    };

    const next = campaignReducer(state, { type: "SORT_BY_INITIATIVE" });

    expect(next.members.map((m) => m.id)).toEqual(["b", "c", "a"]);
  });

  it("preserves relative order for tied initiative values", () => {
    const state = {
      members: [member("a", "First tie", 10), member("b", "Second tie", 10), member("c", "Higher", 15)],
    };

    const next = campaignReducer(state, { type: "SORT_BY_INITIATIVE" });

    expect(next.members.map((m) => m.id)).toEqual(["c", "a", "b"]);
  });

  it("places blank initiative values last while preserving their relative order", () => {
    const state = {
      members: [member("a", "Blank first", null), member("b", "Has value", 8), member("c", "Blank second", null)],
    };

    const next = campaignReducer(state, { type: "SORT_BY_INITIATIVE" });

    expect(next.members.map((m) => m.id)).toEqual(["b", "a", "c"]);
  });
});

describe("campaignReducer SET_MEMBER_CONCENTRATION_SPELL", () => {
  it("sets concentration on a valid prepared concentration spell and clears rounds", () => {
    let bard = characterReducer(INITIAL_CHARACTER, { type: "SET_CLASS", key: "bard" });
    bard = characterReducer(bard, { type: "ADD_SPELL_PICK", spellKey: "faerie-fire" });
    bard = characterReducer(bard, {
      type: "SET_CONCENTRATION_SPELL",
      spellKey: "faerie-fire",
    });
    bard = characterReducer(bard, { type: "SET_CONCENTRATION_ROUNDS", value: 5 });

    const state = { members: [member("a", "Bard", null, bard)] };

    const next = campaignReducer(state, {
      type: "SET_MEMBER_CONCENTRATION_SPELL",
      id: "a",
      spellKey: null,
      tableRules: RAW_TABLE_RULES,
    });

    expect(next.members[0]?.character.concentrationSpellKey).toBeNull();
    expect(next.members[0]?.character.concentrationRoundsRemaining).toBeNull();

    const concentrating = campaignReducer(next, {
      type: "SET_MEMBER_CONCENTRATION_SPELL",
      id: "a",
      spellKey: "faerie-fire",
      tableRules: RAW_TABLE_RULES,
    });

    expect(concentrating.members[0]?.character.concentrationSpellKey).toBe("faerie-fire");
    expect(concentrating.members[0]?.character.concentrationRoundsRemaining).toBeNull();
  });

  it("ignores unknown concentration spell keys", () => {
    let bard = characterReducer(INITIAL_CHARACTER, { type: "SET_CLASS", key: "bard" });
    bard = characterReducer(bard, { type: "ADD_SPELL_PICK", spellKey: "faerie-fire" });
    const state = { members: [member("a", "Bard", null, bard)] };

    const next = campaignReducer(state, {
      type: "SET_MEMBER_CONCENTRATION_SPELL",
      id: "a",
      spellKey: "fireball",
      tableRules: RAW_TABLE_RULES,
    });

    expect(next.members[0]?.character.concentrationSpellKey).toBeNull();
    expect(next.members[0]?.character).toBe(state.members[0]?.character);
  });
});

describe("campaignReducer HYDRATE_MEMBERS", () => {
  it("replaces the roster while preserving member ids", () => {
    const hydrated = {
      members: [member("saved-a", "A", 3), member("saved-b", "B", null)],
    };

    const next = campaignReducer(INITIAL_CAMPAIGN_STATE, {
      type: "HYDRATE_MEMBERS",
      members: hydrated.members,
    });

    expect(next.members).toEqual(hydrated.members);
  });
});
