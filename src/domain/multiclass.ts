import type { AbilityId, PrimaryAbility as CatalogPrimaryAbility } from "../data/types";
import { MAX_CHARACTER_LEVEL, maxCharacterLevelFor } from "./characterLevel";
import type { TableRules } from "./tableRules";

/**
 * One primary-ability option. Multiple keys in one object are AND; multiple
 * objects in the array are OR (Fighter: [{ str }, { dex }]; Monk: [{ dex, wis }]).
 * Per-ability values override TableRules.abilityPrerequisite.minimum when present.
 */
export type PrimaryAbilityRequirement = Partial<Record<AbilityId, number>>;
export type PrimaryAbility = PrimaryAbilityRequirement[];

export interface MulticlassClassRecord {
  key: string;
  primaryAbility: PrimaryAbility;
}

export type MulticlassActionCode =
  | "ok"
  | "unknown_class"
  | "max_character_level"
  | "max_class_level"
  | "max_distinct_classes"
  | "ability_prerequisite";

export type MulticlassEnforcement = "enforce" | "warn" | "ignore";

export interface MulticlassActionResult {
  ok: boolean;
  code: MulticlassActionCode;
  messageKey: string;
  enforcement?: MulticlassEnforcement;
}

export interface EvaluateMulticlassActionInput {
  targetClassKey: string;
  /** Class taken at each current character level (length 1–4). */
  currentLevelPath: string[];
  abilityScores: Record<AbilityId, number>;
  resolveClass: (classKey: string) => MulticlassClassRecord | null | undefined;
}

/** Convert catalog primaryAbility (ability id arrays) into score requirements. */
export function primaryAbilityFromCatalog(
  primaryAbility: CatalogPrimaryAbility,
  defaultMinimum: number,
): PrimaryAbilityRequirement[] {
  return primaryAbility.map((abilities) =>
    Object.fromEntries(abilities.map((ability) => [ability, defaultMinimum])),
  );
}

export function satisfiesPrimaryAbility(
  scores: Record<AbilityId, number>,
  primaryAbility: PrimaryAbility,
  defaultMinimum: number,
): boolean {
  if (primaryAbility.length === 0) {
    return true;
  }

  return primaryAbility.some((option) =>
    Object.entries(option).every(([ability, minimum]) => {
      const score = scores[ability as AbilityId];
      const required = minimum ?? defaultMinimum;
      return score !== undefined && score >= required;
    }),
  );
}

function distinctClassKeys(levelPath: string[]): string[] {
  const seen = new Set<string>();
  const keys: string[] = [];
  for (const classKey of levelPath) {
    if (!seen.has(classKey)) {
      seen.add(classKey);
      keys.push(classKey);
    }
  }
  return keys;
}

export function evaluateMulticlassAction(
  rules: TableRules,
  input: EvaluateMulticlassActionInput,
): MulticlassActionResult {
  const { targetClassKey, currentLevelPath, abilityScores, resolveClass } = input;

  const targetClass = resolveClass(targetClassKey);
  if (!targetClass) {
    return {
      ok: false,
      code: "unknown_class",
      messageKey: "character.multiclass.error.unknownClass",
    };
  }

  if (currentLevelPath.length >= MAX_CHARACTER_LEVEL) {
    return {
      ok: false,
      code: "max_character_level",
      messageKey: "character.multiclass.error.maxCharacterLevel",
    };
  }

  const nextClassLevel = currentLevelPath.filter((key) => key === targetClassKey).length + 1;
  if (nextClassLevel > maxCharacterLevelFor(targetClassKey)) {
    return {
      ok: false,
      code: "max_class_level",
      messageKey: "character.multiclass.error.maxClassLevel",
    };
  }

  const currentDistinct = distinctClassKeys(currentLevelPath);
  const isNewDistinctClass = !currentDistinct.includes(targetClassKey);
  if (isNewDistinctClass && rules.maxDistinctClasses !== null) {
    const distinctAfter = currentDistinct.length + 1;
    if (distinctAfter > rules.maxDistinctClasses) {
      return {
        ok: false,
        code: "max_distinct_classes",
        messageKey: "character.multiclass.error.maxDistinctClasses",
      };
    }
  }

  // Ability prereqs apply only when multiclassing (a new distinct class, or any
  // level in a second+ class). Single-class level-ups ignore the 13+ gate.
  const isMulticlassLevelUp = isNewDistinctClass || currentDistinct.length > 1;

  if (!isMulticlassLevelUp) {
    return {
      ok: true,
      code: "ok",
      messageKey: "",
    };
  }

  const classesToCheck = distinctClassKeys([...currentLevelPath, targetClassKey]);
  const { mode, minimum } = rules.abilityPrerequisite;
  const failingClass = classesToCheck.find((classKey) => {
    const classRecord = resolveClass(classKey);
    if (!classRecord) {
      return true;
    }
    return !satisfiesPrimaryAbility(abilityScores, classRecord.primaryAbility, minimum);
  });

  if (failingClass) {
    const unknown = !resolveClass(failingClass);
    if (unknown) {
      return {
        ok: false,
        code: "unknown_class",
        messageKey: "character.multiclass.error.unknownClass",
      };
    }

    if (mode === "enforce") {
      return {
        ok: false,
        code: "ability_prerequisite",
        messageKey: "character.multiclass.error.abilityPrerequisite",
        enforcement: "enforce",
      };
    }

    return {
      ok: true,
      code: "ability_prerequisite",
      messageKey:
        mode === "warn" ? "character.multiclass.warn.abilityPrerequisite" : "",
      enforcement: mode,
    };
  }

  return {
    ok: true,
    code: "ok",
    messageKey: "",
  };
}
