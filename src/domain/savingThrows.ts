export interface SavingThrowResult {
  proficient: boolean;
  modifier: number;
}

export function savingThrowBonus(abilityModifierValue: number, proficient: boolean, proficiencyBonus: number): SavingThrowResult {
  return { proficient, modifier: abilityModifierValue + (proficient ? proficiencyBonus : 0) };
}
