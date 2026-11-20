import { useEffect, useMemo, useState, type MouseEvent } from "react";
import { Navigate, useParams } from "react-router";
import { CampaignItemsSection } from "../components/campaign/CampaignItemsSection";
import { CollapsiblePane } from "../components/CollapsiblePane";
import { ConfirmDialog } from "../components/confirm/ConfirmDialog";
import { LoadCharacterDialog } from "../components/nav/LoadCharacterDialog";
import { resolveCampaignViewId } from "../components/nav/campaignViews";
import { PaneHeader } from "../components/rest/PaneRestActions";
import { FeatsSummary } from "../components/sheet/FeatsSummary";
import { OverviewAttributes } from "../components/sheet/OverviewAttributes";
import { OverviewHeaderStats } from "../components/sheet/OverviewHeaderStats";
import { MagicSummary } from "../components/sheet/MagicSummary";
import sheetStyles from "../components/sheet/Sheet.module.css";
import formStyles from "../components/form/Form.module.css";
import restStyles from "../components/rest/Rest.module.css";
import { computeDerivedStats } from "../domain/deriveCharacter";
import { useLocale } from "../i18n/LocaleContext";
import { memberCaption, type CampaignMember } from "../state/campaignState";
import { useCampaign } from "../state/CampaignContext";
import { useTableRules } from "../state/TableRulesContext";
import characterPageStyles from "./CharacterPage.module.css";
import styles from "./CampaignPage.module.css";

function CampaignMemberPane({
  member,
  index,
  showInitiative,
  onRemove,
  onInitiativeChange,
  onConcentrationChange,
}: {
  member: CampaignMember;
  index: number;
  showInitiative: boolean;
  onRemove: (id: string) => void;
  onInitiativeChange: (id: string, initiative: number | null) => void;
  onConcentrationChange: (id: string, spellKey: string | null) => void;
}) {
  const { t } = useLocale();
  const tableRules = useTableRules();
  const derived = useMemo(
    () => computeDerivedStats(member.character, tableRules),
    [member.character, tableRules],
  );
  const displayName = memberCaption(member.character, index + 1, t("app.campaign.unnamedMember"));
  const [removeConfirmOpen, setRemoveConfirmOpen] = useState(false);

  function handleRemoveClick(event: MouseEvent<HTMLButtonElement>) {
    event.preventDefault();
    event.stopPropagation();
    setRemoveConfirmOpen(true);
  }

  return (
    <>
      <CollapsiblePane
        title={<span className={styles.memberName}>{displayName}</span>}
        defaultOpen={false}
        summaryActions={
          <button type="button" className={restStyles.restButton} onClick={handleRemoveClick}>
            {t("app.campaign.removeMember")}
          </button>
        }
      >
        <div className={sheetStyles.memberOverviewBody}>
          <OverviewHeaderStats
            character={member.character}
            derived={derived}
            trackedInitiative={showInitiative ? member.initiative : undefined}
            onTrackedInitiativeChange={
              showInitiative
                ? (initiative) => onInitiativeChange(member.id, initiative)
                : undefined
            }
          />
          <OverviewAttributes derived={derived} showSkillsByAbility defaultOpen={false} />
          <FeatsSummary derived={derived} defaultOpen={false} />
          <MagicSummary
            memberId={member.id}
            character={member.character}
            derived={derived}
            onConcentrationChange={(spellKey) => onConcentrationChange(member.id, spellKey)}
            defaultOpen={false}
          />
        </div>
      </CollapsiblePane>
      <ConfirmDialog
        open={removeConfirmOpen}
        message={t("app.campaign.removeMemberConfirm", { name: displayName })}
        onCancel={() => setRemoveConfirmOpen(false)}
        onConfirm={() => {
          onRemove(member.id);
          setRemoveConfirmOpen(false);
        }}
      />
    </>
  );
}

export function CampaignPage() {
  const { view } = useParams<{ view?: string }>();
  const { t } = useLocale();
  const tableRules = useTableRules();
  const { members, dispatch } = useCampaign();
  const [loadDialogOpen, setLoadDialogOpen] = useState(false);
  const viewId = resolveCampaignViewId(view);

  useEffect(() => {
    document.title = `${t("app.campaign.title")} — ${t("app.pageTitle")}`;
  }, [t]);

  if (view && viewId === null) {
    return <Navigate to="/campaign/party" replace />;
  }

  const activeViewId = viewId ?? "party";
  const isCombatView = activeViewId === "combat";
  const isItemsView = activeViewId === "items";
  const regionLabel = isItemsView
    ? t("app.tab.items")
    : isCombatView
      ? t("app.tab.combat")
      : t("app.tab.party");

  return (
    <div className={characterPageStyles.page}>
      <header className={characterPageStyles.header}>
        <h1>{t("app.campaign.title")}</h1>
        <p>{isItemsView ? t("app.campaign.itemsSubtitle") : t("app.campaign.subtitle")}</p>
      </header>

      <main className={characterPageStyles.main}>
        <div role="region" aria-label={regionLabel}>
          {isItemsView ? (
            <div className={formStyles.pane}>
              <PaneHeader title={t("app.campaign.itemsTitle")} />
              <CampaignItemsSection />
            </div>
          ) : (
            <div className={formStyles.pane}>
              <PaneHeader
                title={t("app.campaign.rosterTitle")}
                actions={
                  <div className={restStyles.restActions}>
                    {isCombatView ? (
                      <button
                        type="button"
                        className={restStyles.restButton}
                        onClick={() => dispatch({ type: "SORT_BY_INITIATIVE" })}
                      >
                        {t("app.campaign.sort")}
                      </button>
                    ) : null}
                    <button type="button" className={restStyles.restButton} onClick={() => setLoadDialogOpen(true)}>
                      {isCombatView ? t("app.campaign.loadCreatureNpc") : t("app.campaign.load")}
                    </button>
                  </div>
                }
              />

              {members.length === 0 ? (
                <p className={styles.emptyGroup}>{t("app.campaign.emptyGroup")}</p>
              ) : (
                <div className={styles.memberList}>
                  {members.map((member, index) => (
                    <CampaignMemberPane
                      key={member.id}
                      member={member}
                      index={index}
                      showInitiative={isCombatView}
                      onRemove={(id) => dispatch({ type: "REMOVE_MEMBER", id })}
                      onInitiativeChange={(id, initiative) =>
                        dispatch({ type: "SET_INITIATIVE", id, initiative })
                      }
                      onConcentrationChange={(id, spellKey) =>
                        dispatch({ type: "SET_MEMBER_CONCENTRATION_SPELL", id, spellKey, tableRules })
                      }
                    />
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </main>

      {!isItemsView ? (
        <LoadCharacterDialog
          open={loadDialogOpen}
          onClose={() => setLoadDialogOpen(false)}
          multiple
          titleKey="app.campaign.loadDialogTitle"
          onImport={(characters) => dispatch({ type: "ADD_MEMBERS", characters })}
        />
      ) : null}
    </div>
  );
}
