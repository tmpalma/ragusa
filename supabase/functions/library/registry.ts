import { campaignOps } from "./ops/campaigns.ts";
import { characterOps } from "./ops/characters.ts";
import { homebrewOps } from "./ops/homebrew.ts";
import { playerOps } from "./ops/players.ts";
import type { OpHandler, OpRecord } from "./ops/types.ts";

/**
 * Every domain's op record. To add a domain: create `ops/<domain>.ts` exporting
 * `export const <domain>Ops: OpRecord = { opName: async (ctx, payload) => ... }`
 * and add it to this list (one line per domain).
 */
const domainOps: readonly OpRecord[] = [
  playerOps,
  characterOps,
  campaignOps,
  homebrewOps,
];

function mergeOps(records: readonly OpRecord[]): Record<string, OpHandler> {
  const merged: Record<string, OpHandler> = Object.create(null);
  for (const record of records) {
    for (const [name, handler] of Object.entries(record)) {
      if (name in merged) {
        throw new Error(`Duplicate library op: ${name}`);
      }
      merged[name] = handler;
    }
  }
  return merged;
}

export const opRegistry: Readonly<Record<string, OpHandler>> = mergeOps(domainOps);

/** Looks up an op handler. Unknown ops throw a plain Error (HTTP 500 "internal"), as before the split. */
export function resolveOp(op: string): OpHandler {
  const handler = Object.hasOwn(opRegistry, op) ? opRegistry[op] : undefined;
  if (!handler) {
    throw new Error(`Unknown library op: ${op}`);
  }
  return handler;
}
