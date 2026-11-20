import type { AdventuringGearData } from "../data/types";
import type { HomebrewItemRecord } from "./homebrewItems";
import { homebrewGearKey } from "./homebrewItems";

/** Synthetic gear row for weight/value helpers and generic equipment UI. */
export function homebrewRecordAsGear(record: HomebrewItemRecord): AdventuringGearData {
  return {
    key: homebrewGearKey(record.id),
    name: record.data.name,
    category: "other",
    weightLb: record.data.weightLb,
    cost: record.data.cost,
    desc: record.data.description,
    srd: false,
    book: "HB",
  };
}
