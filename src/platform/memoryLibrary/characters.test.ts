import { describe, expect, it } from "vitest";
import { serializeCharacterFile } from "../../domain/characterFile";
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
});
