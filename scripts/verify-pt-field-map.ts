import { readFileSync } from "node:fs";
import { PDFDocument } from "pdf-lib";
import { PT_BR_FIELD_MAP } from "../src/domain/pdfSheet/fieldMaps/pt-BR.ts";

const bytes = readFileSync("public/character-sheets/pt-BR.pdf");
const pdf = await PDFDocument.load(bytes);
const names = new Set(pdf.getForm().getFields().map((f) => f.getName()));
const missing = Object.entries(PT_BR_FIELD_MAP).filter(([, binding]) => !names.has(binding.field));
console.log(`missing ${missing.length}`);
for (const [slot, binding] of missing) {
  console.log(`${slot}: ${binding.field}`);
}
