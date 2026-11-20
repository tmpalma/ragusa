/**
 * Lists AcroForm fields from a fillable character sheet PDF (name, kind, rect).
 * Usage: npx tsx scripts/extract-pdf-fields.ts [en|pt-BR]
 */
import { readFileSync, writeFileSync } from "node:fs";
import { PDFDocument } from "pdf-lib";

const locale = process.argv[2] ?? "en";
const inputPath = `public/character-sheets/${locale}.pdf`;
const bytes = readFileSync(inputPath);
const pdf = await PDFDocument.load(bytes);
const form = pdf.getForm();
const fields = form.getFields();

interface FieldInfo {
  name: string;
  kind: string;
  page: number;
  rect: [number, number, number, number];
}

const infos: FieldInfo[] = [];

for (const field of fields) {
  const name = field.getName();
  const ctor = field.constructor.name;
  const widgets = field.acroField.getWidgets();
  for (const widget of widgets) {
    const rect = widget.getRectangle();
    const pageRef = widget.P();
    let pageIndex = 0;
    if (pageRef) {
      const pages = pdf.getPages();
      for (let i = 0; i < pages.length; i++) {
        if (pages[i].ref === pageRef) {
          pageIndex = i;
          break;
        }
      }
    }
    infos.push({
      name,
      kind: ctor.replace("PDF", "").replace("Field", "").toLowerCase(),
      page: pageIndex,
      rect: [rect.x, rect.y, rect.width + rect.x, rect.height + rect.y] as [number, number, number, number],
    });
  }
}

infos.sort((a, b) => b.page - a.page || b.rect[3] - a.rect[3] || a.rect[0] - b.rect[0]);

const lines = infos.map(
  (f) => `${f.name}\t${f.kind}\t[${f.rect.map((n) => Math.round(n)).join(" ")}]\tp${f.page + 1}`,
);
writeFileSync(`.tmp-pdf-fields/${locale}-pdf-lib.txt`, lines.join("\n") + "\n");
console.log(`${locale}: ${fields.length} fields, ${infos.length} widgets`);
console.log(lines.slice(0, 20).join("\n"));
