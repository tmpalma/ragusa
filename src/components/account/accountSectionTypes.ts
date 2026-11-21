/** Shared prop shapes for the Account page sections (see `src/pages/AccountPage.tsx`). */

/** Runs a library action with the page's shared pending flag and error display. */
export type RunAccountAction = (action: () => Promise<void>) => Promise<void>;

/** A delete the page confirms through its shared ConfirmDialog before running `perform`. */
export type AccountDeleteRequest = {
  kind: "character" | "campaign";
  id: string;
  title: string;
  perform: () => Promise<void>;
};
