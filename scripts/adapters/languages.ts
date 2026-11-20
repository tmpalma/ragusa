import type { LanguageData } from "../../src/data/types.js";
import { SRD_XPHB } from "./catalogSource.js";

/** 2024 SRD (XPHB) languages — standard = common, rare = uncommon. */
export const LANGUAGES: LanguageData[] = [
  { key: "abyssal", name: "Abyssal", category: "uncommon", ...SRD_XPHB },
  { key: "celestial", name: "Celestial", category: "uncommon", ...SRD_XPHB },
  { key: "common", name: "Common", category: "common", ...SRD_XPHB },
  { key: "common-sign-language", name: "Common Sign Language", category: "common", ...SRD_XPHB },
  { key: "deep-speech", name: "Deep Speech", category: "uncommon", ...SRD_XPHB },
  { key: "draconic", name: "Draconic", category: "common", ...SRD_XPHB },
  { key: "druidic", name: "Druidic", category: "uncommon", ...SRD_XPHB },
  { key: "dwarvish", name: "Dwarvish", category: "common", ...SRD_XPHB },
  { key: "elvish", name: "Elvish", category: "common", ...SRD_XPHB },
  { key: "giant", name: "Giant", category: "common", ...SRD_XPHB },
  { key: "gnomish", name: "Gnomish", category: "common", ...SRD_XPHB },
  { key: "goblin", name: "Goblin", category: "common", ...SRD_XPHB },
  { key: "halfling", name: "Halfling", category: "common", ...SRD_XPHB },
  { key: "infernal", name: "Infernal", category: "uncommon", ...SRD_XPHB },
  { key: "orc", name: "Orc", category: "common", ...SRD_XPHB },
  { key: "primordial", name: "Primordial", category: "uncommon", ...SRD_XPHB },
  { key: "sylvan", name: "Sylvan", category: "uncommon", ...SRD_XPHB },
  { key: "thieves-cant", name: "Thieves' Cant", category: "uncommon", ...SRD_XPHB },
  { key: "undercommon", name: "Undercommon", category: "uncommon", ...SRD_XPHB },
];
