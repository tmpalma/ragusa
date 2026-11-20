import { describe, expect, it, beforeEach, afterEach } from "vitest";
import { serializeCharacterFile } from "../domain/characterFile";
import { characterReducer, INITIAL_CHARACTER } from "../state/characterState";
import {
  LAST_CAMPAIGN_KEY,
  LAST_CHARACTER_KEY,
  loadActivePlay,
  loadLastCampaign,
  loadLastCharacter,
  loadPlayerLastCharacter,
  playerActivePlayKey,
  playerLastCharacterKey,
  saveActivePlay,
  saveLastCampaign,
  saveLastCharacter,
  savePlayerLastCharacter,
  parseLastCharacterOrDefault,
} from "./characterPersist";
import {
  createMemoryPersistStore,
  resetPersistStoreForTests,
  setPersistStoreForTests,
} from "./persistStore";

describe("characterPersist", () => {
  beforeEach(() => {
    setPersistStoreForTests(createMemoryPersistStore());
  });

  afterEach(() => {
    resetPersistStoreForTests();
  });

  it("round-trips the last character through the file envelope", async () => {
    const character = characterReducer(INITIAL_CHARACTER, { type: "SET_NAME", value: "Bryn" });

    await saveLastCharacter(character);
    const loaded = await loadLastCharacter();

    expect(loaded).not.toBeNull();
    expect(loaded?.name).toBe("Bryn");
  });

  it("round-trips campaign members with stable ids and initiative", async () => {
    const members = [
      { id: "member-a", character: { ...INITIAL_CHARACTER, name: "First" }, initiative: 12 },
      { id: "member-b", character: { ...INITIAL_CHARACTER, name: "Second" }, initiative: null },
    ];

    await saveLastCampaign(members);
    const loaded = await loadLastCampaign();

    expect(loaded).toHaveLength(2);
    expect(loaded[0]).toEqual(members[0]);
    expect(loaded[1]).toEqual(members[1]);
  });

  it("loads legacy campaign payloads without initiative as null", async () => {
    const character = { ...INITIAL_CHARACTER, name: "Legacy" };
    const store = createMemoryPersistStore({
      [LAST_CAMPAIGN_KEY]: JSON.stringify({
        members: [{ id: "legacy", character: serializeCharacterFile(character) }],
      }),
    });
    setPersistStoreForTests(store);
    const loaded = await loadLastCampaign();

    expect(loaded).toHaveLength(1);
    expect(loaded[0]?.initiative).toBeNull();
    expect(loaded[0]?.character.name).toBe("Legacy");
  });

  it("keeps character and campaign stores independent", async () => {
    const character = characterReducer(INITIAL_CHARACTER, { type: "SET_NAME", value: "Solo" });
    const members = [{ id: "party-1", character: { ...INITIAL_CHARACTER, name: "Party" }, initiative: null }];

    const characterStore = createMemoryPersistStore();
    setPersistStoreForTests(characterStore);
    await saveLastCharacter(character);
    expect(await characterStore.get(LAST_CAMPAIGN_KEY)).toBeNull();

    const campaignStore = createMemoryPersistStore();
    setPersistStoreForTests(campaignStore);
    await saveLastCampaign(members);
    expect(await campaignStore.get(LAST_CHARACTER_KEY)).toBeNull();

    setPersistStoreForTests(
      createMemoryPersistStore({
        [LAST_CHARACTER_KEY]: (await characterStore.get(LAST_CHARACTER_KEY)) ?? "",
        [LAST_CAMPAIGN_KEY]: (await campaignStore.get(LAST_CAMPAIGN_KEY)) ?? "",
      }),
    );

    expect(await loadLastCharacter()).toEqual(character);
    expect(await loadLastCampaign()).toEqual(members);
  });

  it("returns null for missing or invalid character payloads", async () => {
    expect(await loadLastCharacter()).toBeNull();

    const store = createMemoryPersistStore({ [LAST_CHARACTER_KEY]: "{not json" });
    setPersistStoreForTests(store);

    expect(await loadLastCharacter()).toBeNull();
    expect(parseLastCharacterOrDefault("{not json")).toEqual(INITIAL_CHARACTER);
  });

  it("returns an empty roster for missing or invalid campaign payloads", async () => {
    expect(await loadLastCampaign()).toEqual([]);

    const store = createMemoryPersistStore({ [LAST_CAMPAIGN_KEY]: "{bad" });
    setPersistStoreForTests(store);
    expect(await loadLastCampaign()).toEqual([]);

    const malformedMembers = createMemoryPersistStore({
      [LAST_CAMPAIGN_KEY]: JSON.stringify({ members: [{ id: "x", character: "{bad" }] }),
    });
    setPersistStoreForTests(malformedMembers);
    expect(await loadLastCampaign()).toEqual([]);
  });

  it("keeps per-player character drafts and active-play separate", async () => {
    const playerA = "player-a@example.com";
    const playerB = "player-b@example.com";
    const charA = characterReducer(INITIAL_CHARACTER, { type: "SET_NAME", value: "Bard" });
    const charB = characterReducer(INITIAL_CHARACTER, { type: "SET_NAME", value: "Sorcerer" });

    await savePlayerLastCharacter(playerA, charA);
    await savePlayerLastCharacter(playerB, charB);
    await saveActivePlay(playerA, { characterId: "char-a-id" });
    await saveActivePlay(playerB, { characterId: "char-b-id" });

    expect((await loadPlayerLastCharacter(playerA))?.name).toBe("Bard");
    expect((await loadPlayerLastCharacter(playerB))?.name).toBe("Sorcerer");
    expect(await loadActivePlay(playerA)).toEqual({
      characterId: "char-a-id",
      campaignId: null,
    });
    expect(await loadActivePlay(playerB)).toEqual({
      characterId: "char-b-id",
      campaignId: null,
    });
    expect(playerLastCharacterKey(playerA)).not.toBe(playerLastCharacterKey(playerB));
    expect(playerActivePlayKey(playerA)).not.toBe(playerActivePlayKey(playerB));
  });
});
