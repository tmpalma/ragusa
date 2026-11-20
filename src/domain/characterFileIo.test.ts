import { afterEach, describe, expect, it, vi } from "vitest";
import { CHARACTER_FILE_FORMAT, CHARACTER_FILE_SCHEMA_VERSION, serializeCharacterFile } from "./characterFile";
import { INITIAL_CHARACTER } from "../state/characterState";
import { isAbortError, loadCharacterFromFile, pickCharacterFileFromDisk, saveCharacterToDisk } from "./characterFileIo";

vi.mock("../platform/fileIo", () => ({
  isNative: false,
  saveBytes: vi.fn(),
  shareFile: vi.fn(),
  pickFile: vi.fn(),
}));

import * as fileIo from "../platform/fileIo";

const saveBytes = vi.mocked(fileIo.saveBytes);
const pickFile = vi.mocked(fileIo.pickFile);

describe("characterFileIo", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    saveBytes.mockReset();
    pickFile.mockReset();
  });

  it("detects AbortError", () => {
    expect(isAbortError(new DOMException("cancelled", "AbortError"))).toBe(true);
    expect(isAbortError(new Error("cancelled"))).toBe(false);
  });

  it("delegates save to platform saveBytes", async () => {
    await saveCharacterToDisk(INITIAL_CHARACTER);

    expect(saveBytes).toHaveBeenCalledOnce();
    const call = saveBytes.mock.calls[0]![0];
    expect(call.mimeType).toBe("application/json");
    expect(call.filename).toMatch(/\.json$/);
    const envelope = JSON.parse(call.bytes as string);
    expect(envelope.format).toBe(CHARACTER_FILE_FORMAT);
    expect(envelope.character).toEqual(INITIAL_CHARACTER);
  });

  it("returns null when open picker is unavailable", async () => {
    vi.stubGlobal("window", {});

    await expect(pickCharacterFileFromDisk()).resolves.toBeNull();
    expect(pickFile).not.toHaveBeenCalled();
  });

  it("delegates pick to platform pickFile when FSA is available", async () => {
    const json = serializeCharacterFile(INITIAL_CHARACTER);
    pickFile.mockResolvedValue([{ name: "character.json", text: json }]);
    vi.stubGlobal("window", { showOpenFilePicker: vi.fn() });

    const picked = await pickCharacterFileFromDisk();

    expect(pickFile).toHaveBeenCalledWith({
      accept: { "application/json": [".json"] },
      multiple: false,
    });
    expect(picked?.name).toBe("character.json");
    expect(await picked?.text()).toBe(json);
  });

  it("loads a character from a File", async () => {
    const json = serializeCharacterFile(INITIAL_CHARACTER);
    const file = new File([json], "character.json", { type: "application/json" });

    const loaded = await loadCharacterFromFile(file);
    expect(loaded.name).toBe(INITIAL_CHARACTER.name);
  });

  it("throws when loading an invalid file", async () => {
    const file = new File(["not json"], "bad.json", { type: "application/json" });
    await expect(loadCharacterFromFile(file)).rejects.toThrow();
  });

  it("throws when loading unsupported format", async () => {
    const payload = JSON.stringify({
      format: "other",
      schemaVersion: CHARACTER_FILE_SCHEMA_VERSION,
      exportedAt: new Date().toISOString(),
      character: {},
    });
    const file = new File([payload], "bad.json", { type: "application/json" });
    await expect(loadCharacterFromFile(file)).rejects.toThrow();
    expect(CHARACTER_FILE_FORMAT).toBe("dnd55e-chargen-character");
  });
});
