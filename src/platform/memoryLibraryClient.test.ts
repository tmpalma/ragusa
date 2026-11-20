import { describe, expect, it } from "vitest";
import { serializeCharacterFile } from "../domain/characterFile";
import { INITIAL_CHARACTER } from "../state/characterState";
import { LibraryClientError } from "./libraryClient";
import { createMemoryLibraryClient } from "./memoryLibraryClient";

const EMAIL = "ada@example.com";

describe("memory library client", () => {
  it("refuses to seat a character who already has a membership", async () => {
    const client = createMemoryLibraryClient();
    await client.ensurePlayer(EMAIL);
    const character = await client.createCharacter(EMAIL, {
      title: "Bryn",
      document: { ...INITIAL_CHARACTER, name: "Bryn" },
    });
    const first = await client.createCampaign(EMAIL, { title: "One" });
    const second = await client.createCampaign(EMAIL, { title: "Two" });

    await client.seatCharacter(EMAIL, first.id, character.id);

    await expect(client.seatCharacter(EMAIL, second.id, character.id)).rejects.toMatchObject({
      name: "LibraryClientError",
      code: "character_already_seated",
    });
    await expect(client.seatCharacter(EMAIL, first.id, character.id)).rejects.toBeInstanceOf(LibraryClientError);

    const opened = await client.openCampaign(EMAIL, first.id);
    expect(opened.members).toHaveLength(1);
    expect(opened.members[0]).toMatchObject({
      characterId: character.id,
      initiative: null,
      session: {},
      character: { name: "Bryn" },
    });
    expect(opened.members[0]?.id).not.toBe(character.id);
    const other = await client.openCampaign(EMAIL, second.id);
    expect(other.members).toHaveLength(0);
  });

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

  it("stores homebrew items for owned campaigns only", async () => {
    const client = createMemoryLibraryClient();
    await client.ensurePlayer(EMAIL);
    const campaign = await client.createCampaign(EMAIL, { title: "Citadel" });
    const other = await client.createCampaign(EMAIL, { title: "Other" });

    const created = await client.createHomebrewItem(EMAIL, {
      campaignIds: [campaign.id],
      data: {
        name: "Seed",
        description: "+1d6",
        category: "weapon",
        weightLb: 2,
        cost: { amount: 0, denomination: "gp" },
      },
    });

    expect(created.campaignIds).toEqual([campaign.id]);
    const listed = await client.listHomebrewItems(EMAIL, { campaignId: campaign.id });
    expect(listed).toHaveLength(1);
    expect(await client.listHomebrewItems(EMAIL, { campaignId: other.id })).toHaveLength(0);

    await expect(
      client.createHomebrewItem("eve@example.com", {
        campaignIds: [campaign.id],
        data: {
          name: "Stolen",
          description: "",
          category: "other",
          weightLb: 0,
          cost: { amount: 0, denomination: "gp" },
        },
      }),
    ).rejects.toMatchObject({ code: "invalid_homebrew_item" });
  });
});
