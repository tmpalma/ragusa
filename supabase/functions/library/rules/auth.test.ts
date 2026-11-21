import { describe, expect, it } from "vitest";
import { LibraryOpError } from "../errors.ts";
import {
  assertAuthUserLink,
  displayNameFromEmail,
  distinctIds,
  parseBearerToken,
  statusForErrorCode,
} from "./auth.ts";

function codeOf(fn: () => unknown): string | undefined {
  try {
    fn();
  } catch (err) {
    return err instanceof LibraryOpError ? err.code : "non-library-error";
  }
  return undefined;
}

describe("parseBearerToken", () => {
  it("returns the token for a Bearer header", () => {
    expect(parseBearerToken("Bearer abc.def.ghi")).toBe("abc.def.ghi");
    expect(parseBearerToken("bearer  abc ")).toBe("abc");
  });

  it("rejects a missing header", () => {
    expect(codeOf(() => parseBearerToken(null))).toBe("unauthenticated");
    expect(codeOf(() => parseBearerToken(undefined))).toBe("unauthenticated");
    expect(codeOf(() => parseBearerToken(""))).toBe("unauthenticated");
  });

  it("rejects other schemes", () => {
    expect(codeOf(() => parseBearerToken("Basic dXNlcjpwYXNz"))).toBe("unauthenticated");
    expect(codeOf(() => parseBearerToken("abc.def.ghi"))).toBe("unauthenticated");
  });

  it("rejects an empty or malformed token", () => {
    expect(codeOf(() => parseBearerToken("Bearer"))).toBe("unauthenticated");
    expect(codeOf(() => parseBearerToken("Bearer   "))).toBe("unauthenticated");
    expect(codeOf(() => parseBearerToken("Bearer a b"))).toBe("unauthenticated");
  });
});

describe("displayNameFromEmail", () => {
  it("uses the local part", () => {
    expect(displayNameFromEmail("ada@example.com")).toBe("ada");
  });

  it("falls back to the whole string when there is no local part", () => {
    expect(displayNameFromEmail("noatsign")).toBe("noatsign");
    expect(displayNameFromEmail("@example.com")).toBe("@example.com");
  });
});

describe("assertAuthUserLink", () => {
  it("treats a null link as linkable", () => {
    expect(assertAuthUserLink(null, "u1")).toBe(true);
    expect(assertAuthUserLink(undefined, "u1")).toBe(true);
  });

  it("accepts the same id without relinking", () => {
    expect(assertAuthUserLink("u1", "u1")).toBe(false);
  });

  it("forbids a mismatched link", () => {
    expect(codeOf(() => assertAuthUserLink("u2", "u1"))).toBe("forbidden");
  });
});

describe("statusForErrorCode", () => {
  it("maps auth codes to 401/403 and the rest to 400", () => {
    expect(statusForErrorCode("unauthenticated")).toBe(401);
    expect(statusForErrorCode("forbidden")).toBe(403);
    expect(statusForErrorCode("not_found")).toBe(400);
    expect(statusForErrorCode("empty_title")).toBe(400);
    expect(statusForErrorCode("character_already_seated")).toBe(400);
  });
});

describe("distinctIds", () => {
  it("dedupes string ids and drops empty or non-string values", () => {
    const rows = [{ id: "a" }, { id: "b" }, { id: "a" }, { id: null }, { id: "" }];
    expect(distinctIds(rows, (row) => row.id)).toEqual(["a", "b"]);
  });
});
