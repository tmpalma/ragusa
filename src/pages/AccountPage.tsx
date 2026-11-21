import { useEffect, useMemo, useState } from "react";
import type { AccountDeleteRequest, AccountIdentity } from "../components/account/accountSectionTypes";
import { CampaignsSection } from "../components/account/CampaignsSection";
import { CharactersSection } from "../components/account/CharactersSection";
import { PersonalInfoSection } from "../components/account/PersonalInfoSection";
import { ConfirmDialog } from "../components/confirm/ConfirmDialog";
import { useLocale } from "../i18n/LocaleContext";
import {
  getLibraryClient,
  LibraryClientError,
  type LibraryCampaignSummary,
  type LibraryCharacterSummary,
} from "../platform/libraryClient";
import { useSession } from "../state/SessionContext";
import styles from "./AccountPage.module.css";

function libraryErrorMessage(
  error: unknown,
  t: (key: string, params?: Record<string, string | number>) => string,
): string {
  if (error instanceof LibraryClientError) {
    if (error.code === "character_already_seated") return t("account.seatRefused");
    if (error.code === "character_has_membership") return t("account.deleteRefused");
    if (error.code === "invalid_character_file") return t("account.importFailed");
    if (error.code === "empty_title") return t("account.titleRequired");
    if (error.code === "unauthenticated") return t("account.sessionExpired");
    if (error.code === "forbidden") return t("account.forbidden");
  }
  return t("account.libraryError");
}

/**
 * Account page composition. Shared state lives here: the signed-in identity (from the session), the library lists
 * (characters + campaigns) and how they load, the pending flag + error display, and the
 * delete confirm dialog. Each section owns its own form state and library actions.
 */
export function AccountPage() {
  const { t } = useLocale();
  const { session } = useSession();
  const sessionEmail = session?.email ?? null;
  const identity = useMemo<AccountIdentity | null>(
    () => (sessionEmail ? { email: sessionEmail } : null),
    [sessionEmail],
  );
  const [library, setLibrary] = useState<{
    email: string;
    characters: LibraryCharacterSummary[];
    campaigns: LibraryCampaignSummary[];
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<AccountDeleteRequest | null>(null);
  const matchingLibrary = library && identity && library.email === identity.email ? library : null;
  const characters = matchingLibrary?.characters ?? [];
  const campaigns = matchingLibrary?.campaigns ?? [];
  const libraryReady = matchingLibrary != null;

  useEffect(() => {
    document.title = `${t("account.pageTitle")} — ${t("app.pageTitle")}`;
  }, [t]);

  useEffect(() => {
    if (!identity) return;
    let cancelled = false;

    void (async () => {
      try {
        // SessionProvider already ran ensurePlayer for this user.
        const client = getLibraryClient();
        const [nextCharacters, nextCampaigns] = await Promise.all([
          client.listCharacters(identity.email),
          client.listCampaigns(identity.email),
        ]);
        if (cancelled) return;
        setLibrary({ email: identity.email, characters: nextCharacters, campaigns: nextCampaigns });
      } catch (caught) {
        if (!cancelled) setError(libraryErrorMessage(caught, t));
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [identity, t]);

  async function reload(): Promise<void> {
    if (!identity) return;
    const client = getLibraryClient();
    const [nextCharacters, nextCampaigns] = await Promise.all([
      client.listCharacters(identity.email),
      client.listCampaigns(identity.email),
    ]);
    setLibrary({ email: identity.email, characters: nextCharacters, campaigns: nextCampaigns });
  }

  async function run(action: () => Promise<void>): Promise<void> {
    setError(null);
    setPending(true);
    try {
      await action();
    } catch (caught) {
      setError(libraryErrorMessage(caught, t));
    } finally {
      setPending(false);
    }
  }

  function confirmDelete() {
    if (!identity || !pendingDelete) return;
    const target = pendingDelete;
    setPendingDelete(null);
    void run(target.perform);
  }

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <h1>{t("account.title")}</h1>
        <p>{t("account.subtitle")}</p>
      </header>

      {error ? (
        <p className={styles.error} role="alert">
          {error}
        </p>
      ) : null}

      {/* Account sections are composed here, in DOM order. Add new sections as siblings below. */}
      {identity ? (
        <>
          <PersonalInfoSection identity={identity} pending={pending} />

          <CharactersSection
            identity={identity}
            characters={characters}
            campaigns={campaigns}
            libraryReady={libraryReady}
            pending={pending}
            run={run}
            onError={setError}
            onChanged={reload}
            onRequestDelete={setPendingDelete}
          />

          <CampaignsSection
            identity={identity}
            campaigns={campaigns}
            libraryReady={libraryReady}
            pending={pending}
            run={run}
            onError={setError}
            onChanged={reload}
            onRequestDelete={setPendingDelete}
          />
        </>
      ) : null}

      <ConfirmDialog
        open={pendingDelete != null}
        message={
          pendingDelete
            ? t(
                pendingDelete.kind === "character" ? "account.deleteCharacterConfirm" : "account.deleteCampaignConfirm",
                { name: pendingDelete.title },
              )
            : ""
        }
        confirmLabel={t("account.delete")}
        onCancel={() => setPendingDelete(null)}
        onConfirm={confirmDelete}
      />
    </div>
  );
}
