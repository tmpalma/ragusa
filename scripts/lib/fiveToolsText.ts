/** Convert 5etools `{@tag ...}` markup and nested `entries` into plaintext. */

export function renderFiveToolsTags(text: string): string {
  return text.replace(/\{@([a-zA-Z]+)(?:\s+([^}]+))?\}/g, (_full, tag: string, body?: string) => {
    const raw = (body ?? "").trim();
    if (tag === "dc") return `DC ${raw}`;
    if (tag === "h") return "";
    if (tag === "atk") return raw;
    const parts = raw.split("|").map((part) => part.trim());
    if (parts.length >= 3 && parts[2]) return parts[2];
    return parts[0] || raw;
  });
}

export function flattenFiveToolsEntries(entries: unknown): string {
  if (entries == null) return "";
  if (typeof entries === "string") return renderFiveToolsTags(entries).trim();
  if (typeof entries === "number") return String(entries);
  if (Array.isArray(entries)) {
    return entries.map((entry) => flattenFiveToolsEntries(entry)).filter(Boolean).join("\n\n");
  }
  if (typeof entries !== "object") return "";
  const node = entries as Record<string, unknown>;
  const type = typeof node.type === "string" ? node.type : "";

  if (type === "list" && Array.isArray(node.items)) {
    return node.items
      .map((item) => flattenFiveToolsEntries(item))
      .filter(Boolean)
      .map((line) => `- ${line.replace(/\n\n/g, "\n  ")}`)
      .join("\n");
  }

  if (type === "table") {
    const caption = typeof node.caption === "string" ? renderFiveToolsTags(node.caption) : "";
    const labels = Array.isArray(node.colLabels)
      ? node.colLabels.map((label) => flattenFiveToolsEntries(label)).join(" | ")
      : "";
    const rows = Array.isArray(node.rows)
      ? node.rows
          .map((row) => (Array.isArray(row) ? row.map((cell) => flattenFiveToolsEntries(cell)).join(" | ") : flattenFiveToolsEntries(row)))
          .filter(Boolean)
      : [];
    return [caption, labels, ...rows].filter(Boolean).join("\n");
  }

  const name = typeof node.name === "string" ? renderFiveToolsTags(node.name) : "";
  const inner = flattenFiveToolsEntries(node.entries ?? node.entry ?? node.items);
  if (name && inner) return `**${name}.** ${inner}`;
  if (inner) return inner;
  if (name) return name;
  return "";
}

export function slugifyItemName(name: string): string {
  const plus = name.match(/^\+(\d+)\s+(.+)$/);
  const base = plus ? `${plus[2]} plus ${plus[1]}` : name;
  return base
    .toLowerCase()
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export function copperToItemCost(copper: number | undefined | null): { amount: number; denomination: "gp" | "sp" | "cp" } {
  const cp = typeof copper === "number" && Number.isFinite(copper) ? Math.max(0, Math.round(copper)) : 0;
  if (cp === 0) return { amount: 0, denomination: "cp" };
  if (cp % 100 === 0) return { amount: cp / 100, denomination: "gp" };
  if (cp % 10 === 0) return { amount: cp / 10, denomination: "sp" };
  return { amount: cp, denomination: "cp" };
}

export function parseBonusAmount(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value !== "string") return null;
  const match = value.trim().match(/^([+-]?\d+)/);
  if (!match) return null;
  return Number(match[1]);
}

export function typeAbbreviation(rawType: unknown): string {
  if (typeof rawType !== "string" || !rawType) return "";
  return rawType.split("|")[0] ?? "";
}
