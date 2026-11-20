export type PdfFieldKind = "text" | "textarea" | "checkbox";

export interface PdfFieldBinding {
  field: string;
  kind?: PdfFieldKind;
}

export type PdfFieldMap = Record<string, PdfFieldBinding>;

export interface SheetPayload {
  text: Record<string, string>;
  checkboxes: Record<string, boolean>;
}

export type PdfLocale = "en" | "pt-BR";
