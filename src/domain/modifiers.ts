export function abilityModifier(score: number): number {
  return Math.floor((score - 10) / 2);
}

/** Signed for non-zero values ("+3", "-1"), bare "0" for zero — matches the sheet's Markdown format. */
export function formatModifier(modifier: number): string {
  if (modifier === 0) return "0";
  return modifier > 0 ? `+${modifier}` : `${modifier}`;
}
