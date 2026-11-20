export type AbilityPrerequisiteMode = "enforce" | "warn" | "ignore";

export interface AbilityPrerequisiteRule {
  mode: AbilityPrerequisiteMode;
  minimum: number;
}

export interface TableRules {
  /** RAW default 2; null = unlimited distinct classes. */
  maxDistinctClasses: number | null;
  abilityPrerequisite: AbilityPrerequisiteRule;
  /** RAW false — Extra Attack from multiple classes does not stack. */
  extraAttackStacks: boolean;
  /** RAW false — a dip does not grant new save proficiencies. */
  grantStartingSavesOnNewClass: boolean;
  /** RAW false — use multiclassProficiencies instead of full L1 training. */
  grantFullStartingProficienciesOnNewClass: boolean;
}

export const RAW_TABLE_RULES: TableRules = {
  maxDistinctClasses: 2,
  abilityPrerequisite: { mode: "enforce", minimum: 13 },
  extraAttackStacks: false,
  grantStartingSavesOnNewClass: false,
  grantFullStartingProficienciesOnNewClass: false,
};
