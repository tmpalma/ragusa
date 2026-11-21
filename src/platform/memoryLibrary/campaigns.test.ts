import { describe, expect, it } from "vitest";
import { INITIAL_CHARACTER } from "../../state/characterState";
import { LibraryClientError } from "../libraryClient";
import { createMemoryLibraryClient } from "../memoryLibraryClient";

const EMAIL = "ada@example.com";

describe("memory library client: campaigns", () => {
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
});
