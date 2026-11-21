import { describe, expect, it } from "vitest";
import { INITIAL_CHARACTER } from "../state/characterState";
import { characterForSave, parseCharacterFile } from "./characterFile";
import { parseRosterFile, rosterFileName, serializeRosterFile, type RosterCampaignSource } from "./rosterFile";

const ada = { ...INITIAL_CHARACTER, name: "Ada" };
const bo = { ...INITIAL_CHARACTER, name: "Bo" };

const campaign: RosterCampaignSource = {
  id: "camp-1",
  title: "Citadel",
  ownerEmail: "dm@example.com",
  members: [
    { characterId: "ch-1", initiative: 14, character: ada },
    { characterId: "ch-2", initiative: null, character: bo, ownerEmail: "bo@example.com" },
  ],
};

describe("serializeRosterFile", () => {
  it("writes the roster envelope with normal character files", () => {
    const parsed = JSON.parse(serializeRosterFile(campaign, new Date("2026-11-20T10:00:00.000Z")));
    expect(parsed).toMatchObject({
      format: "ragusa-roster",
      schemaVersion: 1,
      exportedAt: "2026-11-20T10:00:00.000Z",
      campaign: { id: "camp-1", title: "Citadel", dm: "dm@example.com" },
    });
    expect(parsed.members).toHaveLength(2);
    expect(parsed.members[0]).toMatchObject({ ownerEmail: null, characterId: "ch-1", initiative: 14 });
    expect(parsed.members[1]).toMatchObject({ ownerEmail: "bo@example.com", characterId: "ch-2", initiative: null });
    expect(parsed.members[0].file).toMatchObject({ format: "dnd55e-chargen-character", schemaVersion: 1 });
    // A single member file can be pulled out and imported as a character.
    expect(parseCharacterFile(JSON.stringify(parsed.members[0].file))).toEqual(characterForSave(ada));
  });

  it("round-trips through parseRosterFile", () => {
    const roster = parseRosterFile(serializeRosterFile(campaign));
    expect(roster.campaign).toEqual({ id: "camp-1", title: "Citadel", dm: "dm@example.com" });
    expect(roster.members).toEqual([
      { ownerEmail: null, characterId: "ch-1", initiative: 14, character: characterForSave(ada) },
      { ownerEmail: "bo@example.com", characterId: "ch-2", initiative: null, character: characterForSave(bo) },
    ]);
  });
});

describe("parseRosterFile", () => {
  const invalid = expect.objectContaining({ code: "invalid_roster_file" });
  const good = () => JSON.parse(serializeRosterFile(campaign));

  it("rejects non-JSON, the wrong format and newer schemas", () => {
    expect(() => parseRosterFile("{")).toThrow(invalid);
    expect(() => parseRosterFile(JSON.stringify({ ...good(), format: "ragusa-homebrew-items" }))).toThrow(invalid);
    expect(() => parseRosterFile(JSON.stringify({ ...good(), schemaVersion: 2 }))).toThrow(invalid);
  });

  it("rejects a bad campaign, members list or member file", () => {
    expect(() => parseRosterFile(JSON.stringify({ ...good(), campaign: { id: "x" } }))).toThrow(invalid);
    expect(() => parseRosterFile(JSON.stringify({ ...good(), members: {} }))).toThrow(invalid);
    const badFile = good();
    badFile.members[1].file = { format: "nope" };
    expect(() => parseRosterFile(JSON.stringify(badFile))).toThrow(invalid);
  });
});

describe("rosterFileName", () => {
  it("is <campaign>-roster-<yyyy-mm-dd>.json", () => {
    expect(rosterFileName("Citadel", new Date(2026, 10, 20))).toBe("Citadel-roster-2026-11-20.json");
  });
});
