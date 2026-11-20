import type { ArmorData } from "../../src/data/types.js";
import { fetchOpen5e, stripKeyPrefix } from "../lib/open5eClient.js";
import { SRD_XPHB } from "./catalogSource.js";

interface RawArmor {
  key: string;
  name: string;
  category: string;
  ac_base: number;
  ac_add_dexmod: boolean;
  ac_cap_dexmod: number | null;
  strength_score_required: number | null;
  grants_stealth_disadvantage: boolean;
}

export async function loadArmor(): Promise<Omit<ArmorData, "weightLb" | "cost">[]> {
  const raw = await fetchOpen5e<RawArmor>("armor", "document__key__in=srd-2024");

  return raw.map((a) => ({
    key: stripKeyPrefix(a.key),
    name: a.name,
    category: a.category,
    acBase: a.ac_base,
    acAddDexMod: a.ac_add_dexmod,
    acCapDexMod: a.ac_cap_dexmod,
    strengthScoreRequired: a.strength_score_required,
    grantsStealthDisadvantage: a.grants_stealth_disadvantage,
    ...SRD_XPHB,
  }));
}
