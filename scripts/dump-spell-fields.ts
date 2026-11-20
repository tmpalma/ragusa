/**
 * Lists spell-table candidate fields grouped by x-band.
 * Usage: npx tsx scripts/dump-spell-fields.ts [en|pt-BR]
 */
import { readFileSync } from "node:fs";
import { PDFDocument } from "pdf-lib";

const locale = process.argv[2] ?? "en";
const bytes = readFileSync(`public/character-sheets/${locale}.pdf`);
const pdf = await PDFDocument.load(bytes);
const form = pdf.getForm();

interface Row {
  name: string;
  x0: number;
  y0: number;
  x1: number;
  y1: number;
}

const rows: Row[] = [];
for (const field of form.getFields()) {
  const name = field.getName();
  if (!name.startsWith("text_")) continue;
  for (const widget of field.acroField.getWidgets()) {
    const r = widget.getRectangle();
    rows.push({
      name,
      x0: Math.round(r.x),
      y0: Math.round(r.y),
      x1: Math.round(r.x + r.width),
      y1: Math.round(r.y + r.height),
    });
  }
}

rows.sort((a, b) => b.y0 - a.y0 || a.x0 - b.x0);

console.log(`# Spell-table band (y 15–600) — ${locale}`);
for (const row of rows.filter((r) => r.y0 >= 15 && r.y0 <= 600)) {
  console.log(`${row.name}\t[${row.x0} ${row.y0} ${row.x1} ${row.y1}]`);
}

console.log(`\n# Page-2 spell name column (x 38–45, y 15–280)`);
for (const row of rows.filter((r) => r.x0 >= 38 && r.x0 <= 45 && r.y0 >= 15 && r.y0 <= 280)) {
  console.log(`${row.name}\t y=${row.y0}`);
}

console.log(`\n# Page-2 spell level column (x 15–20, y 15–280)`);
for (const row of rows.filter((r) => r.x0 >= 15 && r.x0 <= 20 && r.y0 >= 15 && r.y0 <= 280)) {
  console.log(`${row.name}\t y=${row.y0}`);
}
