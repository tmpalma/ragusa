import { afterEach, describe, expect, it } from "vitest";
import {
  clearBackHandlersForTests,
  handleHardwareBack,
  registerBackHandler,
} from "./backHandler";

afterEach(() => {
  clearBackHandlersForTests();
});

describe("backHandler", () => {
  it("returns false when the stack is empty", () => {
    expect(handleHardwareBack()).toBe(false);
  });

  it("invokes the most recently registered handler first", () => {
    const calls: string[] = [];
    registerBackHandler(() => {
      calls.push("first");
      return true;
    });
    registerBackHandler(() => {
      calls.push("second");
      return true;
    });

    expect(handleHardwareBack()).toBe(true);
    expect(calls).toEqual(["second"]);
  });

  it("falls through when the top handler returns false", () => {
    const calls: string[] = [];
    registerBackHandler(() => {
      calls.push("bottom");
      return true;
    });
    registerBackHandler(() => {
      calls.push("top");
      return false;
    });

    expect(handleHardwareBack()).toBe(true);
    expect(calls).toEqual(["top", "bottom"]);
  });

  it("unregisters handlers on cleanup", () => {
    const unregister = registerBackHandler(() => true);
    unregister();
    expect(handleHardwareBack()).toBe(false);
  });
});
