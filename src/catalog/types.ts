import type {
  AdventuringGearData,
  AlignmentData,
  ArmorData,
  BackgroundData,
  BeastFormData,
  BookData,
  ClassData,
  ClassSpellList,
  ConditionData,
  DeityData,
  FeatData,
  GenericVariantData,
  LanguageData,
  MagicItemData,
  SpeciesData,
  SpellData,
  SubclassData,
  WeaponData,
} from "../data/types";
import type { AmmunitionPackStats } from "../data/ammunitionStats";
import type { ToolData } from "../data/toolStats";

export type CatalogStringRow = {
  entity_type: string;
  entity_key: string;
  field: string;
  locale: string;
  text: string;
};

export type CatalogPayload = {
  classes: ClassData[];
  subclasses: SubclassData[];
  classSpellLists: Record<string, ClassSpellList>;
  spells: SpellData[];
  species: SpeciesData[];
  backgrounds: BackgroundData[];
  deities: DeityData[];
  beasts: BeastFormData[];
  conditions: ConditionData[];
  books: BookData[];
  feats: FeatData[];
  weapons: WeaponData[];
  armor: ArmorData[];
  alignments: AlignmentData[];
  languages: LanguageData[];
  magicItems: MagicItemData[];
  genericVariants: GenericVariantData[];
  adventuringGear: AdventuringGearData[];
  ammunitionStats: Record<string, AmmunitionPackStats>;
  toolStats: Record<string, ToolData>;
  catalogStrings: CatalogStringRow[];
};
