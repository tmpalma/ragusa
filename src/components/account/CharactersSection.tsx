import { useRef, useState, type FormEvent } from "react";
import { useNavigate } from "react-router";
import { saveCharacterToDisk } from "../../domain/characterFileIo";
import { computeDerivedStats } from "../../domain/deriveCharacter";
import { MAX_CHARACTERS_PER_PLAYER } from "../../domain/libraryLimits";
import { buildSheetPayload } from "../../domain/pdfSheet/buildSheetPayload";
import { fieldMapForLocale } from "../../domain/pdfSheet/fieldMaps";
import { useLocale } from "../../i18n/LocaleContext";
import { saveActivePlay, savePlayerLastCharacter } from "../../platform/characterPersist";
import {
  beginLibraryCharacterOpen,
  completeLibraryCharacterOpen,
  getLibraryCharacterBinding,
  getLibraryClient,
  type LibraryCampaignSummary,
  type LibraryCharacterSummary,
} from "../../platform/libraryClient";
import { refreshHomebrewItemRegistryForCharacter } from "../../platform/refreshHomebrewItemRegistry";
import { INITIAL_CHARACTER } from "../../state/characterState";
import { useCharacter } from "../../state/CharacterContext";
import { useTableRules } from "../../state/TableRulesContext";
import styles from "../../pages/AccountPage.module.css";
import type { AccountDeleteRequest, AccountIdentity, RunAccountAction } from "./accountSectionTypes";

export interface CharactersSectionProps {
  identity: AccountIdentity;
  characters: LibraryCharacterSummary[];
  /** Campaign options for the seat picker. */
  campaigns: LibraryCampaignSummary[];
  libraryReady: boolean;
  pending: boolean;
  run: RunAccountAction;
  onError: (message: string | null) => void;
  /** Reloads the shared characters and campaigns lists. */
  onChanged: () => Promise<void>;
  onRequestDelete: (request: AccountDeleteRequest) => void;
}

export function CharactersSection({
  identity,
  characters,
  campaigns,
  libraryReady,
  pending,
  run,
  onError,
  onChanged,
  onRequestDelete,
}: CharactersSectionProps) {
  const { locale, t, tEntity } = useLocale();
  const navigate = useNavigate();
  const tableRules = useTableRules();
  const { character, dispatch: characterDispatch } = useCharacter();
  const characterCount = characters.length;
  // Accounts already over the cap keep their characters but cannot add more.
  const atCap = libraryReady && characterCount >= MAX_CHARACTERS_PER_PLAYER;
  const [characterName, setCharacterName] = useState("");
  const [seatChoice, setSeatChoice] = useState<Record<string, string>>({});
  const fileInputRef = useRef<HTMLInputElement>(null);

  function createCharacter(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const title = characterName.trim();
    if (!title) {
      onError(t("account.titleRequired"));
      return;
    }
    void run(async () => {
      await getLibraryClient().createCharacter(identity.email, {
        title,
        document: { ...INITIAL_CHARACTER, name: title },
      });
      setCharacterName("");
      await onChanged();
    });
  }

  async function openCharacter(characterId: string) {
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

  function seat(event: FormEvent<HTMLFormElement>, characterId: string) {
    event.preventDefault();
    const campaignId = seatChoice[characterId] ?? "";
    if (!campaignId) {
      onError(t("account.chooseCampaignRequired"));
      return;
    }
    void run(async () => {
      await getLibraryClient().seatCharacter(identity.email, campaignId, characterId);
      await onChanged();
    });
  }

  function unseat(characterId: string, campaignId: string) {
    void run(async () => {
      await getLibraryClient().unseatCharacter(identity.email, campaignId, characterId);
      await onChanged();
    });
  }

  function requestDelete(row: LibraryCharacterSummary) {
    onRequestDelete({
      kind: "character",
      id: row.id,
      title: row.title,
      perform: async () => {
        await getLibraryClient().deleteCharacter(identity.email, row.id);
        await onChanged();
      },
    });
  }

  function exportJson(characterId: string) {
    void run(async () => {
      const record = await getLibraryClient().openCharacter(identity.email, characterId);
      await saveCharacterToDisk(record.document);
    });
  }

  function exportPdf(characterId: string) {
    void run(async () => {
      const record = await getLibraryClient().openCharacter(identity.email, characterId);
      const exported = record.document;
      const derived = computeDerivedStats(exported, tableRules);
      const entityName = (catalog: string, key: string | null | undefined, fallback?: string) =>
        tEntity(catalog, key ?? "", "name", fallback);
      const { fetchCharacterSheetTemplate, fillCharacterSheetPdf, downloadFilledCharacterPdf } =
        await import("../../domain/pdfSheet/fillCharacterSheetPdf");
      const template = await fetchCharacterSheetTemplate(locale);
      const payload = buildSheetPayload(exported, derived, t, entityName, tEntity);
      const filled = await fillCharacterSheetPdf(template, payload, fieldMapForLocale(locale));
      await downloadFilledCharacterPdf(filled, `${exported.name.trim() || "character"}.pdf`);
    });
  }

  function importFile(file: File) {
    void run(async () => {
      const source = await file.text();
      await getLibraryClient().importCharacter(identity.email, source);
      await onChanged();
    });
  }

  return (
    <section className={styles.section} aria-labelledby="account-characters-heading">
      <h2 id="account-characters-heading">{t("account.charactersTitle")}</h2>
      {libraryReady ? (
        <p
          className={styles.meta}
          aria-label={t("account.characterCountAriaLabel", {
            count: characterCount,
            max: MAX_CHARACTERS_PER_PLAYER,
          })}
        >
          {t("account.characterCount", { count: characterCount, max: MAX_CHARACTERS_PER_PLAYER })}
        </p>
      ) : null}
      {atCap ? (
        <p className={styles.note} role="status">
          {t("account.characterLimitReached", { max: MAX_CHARACTERS_PER_PLAYER })}
        </p>
      ) : null}
      <form className={styles.inlineForm} onSubmit={createCharacter}>
        <input
          aria-label={t("account.characterName")}
          type="text"
          value={characterName}
          placeholder={t("account.characterName")}
          onChange={(event) => setCharacterName(event.target.value)}
        />
        <button type="submit" className={styles.button} disabled={pending || atCap}>
          {t("account.createCharacter")}
        </button>
        <button
          type="button"
          className={styles.buttonSecondary}
          disabled={pending || atCap}
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
              {atCap ? (
                <>
                  <button
                    type="button"
                    className={styles.buttonSecondary}
                    disabled={pending}
                    onClick={() => exportJson(row.id)}
                  >
                    {t("account.characterLimitExportJson")}
                  </button>
                  <button
                    type="button"
                    className={styles.buttonSecondary}
                    disabled={pending}
                    onClick={() => exportPdf(row.id)}
                  >
                    {t("account.characterLimitExportPdf")}
                  </button>
                </>
              ) : null}
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
                onClick={() => requestDelete(row)}
              >
                {t("account.delete")}
              </button>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
