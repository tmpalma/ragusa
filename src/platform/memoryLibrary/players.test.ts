import { describe, expect, it } from "vitest";
import { MAX_DISPLAY_NAME_LENGTH as EDGE_MAX_DISPLAY_NAME_LENGTH } from "../../../supabase/functions/library/rules/players.ts";
import { LibraryClientError } from "../libraryClient";
import { createMemoryLibraryClient } from "../memoryLibraryClient";
import { MAX_DISPLAY_NAME_LENGTH } from "../../domain/libraryLimits";
import { normalizeDisplayName } from "./players";

const EMAIL = "ada@example.com";

async function codeOf(promise: Promise<unknown>): Promise<string | undefined> {
  try {
    await promise;
    return undefined;
  } catch (error) {
    return error instanceof LibraryClientError ? error.code : "other";
  }
}

describe("memory library client: players", () => {
  it("mirrors the edge display-name cap", () => {
    expect(MAX_DISPLAY_NAME_LENGTH).toBe(EDGE_MAX_DISPLAY_NAME_LENGTH);
  });

  it("getPlayer creates the row when missing and returns email and display name", async () => {
    const client = createMemoryLibraryClient();
    const player = await client.getPlayer(" Ada@Example.com ");
    expect(player.email).toBe(EMAIL);
    expect(typeof player.displayName).toBe("string");
    expect(player.displayName.length).toBeGreaterThan(0);
  });

  it("updatePlayer trims and stores the name for the caller only", async () => {
    const client = createMemoryLibraryClient();
    await client.ensurePlayer(EMAIL);
    await client.ensurePlayer("eve@example.com");
    const before = await client.getPlayer("eve@example.com");

    const updated = await client.updatePlayer(EMAIL, { displayName: "  Ada L.  " });
    expect(updated).toEqual({ email: EMAIL, displayName: "Ada L." });
    expect(await client.getPlayer(EMAIL)).toEqual({ email: EMAIL, displayName: "Ada L." });
    expect(await client.getPlayer("eve@example.com")).toEqual(before);
  });

  it("rejects blank and over-long names with empty_title and keeps the old name", async () => {
    const client = createMemoryLibraryClient();
    await client.updatePlayer(EMAIL, { displayName: "Ada" });

    expect(await codeOf(client.updatePlayer(EMAIL, { displayName: "   " }))).toBe("empty_title");
    expect(
      await codeOf(client.updatePlayer(EMAIL, { displayName: "x".repeat(MAX_DISPLAY_NAME_LENGTH + 1) })),
    ).toBe("empty_title");
    expect((await client.getPlayer(EMAIL)).displayName).toBe("Ada");
  });

  it("normalizeDisplayName accepts exactly the cap", () => {
    const atCap = "y".repeat(MAX_DISPLAY_NAME_LENGTH);
    expect(normalizeDisplayName(atCap)).toBe(atCap);
  });
});
