import type { AlignmentData } from "../../src/data/types.js";
import { fetchOpen5e } from "../lib/open5eClient.js";
import { SRD_XPHB } from "./catalogSource.js";

interface RawAlignment {
  key: string;
  short_name: string;
  descriptions: { desc: string; document: string }[];
}

function titleCase(key: string): string {
  return key
    .split("-")
    .map((word) => word[0].toUpperCase() + word.slice(1))
    .join(" ");
}

export async function loadAlignments(): Promise<AlignmentData[]> {
  // Open5e's `document__key__in` filter operates on the alignment record's own
  // top-level document (always "core"), not the per-description document — so
  // no query filter here; the 2024-specific text is picked out of `descriptions[]` below.
  const raw = await fetchOpen5e<RawAlignment>("alignments", "");

  return raw.map((a) => {
    const description = a.descriptions.find((d) => d.document === "srd-2024") ?? a.descriptions[0];
    return {
      key: a.key,
      name: titleCase(a.key),
      description: description?.desc ?? "",
      ...SRD_XPHB,
    };
  });
}
