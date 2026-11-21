import { MAX_CHARACTERS_PER_PLAYER } from "../domain/libraryLimits";
import type { TranslateFn } from "../i18n/LocaleContext";
import { LibraryClientError } from "./libraryClient";

/**
 * Shared mapping from a library failure to a translated, user-facing message.
 * Codes without a specific key (and non-library errors) fall back to `account.libraryError`.
 */
export function libraryErrorMessage(error: unknown, t: TranslateFn): string {
  if (error instanceof LibraryClientError) {
    if (error.code === "character_already_seated") return t("account.seatRefused");
    if (error.code === "character_has_membership") return t("account.deleteRefused");
    if (error.code === "invalid_character_file") return t("account.importFailed");
    if (error.code === "empty_title") return t("account.titleRequired");
    if (error.code === "unauthenticated") return t("account.sessionExpired");
    if (error.code === "forbidden") return t("account.forbidden");
    if (error.code === "character_limit") {
      return t("account.characterLimitReached", { max: MAX_CHARACTERS_PER_PLAYER });
    }
    if (error.code === "invalid_items_file") return t("app.campaign.items.importInvalidFile");
  }
  return t("account.libraryError");
}
