import type { FeatCombatReferenceOption } from "./featEffects";

export const FEAT_COMBAT_REFERENCE_INTRO_DEFAULT = "You gain the following benefits.";

export interface ParsedFeatDescriptionReference {
  intro: string;
  options: FeatCombatReferenceOption[];
  trailing?: string;
}

export interface FeatDescriptionMechanicsReference {
  intro?: string;
  options: FeatCombatReferenceOption[];
}

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function stripPrerequisite(text: string): string {
  return text.replace(/^Prerequisite:[^\n]*(?:\n\n)?/, "").trim();
}

function isColonHeader(block: string): boolean {
  const trimmed = block.trim();
  return trimmed.length > 0 && trimmed.length < 80 && /^[^:]+:$/.test(trimmed);
}

function isBoldOptionBlock(block: string): boolean {
  return /^\*\*[^*]+\*\*\.?\s/.test(block);
}

function isPipeTableBlock(block: string): boolean {
  if (!block.includes("|")) return false;
  const lines = block
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
  const pipeLines = lines.filter((line) => line.includes("|"));
  return pipeLines.length >= 2;
}

/** Every non-empty line is a pipe row (no title line above the header row). */
function isPurePipeTableBlock(block: string): boolean {
  if (!isPipeTableBlock(block)) return false;
  const lines = block
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
  return lines.every((line) => line.includes("|"));
}

function isFeatTrailingTableBlock(block: string): boolean {
  return /\nSpell Slot Level\b/m.test(block) || (block.includes("|") && !isPipeTableBlock(block));
}

function parsePipeTableBlock(block: string): FeatCombatReferenceOption["table"] | null {
  const lines = block
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
  const pipeLines = lines.filter((line) => line.includes("|"));
  if (pipeLines.length < 2) return null;
  const [headerLine, ...dataLines] = pipeLines;
  const headers = headerLine.split("|").map((cell) => cell.trim());
  const rows = dataLines.map((line) => line.split("|").map((cell) => cell.trim()));
  return { headers, rows };
}

function parseBoldOption(block: string): { name: string; desc: string } | null {
  const match = block.match(/^\*\*([^*]+)\*\*\.?\s*(.*)$/s);
  if (!match) return null;
  const name = match[1].trim().replace(/\.$/, "");
  return { name, desc: match[2].trim() };
}

function isOptionStart(block: string): boolean {
  return isBoldOptionBlock(block) || isColonHeader(block);
}

/** Turn markdown bullet ability lines into paragraph breaks for named-block parsing. */
function normalizeNamedAbilityBlocks(desc: string): string {
  return desc.replace(/\n- \*\*/g, "\n\n**");
}

export function parseFeatDescriptionReference(desc: string): ParsedFeatDescriptionReference | null {
  const blocks = stripPrerequisite(normalizeNamedAbilityBlocks(desc))
    .split(/\n\n+/)
    .map((block) => block.trim())
    .filter(Boolean);

  if (blocks.length === 0) return null;

  let start = 0;
  while (start < blocks.length && !isOptionStart(blocks[start])) {
    start += 1;
  }
  if (start >= blocks.length) return null;

  const beforeFirstSection = blocks.slice(0, start);
  let leadingTable: FeatCombatReferenceOption["table"] | null = null;
  let introBlocks = beforeFirstSection;
  if (
    beforeFirstSection.length > 0 &&
    isPurePipeTableBlock(beforeFirstSection[beforeFirstSection.length - 1]!)
  ) {
    leadingTable = parsePipeTableBlock(beforeFirstSection[beforeFirstSection.length - 1]!);
    introBlocks = beforeFirstSection.slice(0, -1);
  }
  const intro = introBlocks.join("\n\n").trim();
  const options: FeatCombatReferenceOption[] = [];
  if (leadingTable) {
    options.push({ key: "leading-table", name: "", desc: "", table: leadingTable });
  }
  let index = start;

  while (index < blocks.length) {
    const block = blocks[index];

    if (isPipeTableBlock(block)) {
      const namedSectionsRemain = blocks.slice(index + 1).some(isOptionStart);
      if (!namedSectionsRemain) {
        if (isPurePipeTableBlock(block)) {
          const table = parsePipeTableBlock(block);
          if (table) {
            options.push({ key: `trailing-table-${options.length}`, name: "", desc: "", table });
          }
          index += 1;
          continue;
        }
        break;
      }
      const table = parsePipeTableBlock(block);
      if (table && options.length > 0) {
        options[options.length - 1] = { ...options[options.length - 1], table };
      }
      index += 1;
      continue;
    }

    if (isFeatTrailingTableBlock(block)) break;

    const boldOption = parseBoldOption(block);
    if (boldOption) {
      options.push({ key: slugify(boldOption.name), ...boldOption });
      index += 1;
      continue;
    }

    if (isColonHeader(block)) {
      const name = block.replace(/:$/, "").trim();
      const next = blocks[index + 1];
      if (!next || isOptionStart(next)) {
        options.push({ key: slugify(name), name, desc: "" });
        index += 1;
        continue;
      }
      options.push({ key: slugify(name), name, desc: next });
      index += 2;
      continue;
    }

    if (options.length > 0) {
      const last = options[options.length - 1];
      last.desc = last.desc ? `${last.desc}\n\n${block}` : block;
      index += 1;
      continue;
    }

    break;
  }

  if (options.length === 0) return null;

  const trailing = blocks.slice(index).join("\n\n").trim();

  return {
    intro: intro || FEAT_COMBAT_REFERENCE_INTRO_DEFAULT,
    options,
    ...(trailing ? { trailing } : {}),
  };
}

export function featDescriptionReference(
  catalogDesc: string,
  mechanics?: FeatDescriptionMechanicsReference | null,
): ParsedFeatDescriptionReference | null {
  if (mechanics) {
    return {
      intro: mechanics.intro ?? FEAT_COMBAT_REFERENCE_INTRO_DEFAULT,
      options: mechanics.options,
    };
  }

  return parseFeatDescriptionReference(catalogDesc);
}

export interface ParsedFeatReferenceTable {
  title: string;
  options: FeatCombatReferenceOption[];
}

/** Parses `1d20 | Effect` rows from feat catalog trailing text (Mythal Touched, etc.). */
export function parseFeatReferenceTable(trailing: string): ParsedFeatReferenceTable | null {
  const lines = trailing.split("\n").map((line) => line.trim()).filter(Boolean);
  if (lines.length < 2) return null;

  const headerIndex = lines.findIndex((line) => line.includes("|") && /effect/i.test(line));
  const resolvedHeaderIndex =
    headerIndex >= 0 ? headerIndex : lines.findIndex((line) => line.includes("|") && !/^\d/.test(line.split("|")[0] ?? ""));
  if (resolvedHeaderIndex < 0) return null;

  const title = resolvedHeaderIndex > 0 && !lines[resolvedHeaderIndex - 1].includes("|")
    ? lines[resolvedHeaderIndex - 1]
    : "";
  const dataLines = lines
    .slice(resolvedHeaderIndex + 1)
    .filter((line) => line.includes("|") && /^\d/.test(line.split("|")[0]?.trim() ?? ""));
  if (dataLines.length === 0) return null;

  const options = dataLines.map((line) => {
    const [roll, ...descParts] = line.split("|").map((part) => part.trim());
    return { key: slugify(roll), name: roll, desc: descParts.join(" | ") };
  });

  return { title, options };
}
