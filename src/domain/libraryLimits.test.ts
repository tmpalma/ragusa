import { describe, expect, it } from "vitest";
import { MAX_CHARACTERS_PER_PLAYER as EDGE_MAX_CHARACTERS_PER_PLAYER } from "../../supabase/functions/library/rules/characters.ts";
import { MAX_CHARACTERS_PER_PLAYER } from "./libraryLimits";

describe("library limits", () => {
  it("keeps the client character cap equal to the edge function's", () => {
    expect(MAX_CHARACTERS_PER_PLAYER).toBe(4);
    expect(MAX_CHARACTERS_PER_PLAYER).toBe(EDGE_MAX_CHARACTERS_PER_PLAYER);
  });
});
