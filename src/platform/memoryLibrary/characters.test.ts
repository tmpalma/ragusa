import { describe, expect, it } from "vitest";
import { serializeCharacterFile } from "../../domain/characterFile";
import { MAX_CHARACTERS_PER_PLAYER } from "../../domain/libraryLimits";
import { INITIAL_CHARACTER } from "../../state/characterState";
import { createMemoryLibraryClient } from "../memoryLibraryClient";

const EMAIL = "ada@example.com";

describe("memory library client: characters", () => {
  it("refuses to delete a character who still has a membership", async () => {
    const client = createMemoryLibraryClient();
    await client.ensurePlayer(EMAIL);
    const character = await client.createCharacter(EMAIL, { title: "Bryn" });
    const campaign = await client.createCampaign(EMAIL, { title: "One" });
    await client.seatCharacter(EMAIL, campaign.id, character.id);

    await expect(client.deleteCharacter(EMAIL, character.id)).rejects.toMatchObject({
      code: "character_has_membership",
    });
    expect(await client.listCharacters(EMAIL)).toHaveLength(1);

    await client.unseatCharacter(EMAIL, campaign.id, character.id);
    await client.deleteCharacter(EMAIL, character.id);
    expect(await client.listCharacters(EMAIL)).toHaveLength(0);
    expect((await client.openCampaign(EMAIL, campaign.id)).members).toHaveLength(0);
  });

  it("imports a character file as a new row without seating it", async () => {
    const client = createMemoryLibraryClient();
    await client.ensurePlayer(EMAIL);
    const existing = await client.createCharacter(EMAIL, {
      title: "Bryn",
      document: { ...INITIAL_CHARACTER, name: "Bryn" },
    });
    const campaign = await client.createCampaign(EMAIL, { title: "One" });
    await client.seatCharacter(EMAIL, campaign.id, existing.id);

    const file = serializeCharacterFile({ ...INITIAL_CHARACTER, name: "Imported" });
    const firstImport = await client.importCharacter(EMAIL, file);
    const secondImport = await client.importCharacter(EMAIL, file);

    expect(firstImport.id).not.toBe(existing.id);
    expect(secondImport.id).not.toBe(firstImport.id);
    expect(firstImport.ownerEmail).toBe(EMAIL);
    expect(firstImport.document.name).toBe("Imported");

    const listed = await client.listCharacters(EMAIL);
    expect(listed).toHaveLength(3);
    const imported = listed.find((row) => row.id === firstImport.id);
    expect(imported).toMatchObject({ campaignId: null, campaignTitle: null, title: "Imported" });

    const opened = await client.openCampaign(EMAIL, campaign.id);
    expect(opened.members.map((member) => member.characterId)).toEqual([existing.id]);
  });

  describe("character cap", () => {
    async function fillToCap() {
      const client = createMemoryLibraryClient();
      await client.ensurePlayer(EMAIL);
      const created = [];
      for (let index = 1; index <= MAX_CHARACTERS_PER_PLAYER; index += 1) {
        created.push(await client.createCharacter(EMAIL, { title: `Hero ${index}` }));
      }
      return { client, created };
    }

    it("allows the 4th character and refuses the 5th with character_limit", async () => {
      const { client, created } = await fillToCap();
      expect(created).toHaveLength(4);
      await expect(client.createCharacter(EMAIL, { title: "Fifth" })).rejects.toMatchObject({
        code: "character_limit",
      });
      expect(await client.listCharacters(EMAIL)).toHaveLength(4);
    });

    it("refuses an import at the cap", async () => {
      const { client } = await fillToCap();
      const file = serializeCharacterFile({ ...INITIAL_CHARACTER, name: "Imported" });
      await expect(client.importCharacter(EMAIL, file)).rejects.toMatchObject({ code: "character_limit" });
      expect(await client.listCharacters(EMAIL)).toHaveLength(4);
    });

    it("frees a slot when a character is deleted", async () => {
      const { client, created } = await fillToCap();
      await client.deleteCharacter(EMAIL, created[0].id);
      const replacement = await client.createCharacter(EMAIL, { title: "Replacement" });
      expect(replacement.title).toBe("Replacement");
      expect(await client.listCharacters(EMAIL)).toHaveLength(4);
    });

    it("counts per owner", async () => {
      const { client } = await fillToCap();
      await client.ensurePlayer("bo@example.com");
      await expect(client.createCharacter("bo@example.com", { title: "Other" })).resolves.toMatchObject({
        title: "Other",
      });
    });
  });
});
