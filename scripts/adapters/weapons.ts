import type { WeaponData, WeaponMasteryProperty } from "../../src/data/types.js";
import { fetchOpen5e, stripKeyPrefix } from "../lib/open5eClient.js";
import { SRD_XPHB } from "./catalogSource.js";

interface RawWeapon {
  key: string;
  name: string;
  damage_dice: string;
  damage_type: { name: string } | null;
  is_simple: boolean;
  properties: { property: { name: string }; detail: string | null }[];
}

const MASTERY_PROPERTIES = new Set<string>(["Cleave", "Graze", "Nick", "Push", "Sap", "Slow", "Topple", "Vex"]);

function parseMastery(propertyName: string): WeaponMasteryProperty | null {
  return MASTERY_PROPERTIES.has(propertyName) ? (propertyName as WeaponMasteryProperty) : null;
}

export async function loadWeapons(): Promise<Omit<WeaponData, "weightLb" | "cost">[]> {
  const raw = await fetchOpen5e<RawWeapon>("weapons", "document__key__in=srd-2024");

  return raw.map((w) => {
    let mastery: WeaponMasteryProperty | null = null;
    const properties: string[] = [];

    for (const p of w.properties) {
      const name = p.property.name;
      const formatted = p.detail ? `${name} (${p.detail})` : name;
      const parsedMastery = parseMastery(name);
      if (parsedMastery && !mastery) {
        mastery = parsedMastery;
      } else if (!parsedMastery) {
        properties.push(formatted);
      }
    }

    return {
      key: stripKeyPrefix(w.key),
      name: w.name,
      damageDice: w.damage_dice,
      damageType: w.damage_type?.name ?? "",
      isSimple: w.is_simple,
      properties,
      mastery,
      ...SRD_XPHB,
    };
  });
}
