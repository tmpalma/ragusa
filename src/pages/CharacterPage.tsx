import { useEffect } from "react";
import { Navigate, useParams } from "react-router";
import { ActionsView } from "../components/combat/ActionsView";
import { VitalsView } from "../components/combat/VitalsView";
import { EquipmentView } from "../components/equipment/EquipmentView";
import { FormPane } from "../components/form/FormPane";
import { CharacterPageSubtitle } from "../components/nav/CharacterPageSubtitle";
import { CharacterToolbar } from "../components/nav/CharacterToolbar";
import { CharacterViewChips } from "../components/nav/CharacterViewChips";
import { resolveCharacterViewId } from "../components/nav/characterViews";
import { SheetPane } from "../components/sheet/SheetPane";
import { SpellsView } from "../components/spells/SpellsView";
import { CompanionsView } from "../components/companions/CompanionsView";
import { characterHasCompanionTab } from "../domain/companions";
import { useLocale } from "../i18n/LocaleContext";
import { useCharacter } from "../state/CharacterContext";
import styles from "./CharacterPage.module.css";

export function CharacterPage() {
  const { view } = useParams<{ view?: string }>();
  const { t } = useLocale();
  const { character } = useCharacter();
  const viewId = resolveCharacterViewId(view);

  useEffect(() => {
    document.title = `${t("app.title")} — ${t("app.pageTitle")}`;
  }, [t]);

  if (view && viewId === null) {
    return <Navigate to="/character" replace />;
  }

  if (viewId === "companions" && !characterHasCompanionTab(character)) {
    return <Navigate to="/character" replace />;
  }

  const activeViewId = viewId ?? "form";

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <h1>{t("app.title")}</h1>
        <p><CharacterPageSubtitle /></p>
      </header>
      <CharacterToolbar />
      <CharacterViewChips activeViewId={activeViewId} />
      <main className={styles.main}>
        {activeViewId === "form" && (
          <div role="region" aria-label={t("app.tab.character")}>
            <FormPane />
          </div>
        )}
        {activeViewId === "overview" && (
          <div role="region" aria-label={t("app.tab.overview")}>
            <SheetPane />
          </div>
        )}
        {activeViewId === "equipment" && <EquipmentView />}
        {activeViewId === "spells" && <SpellsView />}
        {activeViewId === "companions" && <CompanionsView />}
        {activeViewId === "vitals" && <VitalsView />}
        {activeViewId === "actions" && <ActionsView />}
      </main>
    </div>
  );
}
