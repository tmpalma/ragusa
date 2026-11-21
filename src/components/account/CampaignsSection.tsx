import { useState, useSyncExternalStore, type FormEvent } from "react";
import { useNavigate } from "react-router";
import { useLocale } from "../../i18n/LocaleContext";
import { saveActivePlay, savePlayerLastCampaign } from "../../platform/characterPersist";
import {
  getLibraryCampaignBinding,
  getLibraryClient,
  setLibraryCampaignBinding,
  subscribeLibrarySession,
  type LibraryCampaignSummary,
} from "../../platform/libraryClient";
import { useCampaign } from "../../state/CampaignContext";
import styles from "../../pages/AccountPage.module.css";
import type { AccountDeleteRequest, AccountIdentity, RunAccountAction } from "./accountSectionTypes";

export interface CampaignsSectionProps {
  identity: AccountIdentity;
  campaigns: LibraryCampaignSummary[];
  libraryReady: boolean;
  pending: boolean;
  run: RunAccountAction;
  onError: (message: string | null) => void;
  /** Reloads the shared characters and campaigns lists. */
  onChanged: () => Promise<void>;
  onRequestDelete: (request: AccountDeleteRequest) => void;
}

export function CampaignsSection({
  identity,
  campaigns,
  libraryReady,
  pending,
  run,
  onError,
  onChanged,
  onRequestDelete,
}: CampaignsSectionProps) {
  const { t } = useLocale();
  const navigate = useNavigate();
  const { members, dispatch: campaignDispatch } = useCampaign();
  const [campaignName, setCampaignName] = useState("");
  const campaignBinding = useSyncExternalStore(
    subscribeLibrarySession,
    getLibraryCampaignBinding,
    getLibraryCampaignBinding,
  );
  const activeCampaignId = campaignBinding?.email === identity.email ? campaignBinding.campaignId : null;

  async function bindActiveCampaign(campaignId: string): Promise<void> {
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
    const title = campaignName.trim();
    if (!title) {
      onError(t("account.titleRequired"));
      return;
    }
    void run(async () => {
      const record = await getLibraryClient().createCampaign(identity.email, { title });
      setCampaignName("");
      await onChanged();
      await bindActiveCampaign(record.id);
    });
  }

  async function openCampaign(campaignId: string) {
    await run(async () => {
      await bindActiveCampaign(campaignId);
      navigate("/campaign");
    });
  }

  function requestDelete(row: LibraryCampaignSummary) {
    onRequestDelete({
      kind: "campaign",
      id: row.id,
      title: row.title,
      perform: async () => {
        await getLibraryClient().deleteCampaign(identity.email, row.id);
        if (getLibraryCampaignBinding()?.campaignId === row.id) {
          setLibraryCampaignBinding(null);
          campaignDispatch({ type: "HYDRATE_MEMBERS", members: [] });
        }
        await onChanged();
      },
    });
  }

  return (
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
