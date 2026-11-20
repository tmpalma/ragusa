import { useCallback, useEffect, useMemo, useState, useSyncExternalStore, type FormEvent } from "react";
import type { CurrencyDenomination } from "../../data/types";
import { parseMassInput, parseOptionalRangeInput } from "../../domain/homebrewItemInput";
import {
  CURRENCY_DENOMINATIONS,
  HOMEBREW_ITEM_CATEGORIES,
  type HomebrewItemCategory,
  type HomebrewItemData,
  type HomebrewItemRecord,
} from "../../domain/homebrewItems";
import { parseLocalizedDecimal } from "../../domain/units";
import { useLocale } from "../../i18n/LocaleContext";
import {
  getLibraryCampaignBinding,
  getLibraryCharacterBinding,
  getLibraryClient,
  subscribeLibrarySession,
  type LibraryCampaignSummary,
} from "../../platform/libraryClient";
import { refreshHomebrewItemRegistryForCampaign } from "../../platform/refreshHomebrewItemRegistry";
import { useMeasurementSystem } from "../../platform/measurementSystem";
import restStyles from "../rest/Rest.module.css";
import formStyles from "../form/Form.module.css";
import styles from "./CampaignItemsSection.module.css";

const emptyForm = {
  name: "",
  description: "",
  category: "wondrous" as HomebrewItemCategory,
  weight: "",
  costAmount: "",
  costDenomination: "gp" as CurrencyDenomination,
  rangeNormal: "",
  rangeLong: "",
  campaignIds: [] as string[],
};

function buildHomebrewData(
  form: typeof emptyForm,
  system: ReturnType<typeof useMeasurementSystem>["system"],
): HomebrewItemData | null {
  const name = form.name.trim();
  if (!name) return null;
  const mass = parseMassInput(form.weight, system);
  if (!mass) return null;
  const costAmount = parseLocalizedDecimal(form.costAmount);
  if (costAmount == null) return null;
  const range = parseOptionalRangeInput(form.rangeNormal, form.rangeLong, system);
  return {
    name,
    description: form.description,
    category: form.category,
    weightLb: mass.weightLb,
    ...(mass.weightKg != null ? { weightKg: mass.weightKg } : {}),
    cost: { amount: costAmount, denomination: form.costDenomination },
    ...(range ? { range } : {}),
  };
}

export function CampaignItemsSection() {
  const { t } = useLocale();
  const { system } = useMeasurementSystem();
  const campaignBinding = useSyncExternalStore(subscribeLibrarySession, getLibraryCampaignBinding, getLibraryCampaignBinding);
  const [campaigns, setCampaigns] = useState<LibraryCampaignSummary[]>([]);
  const [items, setItems] = useState<HomebrewItemRecord[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const massUnitLabel = system === "metric" ? t("app.campaign.items.weightKg") : t("app.campaign.items.weightLb");
  const rangeUnitLabel = system === "metric" ? t("app.campaign.items.rangeM") : t("app.campaign.items.rangeFt");

  const reload = useCallback(async () => {
    if (!campaignBinding) {
      setCampaigns([]);
      setItems([]);
      return;
    }
    const client = getLibraryClient();
    const [campaignRows, itemRows] = await Promise.all([
      client.listCampaigns(campaignBinding.email),
      client.listHomebrewItems(campaignBinding.email, { campaignId: campaignBinding.campaignId }),
    ]);
    setCampaigns(campaignRows);
    setItems(itemRows);
  }, [campaignBinding]);

  useEffect(() => {
    void reload();
  }, [reload]);

  useEffect(() => {
    if (!campaignBinding || editingId) return;
    setForm((prev) =>
      prev.campaignIds.length > 0 ? prev : { ...prev, campaignIds: [campaignBinding.campaignId] },
    );
  }, [campaignBinding, editingId]);

  function resetForm(defaultCampaignIds: string[]) {
    setForm({ ...emptyForm, campaignIds: defaultCampaignIds });
    setEditingId(null);
    setError(null);
  }

  function startEdit(record: HomebrewItemRecord) {
    const range = record.data.range;
    setEditingId(record.id);
    setForm({
      name: record.data.name,
      description: record.data.description,
      category: record.data.category,
      weight:
        system === "metric" && record.data.weightKg != null
          ? String(record.data.weightKg).replace(".", ",")
          : String(record.data.weightLb),
      costAmount: String(record.data.cost.amount),
      costDenomination: record.data.cost.denomination,
      rangeNormal:
        range && system === "metric" && range.normalMeters != null
          ? String(range.normalMeters).replace(".", ",")
          : range
            ? String(range.normalFeet)
            : "",
      rangeLong:
        range && system === "metric" && range.longMeters != null
          ? String(range.longMeters).replace(".", ",")
          : range
            ? String(range.longFeet)
            : "",
      campaignIds: [...record.campaignIds],
    });
    setError(null);
  }

  async function syncPlayerRegistry() {
    if (!campaignBinding) return;
    await refreshHomebrewItemRegistryForCampaign(campaignBinding.email, campaignBinding.campaignId);
    const characterBinding = getLibraryCharacterBinding();
    if (characterBinding?.loaded) {
      const summaries = await getLibraryClient().listCharacters(campaignBinding.email);
      const summary = summaries.find((row) => row.id === characterBinding.characterId);
      if (summary?.campaignId === campaignBinding.campaignId) {
        await refreshHomebrewItemRegistryForCampaign(campaignBinding.email, campaignBinding.campaignId);
      }
    }
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!campaignBinding) return;
    const data = buildHomebrewData(form, system);
    if (!data) {
      setError(t("app.campaign.items.formInvalid"));
      return;
    }
    if (form.campaignIds.length === 0) {
      setError(t("app.campaign.items.campaignRequired"));
      return;
    }
    setPending(true);
    setError(null);
    try {
      const client = getLibraryClient();
      if (editingId) {
        await client.updateHomebrewItem(campaignBinding.email, editingId, {
          campaignIds: form.campaignIds,
          data,
        });
      } else {
        await client.createHomebrewItem(campaignBinding.email, {
          campaignIds: form.campaignIds,
          data,
        });
      }
      await reload();
      await syncPlayerRegistry();
      resetForm([campaignBinding.campaignId]);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("app.campaign.items.saveFailed"));
    } finally {
      setPending(false);
    }
  }

  async function handleDelete(id: string) {
    if (!campaignBinding) return;
    setPending(true);
    setError(null);
    try {
      await getLibraryClient().deleteHomebrewItem(campaignBinding.email, id);
      if (editingId === id) {
        resetForm([campaignBinding.campaignId]);
      }
      await reload();
      await syncPlayerRegistry();
    } catch (err) {
      setError(err instanceof Error ? err.message : t("app.campaign.items.saveFailed"));
    } finally {
      setPending(false);
    }
  }

  const defaultCampaignIds = useMemo(
    () => (campaignBinding ? [campaignBinding.campaignId] : []),
    [campaignBinding],
  );

  if (!campaignBinding) {
    return <p className={styles.hint}>{t("app.campaign.items.openCampaignHint")}</p>;
  }

  return (
    <div className={styles.section}>
      <p className={styles.hint}>{t("app.campaign.items.bookScaleHint")}</p>

      <form className={formStyles.form} onSubmit={(event) => void handleSubmit(event)}>
        <h3>{editingId ? t("app.campaign.items.editTitle") : t("app.campaign.items.createTitle")}</h3>
        {error ? <p className={styles.error}>{error}</p> : null}
        <div className={styles.grid}>
          <div className={formStyles.field}>
            <label htmlFor="homebrew-name">{t("app.campaign.items.name")}</label>
            <input
              id="homebrew-name"
              type="text"
              value={form.name}
              onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
              required
            />
          </div>
          <div className={formStyles.field}>
            <label htmlFor="homebrew-category">{t("app.campaign.items.category")}</label>
            <select
              id="homebrew-category"
              value={form.category}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, category: event.target.value as HomebrewItemCategory }))
              }
            >
              {HOMEBREW_ITEM_CATEGORIES.map((category) => (
                <option key={category} value={category}>
                  {t(`equipment.homebrewCategory.${category}`)}
                </option>
              ))}
            </select>
          </div>
          <div className={`${formStyles.field} ${styles.fullWidth}`}>
            <label htmlFor="homebrew-description">{t("app.campaign.items.description")}</label>
            <textarea
              id="homebrew-description"
              rows={5}
              value={form.description}
              onChange={(event) => setForm((prev) => ({ ...prev, description: event.target.value }))}
            />
          </div>
          <div className={formStyles.field}>
            <label htmlFor="homebrew-weight">{massUnitLabel}</label>
            <input
              id="homebrew-weight"
              type="text"
              inputMode="decimal"
              value={form.weight}
              onChange={(event) => setForm((prev) => ({ ...prev, weight: event.target.value }))}
              required
            />
          </div>
          <div className={formStyles.field}>
            <label htmlFor="homebrew-cost">{t("app.campaign.items.cost")}</label>
            <div className={styles.costRow}>
              <input
                id="homebrew-cost"
                type="text"
                inputMode="decimal"
                value={form.costAmount}
                onChange={(event) => setForm((prev) => ({ ...prev, costAmount: event.target.value }))}
                required
              />
              <select
                aria-label={t("equipment.costDenomination")}
                value={form.costDenomination}
                onChange={(event) =>
                  setForm((prev) => ({
                    ...prev,
                    costDenomination: event.target.value as CurrencyDenomination,
                  }))
                }
              >
                {CURRENCY_DENOMINATIONS.map((denomination) => (
                  <option key={denomination} value={denomination}>
                    {t(`equipment.currencyAbbr.${denomination}`)}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className={formStyles.field}>
            <label htmlFor="homebrew-range-normal">{t("app.campaign.items.rangeNormal", { unit: rangeUnitLabel })}</label>
            <input
              id="homebrew-range-normal"
              type="text"
              inputMode="decimal"
              value={form.rangeNormal}
              onChange={(event) => setForm((prev) => ({ ...prev, rangeNormal: event.target.value }))}
            />
          </div>
          <div className={formStyles.field}>
            <label htmlFor="homebrew-range-long">{t("app.campaign.items.rangeLong", { unit: rangeUnitLabel })}</label>
            <input
              id="homebrew-range-long"
              type="text"
              inputMode="decimal"
              value={form.rangeLong}
              onChange={(event) => setForm((prev) => ({ ...prev, rangeLong: event.target.value }))}
            />
          </div>
          <fieldset className={`${styles.fieldset} ${styles.fullWidth}`}>
            <legend>{t("app.campaign.items.campaignsLegend")}</legend>
            {campaigns.map((campaign) => (
              <label key={campaign.id} className={styles.checkboxRow}>
                <input
                  type="checkbox"
                  checked={form.campaignIds.includes(campaign.id)}
                  onChange={(event) => {
                    setForm((prev) => {
                      const next = new Set(prev.campaignIds);
                      if (event.target.checked) next.add(campaign.id);
                      else next.delete(campaign.id);
                      return { ...prev, campaignIds: [...next] };
                    });
                  }}
                />
                {campaign.title}
              </label>
            ))}
          </fieldset>
        </div>
        <div className={styles.actions}>
          <button type="submit" className={formStyles.button} disabled={pending}>
            {editingId ? t("app.campaign.items.save") : t("app.campaign.items.create")}
          </button>
          {editingId ? (
            <button
              type="button"
              className={restStyles.restButton}
              disabled={pending}
              onClick={() => resetForm(defaultCampaignIds)}
            >
              {t("app.campaign.items.cancelEdit")}
            </button>
          ) : null}
        </div>
      </form>

      <section className={styles.listSection}>
        <h3>{t("app.campaign.items.listTitle")}</h3>
        {items.length === 0 ? (
          <p className={styles.hint}>{t("app.campaign.items.empty")}</p>
        ) : (
          <ul className={styles.itemList}>
            {items.map((item) => (
              <li key={item.id}>
                <div>
                  <strong>{item.data.name}</strong>
                  <span className={styles.itemMeta}>
                    {t(`equipment.homebrewCategory.${item.data.category}`)}
                  </span>
                </div>
                <div className={styles.rowActions}>
                  <button type="button" className={restStyles.restButton} onClick={() => startEdit(item)}>
                    {t("app.campaign.items.edit")}
                  </button>
                  <button
                    type="button"
                    className={restStyles.restButton}
                    disabled={pending}
                    onClick={() => void handleDelete(item.id)}
                  >
                    {t("app.campaign.items.delete")}
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
