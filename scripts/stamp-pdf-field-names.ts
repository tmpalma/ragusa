/**
 * Stamps each AcroForm field with its name for visual mapping.
 * Usage: npx tsx scripts/stamp-pdf-field-names.ts [en|pt-BR]
 */
import { readFileSync, writeFileSync } from "node:fs";
import { PDFDocument, StandardFonts } from "pdf-lib";

const locale = process.argv[2] ?? "en";
const inputPath = `public/character-sheets/${locale}.pdf`;
const outputPath = `.tmp-pdf-fields/${locale}-stamped.pdf`;

const bytes = readFileSync(inputPath);
const pdf = await PDFDocument.load(bytes);
const form = pdf.getForm();
const font = await pdf.embedFont(StandardFonts.Helvetica);

for (const field of form.getFields()) {
  const name = field.getName();
  const short = name.replace(/^(text|textarea|checkbox)_/, "").slice(0, 8);
  try {
    if (name.startsWith("checkbox_")) {
      form.getCheckBox(name).check();
      continue;
    }
    const textField = form.getTextField(name);
    textField.setText(short);
    textField.updateAppearances(font);
  } catch {
    // skip unsupported widgets
  }
}

const out = await pdf.save();
writeFileSync(outputPath, out);
console.log(`Wrote ${outputPath}`);
