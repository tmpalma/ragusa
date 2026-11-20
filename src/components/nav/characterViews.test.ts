import { describe, expect, it } from "vitest";
import { resolveCharacterViewId } from "./characterViews";

describe("resolveCharacterViewId", () => {
  it("maps legacy combat segment to vitals", () => {
    expect(resolveCharacterViewId("combat")).toBe("vitals");
  });

  it("resolves vitals and actions segments", () => {
    expect(resolveCharacterViewId("vitals")).toBe("vitals");
    expect(resolveCharacterViewId("actions")).toBe("actions");
  });

  it("resolves companions segment", () => {
    expect(resolveCharacterViewId("companions")).toBe("companions");
  });
});
