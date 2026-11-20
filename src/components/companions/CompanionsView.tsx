import { useMemo } from "react";
import { availableCompanions } from "../../domain/companions";
import { useLocale } from "../../i18n/LocaleContext";
import { useCharacter } from "../../state/CharacterContext";
import { CreaturePane } from "../creatures/CreaturePane";
import sheetStyles from "../sheet/Sheet.module.css";
import styles from "./CompanionsView.module.css";

export function CompanionsView() {
  const { t } = useLocale();
  const { character } = useCharacter();
  const companions = useMemo(() => availableCompanions(character), [character]);

  return (
    <div
      className={sheetStyles.pane}
      role="tabpanel"
      id="panel-companions"
      aria-labelledby="tab-companions"
    >
      <h2 className={sheetStyles.sectionTitle}>{t("companions.title")}</h2>
      {companions.length === 0 ? (
        <p className={sheetStyles.hint}>{t("companions.empty")}</p>
      ) : (
        <div className={styles.paneList}>
          {companions.map((entry) => (
            <CreaturePane key={entry.instance.id} entry={entry} />
          ))}
        </div>
      )}
    </div>
  );
}