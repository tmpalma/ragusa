import { afterEach, describe, expect, it, vi } from "vitest";
import { isNative, pickFile, saveBytes, shareFile } from "./fileIo";

describe("fileIo", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("isNative is false in the web test environment", () => {
    expect(isNative).toBe(false);
  });

  it("shareFile uses the web save path when not native", async () => {
    const click = vi.fn();
    const anchor = { click, href: "", download: "" };
    const createElement = vi.fn(() => anchor);
    const createObjectURL = vi.fn(() => "blob:test");
    const revokeObjectURL = vi.fn();

    vi.stubGlobal("document", { createElement });
    vi.stubGlobal("URL", { createObjectURL, revokeObjectURL });
    vi.stubGlobal("window", {});

    await shareFile({ bytes: "{}", filename: "test.json", mimeType: "application/json" });

    expect(createElement).toHaveBeenCalledWith("a");
    expect(click).toHaveBeenCalledOnce();
  });

  it("falls back to download when showSaveFilePicker is unavailable", async () => {
    const click = vi.fn();
    const anchor = { click, href: "", download: "" };
    const createElement = vi.fn(() => anchor);
    const createObjectURL = vi.fn(() => "blob:test");
    const revokeObjectURL = vi.fn();

    vi.stubGlobal("document", { createElement });
    vi.stubGlobal("URL", { createObjectURL, revokeObjectURL });
    vi.stubGlobal("window", {});

    await saveBytes({ bytes: "{}", filename: "test.json", mimeType: "application/json" });

    expect(createElement).toHaveBeenCalledWith("a");
    expect(click).toHaveBeenCalledOnce();
    expect(createObjectURL).toHaveBeenCalledOnce();
    expect(revokeObjectURL).toHaveBeenCalledWith("blob:test");
  });

  it("uses showSaveFilePicker when available", async () => {
    const write = vi.fn();
    const close = vi.fn();
    const createWritable = vi.fn(async () => ({ write, close }));
    const showSaveFilePicker = vi.fn(async () => ({ createWritable }));

    vi.stubGlobal("window", { showSaveFilePicker });

    await saveBytes({ bytes: '{"ok":true}', filename: "test.json", mimeType: "application/json" });

    expect(showSaveFilePicker).toHaveBeenCalledOnce();
    expect(createWritable).toHaveBeenCalledOnce();
    expect(write).toHaveBeenCalledWith('{"ok":true}');
    expect(close).toHaveBeenCalledOnce();
  });

  it("returns without error when save picker is cancelled", async () => {
    const showSaveFilePicker = vi.fn(async () => {
      throw new DOMException("cancelled", "AbortError");
    });

    vi.stubGlobal("window", { showSaveFilePicker });

    await expect(
      saveBytes({ bytes: "{}", filename: "test.json", mimeType: "application/json" }),
    ).resolves.toBeUndefined();
  });

  it("returns empty array when open picker is cancelled", async () => {
    const showOpenFilePicker = vi.fn(async () => {
      throw new DOMException("cancelled", "AbortError");
    });

    vi.stubGlobal("window", { showOpenFilePicker });

    await expect(pickFile({ accept: { "application/json": [".json"] } })).resolves.toEqual([]);
  });

  it("uses showOpenFilePicker when available", async () => {
    const json = '{"name":"Hero"}';
    const file = new File([json], "hero.json", { type: "application/json" });
    const showOpenFilePicker = vi.fn(async () => [{ getFile: async () => file }]);

    vi.stubGlobal("window", { showOpenFilePicker });

    const picked = await pickFile({ accept: { "application/json": [".json"] }, multiple: false });

    expect(showOpenFilePicker).toHaveBeenCalledOnce();
    expect(picked).toEqual([{ name: "hero.json", text: json }]);
  });
});
