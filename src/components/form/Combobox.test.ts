import { describe, expect, it } from "vitest";
import { sortComboboxOptionsByLabel } from "./Combobox";

describe("sortComboboxOptionsByLabel", () => {
  it("orders by visible label using the active locale", () => {
    const options = [
      { key: "longsword", label: "Espada longa" },
      { key: "dagger", label: "Adaga" },
      { key: "battleaxe", label: "Machado de batalha" },
    ];
    expect(sortComboboxOptionsByLabel(options, "pt-BR").map((row) => row.key)).toEqual([
      "dagger",
      "longsword",
      "battleaxe",
    ]);
  });
});
