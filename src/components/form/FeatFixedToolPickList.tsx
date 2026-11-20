import type { ToolId } from "../../data/toolStats";
import { useLocale } from "../../i18n/LocaleContext";
import styles from "./Form.module.css";
import { ToolSelectedRow } from "./ToolSelectedRow";

export function FeatFixedToolPickList({
  id,
  toolIds,
}: {
  id: string;
  toolIds: ToolId[];
}) {
  const { t } = useLocale();
  if (toolIds.length === 0) return null;

  return (
    <div className={styles.field} id={id}>
      <span className={styles.groupLabel}>{t("character.featToolProficiency")}</span>
      <ul className={styles.itemList}>
        {toolIds.map((toolId) => (
          <li key={toolId}>
            <div className={styles.itemListMain}>
              <span className={styles.itemListName}>
                <ToolSelectedRow toolId={toolId} />
              </span>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
