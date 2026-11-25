import { describe, expect, it } from "vitest";
import { parseCatalogProse, parseInlines } from "./parseCatalogProse";

describe("parseInlines", () => {
  it("parses bold segments", () => {
    expect(parseInlines("**Flood.** Rest")).toEqual([
      { type: "strong", inlines: [{ type: "text", text: "Flood." }] },
      { type: "text", text: " Rest" },
    ]);
  });

  it("parses italic segments", () => {
    expect(parseInlines("*italic* plain")).toEqual([
      { type: "em", inlines: [{ type: "text", text: "italic" }] },
      { type: "text", text: " plain" },
    ]);
  });

  it("does not treat unmatched asterisks as HTML", () => {
    const result = parseInlines("<script>alert(1)</script>");
    expect(result).toEqual([{ type: "text", text: "<script>alert(1)</script>" }]);
  });
});

describe("parseCatalogProse", () => {
  it("splits paragraphs on blank lines", () => {
    const blocks = parseCatalogProse("Intro.\n\n**Flood.** More.");
    expect(blocks).toHaveLength(2);
    expect(blocks[0]).toEqual({
      type: "paragraph",
      inlines: [{ type: "text", text: "Intro." }],
    });
    expect(blocks[1]?.type).toBe("paragraph");
  });

  it("parses unordered lists", () => {
    const blocks = parseCatalogProse("- **Splash.** One gallon.\n- **Fountain.** Five gallons.");
    expect(blocks).toHaveLength(1);
    expect(blocks[0]).toEqual({
      type: "list",
      items: [
        [{ type: "strong", inlines: [{ type: "text", text: "Splash." }] }, { type: "text", text: " One gallon." }],
        [{ type: "strong", inlines: [{ type: "text", text: "Fountain." }] }, { type: "text", text: " Five gallons." }],
      ],
    });
  });

  it("matches control-water style effect clauses", () => {
    const sample =
      "Until the spell ends, you control water.\n\n**Flood.** You cause the water level to rise.\n\n**Part Water.** You part water.";
    const blocks = parseCatalogProse(sample);
    expect(blocks).toHaveLength(3);
    expect(blocks[1]).toMatchObject({ type: "paragraph" });
    expect(blocks[1]).toEqual(
      expect.objectContaining({
        inlines: expect.arrayContaining([
          { type: "strong", inlines: [{ type: "text", text: "Flood." }] },
        ]),
      }),
    );
  });
});