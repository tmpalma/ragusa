import type { CurrencyDenomination, ItemCost } from "../data/types";
import { copperToCoinBreakdown } from "../domain/carryingCapacity";

export function formatWeightLb(weightLb: number): string {
  if (Number.isInteger(weightLb)) return String(weightLb);
  return weightLb.toFixed(2).replace(/\.?0+$/, "");
}

export function formatItemCost(
  cost: ItemCost,
  abbreviations: Record<CurrencyDenomination, string>,
): string {
  if (cost.amount === 0) {
    return `0 ${abbreviations[cost.denomination]}`;
  }
  return `${cost.amount} ${abbreviations[cost.denomination]}`;
}

export function withItemStats(description: string, stats: string): string {
  return `${description} · ${stats}`;
}

export function formatCoinBreakdown(
  totalCp: number,
  abbreviations: Record<CurrencyDenomination, string>,
): string {
  const breakdown = copperToCoinBreakdown(totalCp);
  const parts: string[] = [];

  for (const denomination of ["gp", "sp", "cp"] as const) {
    const amount = breakdown[denomination];
    if (amount && amount > 0) {
      parts.push(`${amount} ${abbreviations[denomination]}`);
    }
  }

  return parts.length > 0 ? parts.join(" ") : `0 ${abbreviations.cp}`;
}
