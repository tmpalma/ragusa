/** Hardware back overlay stack. Last registered handler wins. */

export type BackHandler = () => boolean;

const stack: BackHandler[] = [];

export function registerBackHandler(handler: BackHandler): () => void {
  stack.push(handler);
  return () => {
    const index = stack.lastIndexOf(handler);
    if (index >= 0) stack.splice(index, 1);
  };
}

/** Returns true when a handler consumed the back press. */
export function handleHardwareBack(): boolean {
  for (let index = stack.length - 1; index >= 0; index -= 1) {
    if (stack[index]()) return true;
  }
  return false;
}

/** Test-only: clear all handlers. */
export function clearBackHandlersForTests(): void {
  stack.length = 0;
}
