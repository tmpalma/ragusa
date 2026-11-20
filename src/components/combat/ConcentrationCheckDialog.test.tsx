import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { LocaleProvider } from "../../i18n/LocaleContext";
import { ConcentrationCheckDialog } from "./ConcentrationCheckDialog";

function renderDialog(hasWarCaster: boolean): string {
  return renderToStaticMarkup(
    createElement(
      LocaleProvider,
      null,
      createElement(ConcentrationCheckDialog, {
        open: true,
        spellKey: "bless",
        damageTaken: 12,
        constitutionSaveModifier: 3,
        hasWarCaster,
        onDismiss: () => {},
      }),
    ),
  );
}

describe("ConcentrationCheckDialog", () => {
  it("shows the War Caster advantage reminder when the character has the feat", () => {
    expect(renderDialog(true)).toContain("War Caster: you have Advantage on this check");
  });

  it("omits the War Caster reminder otherwise", () => {
    expect(renderDialog(false)).not.toContain("War Caster: you have Advantage on this check");
  });
});