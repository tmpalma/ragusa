import { describe, expect, it } from "vitest";
import {
  applyDamageToCharacter,
  applyTemporaryHitPointsGrant,
  clearTemporaryHitPoints,
} from "./temporaryHitPoints";

describe("temporaryHitPoints", () => {
  it("replaces temp HP only when the new grant exceeds remaining", () => {
    expect(applyTemporaryHitPointsGrant(clearTemporaryHitPoints(), 6)).toEqual({
      temporaryHitPointsMax: 6,
      temporaryHitPointsRemaining: 6,
    });
    expect(
      applyTemporaryHitPointsGrant(
        { temporaryHitPointsMax: 6, temporaryHitPointsRemaining: 2 },
        4,
      ),
    ).toEqual({
      temporaryHitPointsMax: 4,
      temporaryHitPointsRemaining: 4,
    });
    expect(
      applyTemporaryHitPointsGrant(
        { temporaryHitPointsMax: 6, temporaryHitPointsRemaining: 2 },
        5,
      ),
    ).toEqual({
      temporaryHitPointsMax: 5,
      temporaryHitPointsRemaining: 5,
    });
  });

  it("absorbs damage against temp HP before regular HP", () => {
    const result = applyDamageToCharacter({
      maxHitPoints: 20,
      currentHitPoints: null,
      temporaryHitPointsMax: 6,
      temporaryHitPointsRemaining: 6,
      damage: 4,
    });
    expect(result).toEqual({
      currentHitPoints: null,
      temporaryHitPointsMax: 6,
      temporaryHitPointsRemaining: 2,
    });

    const depleted = applyDamageToCharacter({
      maxHitPoints: 20,
      currentHitPoints: null,
      temporaryHitPointsMax: 6,
      temporaryHitPointsRemaining: 2,
      damage: 5,
    });
    expect(depleted).toEqual({
      currentHitPoints: 17,
      temporaryHitPointsMax: null,
      temporaryHitPointsRemaining: null,
    });
  });
});
