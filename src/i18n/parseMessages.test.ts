import { describe, expect, it } from "vitest";
import { interpolate, parseMarkdownMessages } from "./parseMessages";

describe("parseMarkdownMessages", () => {
  it("extracts keys from headings with multiline bodies", () => {
    const parsed = parseMarkdownMessages(`## title
Combat

## hint
Choose a Class.

## withTable
| A | B |
|---|---|
| 1 | 2 |
`);

    expect(parsed.title).toBe("Combat");
    expect(parsed.hint).toBe("Choose a Class.");
    expect(parsed.withTable).toContain("| A | B |");
  });
});

describe("interpolate", () => {
  it("replaces placeholders and leaves unknown tokens intact", () => {
    expect(interpolate("Points used: {count}", { count: 5 })).toBe("Points used: 5");
    expect(interpolate("Hello {name}", {})).toBe("Hello {name}");
  });
});
