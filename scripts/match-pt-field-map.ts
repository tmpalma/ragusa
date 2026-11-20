/**
 * Builds pt-BR field map by one-to-one geometry matching against EN widgets.
 * Usage: npx tsx scripts/match-pt-field-map.ts
 */
import { readFileSync, writeFileSync } from "node:fs";
import { PDFDocument } from "pdf-lib";
import { EN_FIELD_MAP } from "../src/domain/pdfSheet/fieldMaps/en.ts";

type SlotKind = "text" | "textarea" | "checkbox";

interface WidgetInfo {
  name: string;
  kind: SlotKind;
  page: number;
  cx: number;
  cy: number;
}

async function loadWidgets(locale: string): Promise<WidgetInfo[]> {
  const bytes = readFileSync(`public/character-sheets/${locale}.pdf`);
  const pdf = await PDFDocument.load(bytes);
  const form = pdf.getForm();
  const pages = pdf.getPages();
  const out: WidgetInfo[] = [];

  for (const field of form.getFields()) {
    const name = field.getName();
    let kind: SlotKind = "text";
    if (name.startsWith("checkbox_")) kind = "checkbox";
    else if (name.startsWith("textarea_")) kind = "textarea";

    for (const widget of field.acroField.getWidgets()) {
      const rect = widget.getRectangle();
      const pageRef = widget.P();
      let pageIndex = 0;
      if (pageRef) {
        for (let i = 0; i < pages.length; i++) {
          if (pages[i].ref === pageRef) {
            pageIndex = i;
            break;
          }
        }
      }
      out.push({
        name,
        kind,
        page: pageIndex,
        cx: rect.x + rect.width / 2,
        cy: rect.y + rect.height / 2,
      });
    }
  }
  return out;
}

const PAGE_W = 603;
const PAGE_H = 774;
const THRESHOLD = 0.09;

const enWidgets = await loadWidgets("en");
const ptWidgets = await loadWidgets("pt-BR");
const enByField = new Map(enWidgets.map((w) => [w.name, w]));
const usedPt = new Set<string>();

interface Match {
  slot: string;
  enField: string;
  ptField: string;
  dist: number;
}

const candidates: Match[] = [];

for (const [slot, binding] of Object.entries(EN_FIELD_MAP)) {
  const enW = enByField.get(binding.field);
  if (!enW) continue;
  const kind = binding.kind ?? "text";
  for (const ptW of ptWidgets) {
    if (ptW.kind !== kind || ptW.page !== enW.page) continue;
    const d = Math.hypot((enW.cx - ptW.cx) / PAGE_W, (enW.cy - ptW.cy) / PAGE_H);
    if (d <= THRESHOLD) {
      candidates.push({ slot, enField: binding.field, ptField: ptW.name, dist: d });
    }
  }
}

candidates.sort((a, b) => a.dist - b.dist);

const ptMap: Record<string, string> = {};
const assignedSlots = new Set<string>();

for (const c of candidates) {
  if (assignedSlots.has(c.slot) || usedPt.has(c.ptField)) continue;
  ptMap[c.slot] = c.ptField;
  assignedSlots.add(c.slot);
  usedPt.add(c.ptField);
}

// Manual overrides for PT header split layout and page-2 fields
const manual: Record<string, string> = {
  characterName: "text_1aoob",
  background: "text_4wwck",
  backgroundOverflow: "text_5jrjt",
  classAndLevel: "text_2flth",
  classAndLevelOverflow: "text_3nuh",
  species: "text_5jrjt",
  spellAbilityMod: "text_122huay",
  spellAttackBonus: "text_123sqib",
  spellSaveDc: "text_124ceqd",
  currencyPp: "text_287hdss",
  currencyGp: "text_288qujt",
  currencyEp: "text_289axhd",
  currencySp: "text_290lmio",
  currencyCp: "text_291ljgr",
  notesTop: "textarea_128qxfn",
  notesMiddle: "textarea_127svto",
  equipmentOverflow: "textarea_125avaq",
  featuresOverflow: "textarea_126gxsf",
  deathSaveFailure3: "checkbox_183ootk",
  cantrip0: "text_288qujt",
  cantrip1: "text_289axhd",
  cantrip2: "text_290lmio",
  cantrip3: "text_291ljgr",
  cantrip4: "text_292upnd",
  cantrip5: "text_293zwds",
  cantrip6: "text_294pxhc",
  cantrip7: "text_295cvzt",
  cantrip8: "text_296luha",
  cantrip9: "text_297htaz",
  spellL1_0: "text_298wbzm",
  spellL1_1: "text_299sigr",
  spellL1_2: "text_300ahxk",
  spellL1_3: "text_301cwbz",
  spellL1_4: "text_302ewwp",
  spellL1_5: "text_303cuix",
  spellL1_6: "text_304xskb",
  spellL1_7: "text_305gwig",
  spellL1_8: "text_306sorf",
  spellL1_9: "text_307ykqn",
  spellL2_0: "text_308wwhe",
  spellL2_1: "text_309enjs",
  spellL2_2: "text_310jdm",
  spellL2_3: "text_311ghoq",
  spellL2_4: "text_312llsw",
  spellL2_5: "text_313jros",
  spellL2_6: "text_314gyue",
  spellL2_7: "text_315plkl",
  spellL2_8: "text_316ndrn",
  spellL2_9: "text_317gkbw",
  spellL3_0: "text_318ogf",
  spellL3_1: "text_319huqd",
  spellL3_2: "text_320kzak",
  spellL3_3: "text_321ucnv",
  spellL3_4: "text_322wcdj",
  spellL3_5: "text_323kmpj",
  spellL3_6: "text_324jzvi",
  spellL3_7: "text_325xpvz",
  spellL3_8: "text_326ydhp",
  spellL3_9: "text_327kpws",
  spellL4_0: "text_328uom",
  spellL4_1: "text_329yurm",
  spellL4_2: "text_330jyte",
  spellL4_3: "text_331jfme",
  spellL4_4: "text_332xoqp",
  spellL4_5: "text_333ekrb",
  spellL4_6: "text_334zias",
  spellL4_7: "text_335znlw",
  spellL4_8: "text_336ipws",
  spellL4_9: "text_337wzyu",
};

for (const [slot, field] of Object.entries(manual)) {
  ptMap[slot] = field;
}

const allSlots = new Set([...Object.keys(EN_FIELD_MAP), ...Object.keys(manual)]);
const missing = [...allSlots].filter((s) => !ptMap[s]);

console.log(`Mapped ${Object.keys(ptMap).length}/${allSlots.size} slots`);
if (missing.length) console.log("Still missing:", missing.join(", "));

const lines: string[] = [
  'import type { PdfFieldMap } from "../types";',
  "",
  "/** Semantic slot → AcroForm field on the pt-BR fillable sheet. */",
  "export const PT_BR_FIELD_MAP: PdfFieldMap = {",
];

for (const slot of [...allSlots].sort()) {
  const enBinding = EN_FIELD_MAP[slot];
  const manualKind = slot.startsWith("spellUsed") || slot.includes("Prof") || slot.includes("deathSave") || slot === "inspiration"
    ? "checkbox"
    : null;
  const field = ptMap[slot];
  if (!field) continue;
  const kind = enBinding?.kind ?? manualKind;
  if (kind) {
    lines.push(`  ${slot}: { field: "${field}", kind: "${kind}" },`);
  } else {
    lines.push(`  ${slot}: { field: "${field}" },`);
  }
}

lines.push("};", "");
writeFileSync("src/domain/pdfSheet/fieldMaps/pt-BR.ts", lines.join("\n"));
console.log("Wrote src/domain/pdfSheet/fieldMaps/pt-BR.ts");
