import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { ARMOR_STATS, WEAPON_STATS } from "../../catalog-source/equipmentStats.js";

const generatedDir = path.join(path.dirname(fileURLToPath(import.meta.url)), "../../catalog-source/generated");

function readJson<T>(filename: string): T {
  return JSON.parse(readFileSync(path.join(generatedDir, filename), "utf8")) as T;
}

describe("catalog-source equipment stats completeness", () => {
  it("has stats for every weapon in the seed catalog", () => {
    for (const weapon of readJson<{ key: string }[]>("weapons.json")) {
      expect(WEAPON_STATS[weapon.key], `missing stats for weapon ${weapon.key}`).toBeDefined();
    }
  });

  it("has stats for every armor piece in the seed catalog", () => {
    for (const armor of readJson<{ key: string }[]>("armor.json")) {
      expect(ARMOR_STATS[armor.key], `missing stats for armor ${armor.key}`).toBeDefined();
    }
  });
});
