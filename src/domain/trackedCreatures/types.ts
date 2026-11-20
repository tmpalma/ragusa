import type { AbilityId, BeastAttackData } from "../../data/types";
import type { CompanionSummonPayment } from "../castSpell";
import type { FeatChoices } from "../featEffects";
import type { ResolvedClassLevel } from "../classLevels";
import type { Character } from "../../state/characterState";

export type TrackedCreatureCategory = "companion" | "summon";

export type SpiritType = "celestial" | "fey" | "fiend";

export interface TrackedCreatureInstance {
  id: string;
  sourceKey: string;
  category: TrackedCreatureCategory;
  formKey: string | null;
  spiritType?: SpiritType;
  castSlotLevel?: number;
  currentHitPoints: number | null;
  temporaryHitPointsMax: number | null;
  temporaryHitPointsRemaining: number | null;
  featureUses: Record<string, number>;
  dismissed?: boolean;
  /** Player confirmed the companion is currently summoned (opt-in; stats track only when true). */
  summoned?: boolean;
  /** Spell cast spent to summon (refunded when unsummoned). */
  summonPayment?: CompanionSummonPayment;
}

export interface CreatureUseTracker {
  useKey: string;
  labelKey: string;
  maxUses: number;
}

export interface ResolvedCreatureStatBlock {
  displayNameKey?: string;
  displayName?: string;
  ac: number;
  maxHitPoints: number;
  abilities: Record<AbilityId, number>;
  speeds: { type: string; feet: number }[];
  senses?: string[];
  attacks: BeastAttackData[];
  traits: { key?: string; name: string; desc: string }[];
  notes: string[];
  useTrackers: CreatureUseTracker[];
}

export type CreatureLongRestPolicy = "restoreHpAndUses" | "none";
export type CreatureShortRestPolicy = "none" | "restoreDailyUses";

export interface CreatureRestPolicy {
  shortRest: CreatureShortRestPolicy;
  longRest: CreatureLongRestPolicy;
}

export interface CreatureSourceContext {
  character: Character;
  classLevels: ResolvedClassLevel[];
  abilityModifiers: Record<AbilityId, number>;
  proficiencyBonus: number;
  ownedSpellKeys: Set<string>;
  activeFeatKeys: string[];
  featChoicesFor: (featKey: string) => FeatChoices;
  slotsByLevel: Record<number, number>;
  spellAttackBonusByClass: Record<string, number>;
}

export interface CreatureSourceDefinition {
  sourceKey: string;
  category: TrackedCreatureCategory;
  titleEntityType: "spells" | "classes";
  titleEntityKey: string;
  titleField?: string;
  isAvailable: (ctx: CreatureSourceContext) => boolean;
  defaultInstanceFields: (ctx: CreatureSourceContext) => Partial<TrackedCreatureInstance>;
  formOptions: (ctx: CreatureSourceContext) => { key: string }[];
  spiritTypeOptions: (ctx: CreatureSourceContext) => SpiritType[] | null;
  castSlotLevelRange: (ctx: CreatureSourceContext) => { min: number; max: number } | null;
  resolveStatBlock: (ctx: CreatureSourceContext, instance: TrackedCreatureInstance) => ResolvedCreatureStatBlock | null;
  initialFeatureUses: (ctx: CreatureSourceContext) => Record<string, number>;
  restPolicy: CreatureRestPolicy;
  supportsDismiss: boolean;
  /** When set, summoning opens the spell cast dialog and spends slot or free uses. */
  summonSpellKey?: string;
}

export type CreatureSourceRegistry = Map<string, CreatureSourceDefinition>;