import { PDFDocument, StandardFonts } from "pdf-lib";
import { saveBytes } from "../../platform/fileIo";
import type { PdfFieldMap, SheetPayload } from "./types";

export async function fillCharacterSheetPdf(
  templateBytes: ArrayBuffer | Uint8Array,
  payload: SheetPayload,
  fieldMap: PdfFieldMap,
): Promise<Uint8Array> {
  const pdf = await PDFDocument.load(templateBytes);
  const form = pdf.getForm();
  const font = await pdf.embedFont(StandardFonts.Helvetica);

  const textByField = new Map<string, string[]>();

  for (const [slot, binding] of Object.entries(fieldMap)) {
    const kind = binding.kind ?? "text";
    const fieldName = binding.field;

    if (kind === "checkbox") {
      const checked = payload.checkboxes[slot] ?? false;
      try {
        const box = form.getCheckBox(fieldName);
        if (checked) box.check();
        else box.uncheck();
      } catch {
        // Field missing or not a checkbox in this template revision.
      }
      continue;
    }

    const value = payload.text[slot];
    if (!value) continue;

    const values = textByField.get(fieldName) ?? [];
    values.push(value);
    textByField.set(fieldName, values);
  }

  for (const [fieldName, values] of textByField) {
    try {
      const textField = form.getTextField(fieldName);
      textField.setText(values.join(" · "));
      textField.updateAppearances(font);
    } catch {
      // Field missing or wrong type.
    }
  }

  form.updateFieldAppearances(font);
  return pdf.save();
}

export async function fetchCharacterSheetTemplate(locale: string): Promise<ArrayBuffer> {
  const path = locale === "pt-BR" ? "/character-sheets/pt-BR.pdf" : "/character-sheets/en.pdf";
  const response = await fetch(path);
  if (!response.ok) {
    throw new Error(`Failed to load character sheet template (${response.status})`);
  }
  return response.arrayBuffer();
}

export async function downloadFilledCharacterPdf(
  bytes: Uint8Array,
  filename: string,
): Promise<void> {
  await saveBytes({ bytes, filename, mimeType: "application/pdf" });
}
