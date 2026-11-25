export type ProseInline =
  | { type: "text"; text: string }
  | { type: "strong"; inlines: ProseInline[] }
  | { type: "em"; inlines: ProseInline[] };

export type ProseBlock =
  | { type: "paragraph"; inlines: ProseInline[] }
  | { type: "list"; items: ProseInline[][] };

export function parseInlines(text: string): ProseInline[] {
  const result: ProseInline[] = [];
  let index = 0;

  while (index < text.length) {
    if (text.startsWith("**", index)) {
      const end = text.indexOf("**", index + 2);
      if (end !== -1) {
        const inner = text.slice(index + 2, end);
        result.push({ type: "strong", inlines: parseInlines(inner) });
        index = end + 2;
        continue;
      }
    }

    if (text[index] === "*" && text[index + 1] !== "*") {
      const end = text.indexOf("*", index + 1);
      if (end !== -1) {
        const inner = text.slice(index + 1, end);
        result.push({ type: "em", inlines: parseInlines(inner) });
        index = end + 1;
        continue;
      }
    }

    let end = index;
    while (end < text.length) {
      if (text.startsWith("**", end)) break;
      if (text[end] === "*" && text[end + 1] !== "*") break;
      end += 1;
    }

    if (end > index) {
      result.push({ type: "text", text: text.slice(index, end) });
      index = end;
    } else {
      result.push({ type: "text", text: text[index] });
      index += 1;
    }
  }

  return result;
}

export function parseCatalogProse(source: string): ProseBlock[] {
  const trimmed = source.trim();
  if (!trimmed) return [];

  const chunks = trimmed.split(/\n\n+/);
  const blocks: ProseBlock[] = [];

  for (const chunk of chunks) {
    const lines = chunk.split("\n");
    const nonempty = lines.map((line) => line.trimEnd()).filter((line) => line.length > 0);
    const isList = nonempty.length > 0 && nonempty.every((line) => line.startsWith("- "));

    if (isList) {
      blocks.push({
        type: "list",
        items: nonempty.map((line) => parseInlines(line.slice(2).trimStart())),
      });
      continue;
    }

    blocks.push({
      type: "paragraph",
      inlines: parseInlines(nonempty.join(" ")),
    });
  }

  return blocks;
}