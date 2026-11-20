import { useEffect, useRef, useState, useSyncExternalStore, type FormEvent } from "react";
import { useNavigate } from "react-router";
import { ConfirmDialog } from "../components/confirm/ConfirmDialog";
import { useLocale } from "../i18n/LocaleContext";
import {
  clearClaimedIdentity,
  isValidEmail,
  loadClaimedIdentity,
  normalizeEmail,
  saveClaimedIdentity,
  type ClaimedIdentity,
} from "../platform/claimedIdentity";
import {
  loadPlayerLastCampaign,
  loadPlayerLastCharacter,
  saveActivePlay,
  savePlayerLastCampaign,
  savePlayerLastCharacter,
} from "../platform/characterPersist";
import {
  beginLibraryCharacterOpen,
  clearLibraryCharacterBinding,
  completeLibraryCharacterOpen,
  getLibraryCampaignBinding,
  getLibraryCharacterBinding,
  getLibraryClient,
  LibraryClientError,
  setLibraryCampaignBinding,
  subscribeLibrarySession,
  type LibraryCampaignSummary,
  type LibraryCharacterSummary,
} from "../platform/libraryClient";
import { refreshHomebrewItemRegistryForCharacter } from "../platform/refreshHomebrewItemRegistry";
import { useCampaign } from "../state/CampaignContext";
import { INITIAL_CHARACTER } from "../state/characterState";
import { useCharacter } from "../state/CharacterContext";
import styles from "./AccountPage.module.css";

type PendingDelete =
  | { kind: "character"; id: string; title: string }
  | { kind: "campaign"; id: string; title: string };

function libraryErrorMessage(
  error: unknown,
  t: (key: string, params?: Record<string, string | number>) => string,
): string {
  if (error instanceof LibraryClientError) {
    if (error.code === "character_already_seated") return t("account.seatRefused");
    if (error.code === "character_has_membership") return t("account.deleteRefused");
    if (error.code === "invalid_character_file") return t("account.importFailed");
    if (error.code === "empty_title") return t("account.titleRequired");
  }
  return t("account.libraryError");
}

export function AccountPage() {
  const { t } = useLocale();
  const navigate = useNavigate();
  const { character, dispatch: characterDispatch } = useCharacter();
  const { members, dispatch: campaignDispatch } = useCampaign();
  const [identity, setIdentity] = useState<ClaimedIdentity | null>(() => loadClaimedIdentity());
  const [editing, setEditing] = useState(() => loadClaimedIdentity() == null);
  const [email, setEmail] = useState(() => loadClaimedIdentity()?.email ?? "");
  const [library, setLibrary] = useState<{
    email: string;
    characters: LibraryCharacterSummary[];
    campaigns: LibraryCampaignSummary[];
  } | null>(null);
  const [characterName, setCharacterName] = useState("");
  const [campaignName, setCampaignName] = useState("");
  const [seatChoice, setSeatChoice] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<PendingDelete | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const campaignBinding = useSyncExternalStore(
    subscribeLibrarySession,
    getLibraryCampaignBinding,
    getLibraryCampaignBinding,
  );
  const matchingLibrary = library && identity && library.email === identity.email ? library : null;
  const activeCampaignId =
    identity && campaignBinding?.email === identity.email ? campaignBinding.campaignId : null;
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
        const client = getLibraryClient();
        await client.ensurePlayer(identity.email);
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

  async function reload(nextIdentity: ClaimedIdentity): Promise<void> {
    const client = getLibraryClient();
    const [nextCharacters, nextCampaigns] = await Promise.all([
      client.listCharacters(nextIdentity.email),
      client.listCampaigns(nextIdentity.email),
    ]);
    setLibrary({ email: nextIdentity.email, characters: nextCharacters, campaigns: nextCampaigns });
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

  async function restoreLocalPlay(forEmail: string): Promise<void> {
    const [storedCharacter, storedMembers] = await Promise.all([
      loadPlayerLastCharacter(forEmail),
      loadPlayerLastCampaign(forEmail),
    ]);
    clearLibraryCharacterBinding();
    setLibraryCampaignBinding(null);
    characterDispatch({
      type: "LOAD_CHARACTER",
      character: storedCharacter ?? INITIAL_CHARACTER,
    });
    campaignDispatch({ type: "HYDRATE_MEMBERS", members: storedMembers });
  }

  function submitIdentity(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextEmail = normalizeEmail(email);
    if (!isValidEmail(nextEmail)) {
      setError(t("account.emailInvalid"));
      return;
    }
    const nextIdentity = { email: nextEmail };
    void run(async () => {
      const previous = identity;
      saveClaimedIdentity(nextIdentity);
      await getLibraryClient().ensurePlayer(nextIdentity.email);
      if (previous && previous.email !== nextIdentity.email) {
        await restoreLocalPlay(nextIdentity.email);
      }
      setIdentity(nextIdentity);
      setEditing(false);
    });
  }

  function forgetIdentity() {
    void run(async () => {
      const previousEmail = identity?.email;
      clearClaimedIdentity();
      if (previousEmail) {
        await restoreLocalPlay(previousEmail);
      } else {
        clearLibraryCharacterBinding();
        setLibraryCampaignBinding(null);
        characterDispatch({ type: "LOAD_CHARACTER", character: INITIAL_CHARACTER });
        campaignDispatch({ type: "HYDRATE_MEMBERS", members: [] });
      }
      setIdentity(null);
      setEditing(true);
      setEmail("");
      setLibrary(null);
    });
  }

  function createCharacter(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!identity) return;
    const title = characterName.trim();
    if (!title) {
      setError(t("account.titleRequired"));
      return;
    }
    void run(async () => {
      await getLibraryClient().createCharacter(identity.email, {
        title,
        document: { ...INITIAL_CHARACTER, name: title },
      });
      setCharacterName("");
      await reload(identity);
    });
  }

  async function bindActiveCampaign(campaignId: string): Promise<void> {
    if (!identity) return;
    if (!getLibraryCampaignBinding()) {
      await savePlayerLastCampaign(identity.email, members);
    }
    const record = await getLibraryClient().openCampaign(identity.email, campaignId);
    setLibraryCampaignBinding({ email: identity.email, campaignId: record.id });
    campaignDispatch({
      type: "HYDRATE_MEMBERS",
      members: record.members.map((member) => ({
        id: member.id,
        character: member.character,
        initiative: member.initiative,
      })),
    });
    await saveActivePlay(identity.email, { campaignId: record.id });
  }

  function createCampaign(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!identity) return;
    const title = campaignName.trim();
    if (!title) {
      setError(t("account.titleRequired"));
      return;
    }
    void run(async () => {
      const record = await getLibraryClient().createCampaign(identity.email, { title });
      setCampaignName("");
      await reload(identity);
      await bindActiveCampaign(record.id);
    });
  }

  async function openCharacter(characterId: string) {
    if (!identity) return;
    await run(async () => {
      if (!getLibraryCharacterBinding()) {
        await savePlayerLastCharacter(identity.email, character);
      }
      const record = await getLibraryClient().openCharacter(identity.email, characterId);
      beginLibraryCharacterOpen(identity.email, record.id);
      characterDispatch({ type: "LOAD_CHARACTER", character: record.document });
      completeLibraryCharacterOpen();
      await refreshHomebrewItemRegistryForCharacter(identity.email, record.id);
      await saveActivePlay(identity.email, { characterId: record.id });
      navigate("/character");
    });
  }

  async function openCampaign(campaignId: string) {
    if (!identity) return;
    await run(async () => {
      await bindActiveCampaign(campaignId);
      navigate("/campaign");
    });
  }

  function seat(event: FormEvent<HTMLFormElement>, characterId: string) {
    event.preventDefault();
    if (!identity) return;
    const campaignId = seatChoice[characterId] ?? "";
    if (!campaignId) {
      setError(t("account.chooseCampaignRequired"));
      return;
    }
    void run(async () => {
      await getLibraryClient().seatCharacter(identity.email, campaignId, characterId);
      await reload(identity);
    });
  }

  function unseat(characterId: string, campaignId: string) {
    if (!identity) return;
    void run(async () => {
      await getLibraryClient().unseatCharacter(identity.email, campaignId, characterId);
      await reload(identity);
    });
  }

  function confirmDelete() {
    if (!identity || !pendingDelete) return;
    const target = pendingDelete;
    setPendingDelete(null);
    void run(async () => {
      const client = getLibraryClient();
      if (target.kind === "character") {
        await client.deleteCharacter(identity.email, target.id);
      } else {
        await client.deleteCampaign(identity.email, target.id);
        if (getLibraryCampaignBinding()?.campaignId === target.id) {
          setLibraryCampaignBinding(null);
          campaignDispatch({ type: "HYDRATE_MEMBERS", members: [] });
        }
      }
      await reload(identity);
    });
  }

  function importFile(file: File) {
    if (!identity) return;
    void run(async () => {
      const source = await file.text();
      await getLibraryClient().importCharacter(identity.email, source);
      await reload(identity);
    });
  }

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <h1>{t("account.title")}</h1>
        <p>{t("account.subtitle")}</p>
        <p className={styles.note}>{identity ? t("account.claimedLocalNote") : t("account.localPlayNote")}</p>
      </header>

      {error ? (
        <p className={styles.error} role="alert">
          {error}
        </p>
      ) : null}

      <section className={styles.section} aria-labelledby="account-identity-heading">
        <h2 id="account-identity-heading">{t("account.identityTitle")}</h2>
        {identity && !editing ? (
          <>
            <p className={styles.note}>
              {t("account.claimedAs", { email: identity.email })}
            </p>
            <div className={styles.actions}>
              <button type="button" className={styles.buttonSecondary} onClick={() => setEditing(true)} disabled={pending}>
                {t("account.changeIdentity")}
              </button>
              <button type="button" className={styles.buttonSecondary} onClick={forgetIdentity} disabled={pending}>
                {t("account.forget")}
              </button>
            </div>
            <p className={styles.hint}>{t("account.forgetHint")}</p>
          </>
        ) : (
          <form className={styles.form} onSubmit={submitIdentity}>
            <div className={styles.fields}>
              <div className={styles.field}>
                <label htmlFor="account-email">{t("account.email")}</label>
                <input
                  id="account-email"
                  type="email"
                  autoComplete="email"
                  inputMode="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                />
              </div>
            </div>
            <div className={styles.actions}>
              <button type="submit" className={styles.button} disabled={pending}>
                {t("account.continue")}
              </button>
              {identity ? (
                <button
                  type="button"
                  className={styles.buttonSecondary}
                  disabled={pending}
                  onClick={() => {
                    setEmail(identity.email);
                    setEditing(false);
                    setError(null);
                  }}
                >
                  {t("account.cancel")}
                </button>
              ) : null}
            </div>
          </form>
        )}
      </section>

      {identity ? (
        <>
          <section className={styles.section} aria-labelledby="account-characters-heading">
            <h2 id="account-characters-heading">{t("account.charactersTitle")}</h2>
            <form className={styles.inlineForm} onSubmit={createCharacter}>
              <input
                aria-label={t("account.characterName")}
                type="text"
                value={characterName}
                placeholder={t("account.characterName")}
                onChange={(event) => setCharacterName(event.target.value)}
              />
              <button type="submit" className={styles.button} disabled={pending}>
                {t("account.createCharacter")}
              </button>
              <button
                type="button"
                className={styles.buttonSecondary}
                disabled={pending}
                onClick={() => fileInputRef.current?.click()}
              >
                {t("account.importCharacter")}
              </button>
              <input
                ref={fileInputRef}
                className={styles.fileInput}
                type="file"
                accept="application/json,.json"
                tabIndex={-1}
                aria-hidden="true"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  event.target.value = "";
                  if (file) importFile(file);
                }}
              />
            </form>
            {libraryReady && characters.length === 0 ? <p className={styles.empty}>{t("account.emptyCharacters")}</p> : null}
            <ul className={styles.list}>
              {characters.map((row) => (
                <li key={row.id} className={styles.item}>
                  <div>
                    <span className={styles.itemTitle}>{row.title}</span>
                    <span className={styles.meta}>
                      {row.campaignTitle
                        ? t("account.inCampaign", { campaign: row.campaignTitle })
                        : t("account.notSeated")}
                    </span>
                  </div>
                  <div className={styles.itemActions}>
                    <button
                      type="button"
                      className={styles.button}
                      disabled={pending}
                      onClick={() => void openCharacter(row.id)}
                    >
                      {t("account.open")}
                    </button>
                    {row.campaignId ? (
                      <button
                        type="button"
                        className={styles.buttonSecondary}
                        disabled={pending}
                        onClick={() => {
                          if (row.campaignId) unseat(row.id, row.campaignId);
                        }}
                      >
                        {t("account.unseat")}
                      </button>
                    ) : (
                      <form className={styles.inlineForm} onSubmit={(event) => seat(event, row.id)}>
                        <select
                          aria-label={t("account.chooseCampaign")}
                          value={seatChoice[row.id] ?? ""}
                          disabled={pending || campaigns.length === 0}
                          onChange={(event) =>
                            setSeatChoice((current) => ({ ...current, [row.id]: event.target.value }))
                          }
                        >
                          <option value="">{t("account.chooseCampaign")}</option>
                          {campaigns.map((campaign) => (
                            <option key={campaign.id} value={campaign.id}>
                              {campaign.title}
                            </option>
                          ))}
                        </select>
                        <button type="submit" className={styles.buttonSecondary} disabled={pending || campaigns.length === 0}>
                          {t("account.seat")}
                        </button>
                      </form>
                    )}
                    <button
                      type="button"
                      className={styles.buttonSecondary}
                      disabled={pending}
                      onClick={() => setPendingDelete({ kind: "character", id: row.id, title: row.title })}
                    >
                      {t("account.delete")}
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          </section>

          <section className={styles.section} aria-labelledby="account-campaigns-heading">
            <h2 id="account-campaigns-heading">{t("account.campaignsTitle")}</h2>
            <form className={styles.inlineForm} onSubmit={createCampaign}>
              <input
                aria-label={t("account.campaignName")}
                type="text"
                value={campaignName}
                placeholder={t("account.campaignName")}
                onChange={(event) => setCampaignName(event.target.value)}
              />
              <button type="submit" className={styles.button} disabled={pending}>
                {t("account.createCampaign")}
              </button>
            </form>
            {libraryReady && campaigns.length === 0 ? <p className={styles.empty}>{t("account.emptyCampaigns")}</p> : null}
            <ul className={styles.list}>
              {campaigns.map((row) => (
                <li
                  key={row.id}
                  className={activeCampaignId === row.id ? `${styles.item} ${styles.itemActive}` : styles.item}
                >
                  <div>
                    <span className={styles.itemTitle}>{row.title}</span>
                    <span className={styles.meta}>{t("account.memberCount", { count: row.memberCount })}</span>
                  </div>
                  <div className={styles.itemActions}>
                    <button
                      type="button"
                      className={styles.button}
                      disabled={pending}
                      onClick={() => void openCampaign(row.id)}
                    >
                      {t("account.open")}
                    </button>
                    <button
                      type="button"
                      className={styles.buttonSecondary}
                      disabled={pending}
                      onClick={() => setPendingDelete({ kind: "campaign", id: row.id, title: row.title })}
                    >
                      {t("account.delete")}
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          </section>
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
