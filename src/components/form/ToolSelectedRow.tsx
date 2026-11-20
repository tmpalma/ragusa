import type { ToolId } from "../../data/toolStats";
import { structuredDescPartsForTool } from "../../domain/toolGearDesc";
import { useLocale } from "../../i18n/LocaleContext";
import styles from "./Form.module.css";
import { useToolName } from "./ToolsInput";

export function ToolSelectedRow({
  toolId,
  suggestedToolId,
}: {
  toolId: ToolId;
  suggestedToolId?: ToolId | null;
}) {
  const { t } = useLocale();
  const toolName = useToolName();
  const name = toolName(toolId);
  const displayName =
    suggestedToolId === toolId ? t("character.suggestedTool", { name }) : name;
  const structuredParts = structuredDescPartsForTool(toolId);

  const sections = structuredParts
    ? [
        { key: "ability", label: t("equipment.toolSection.ability"), text: structuredParts.ability },
        { key: "utilize", label: t("equipment.toolSection.utilize"), text: structuredParts.utilize },
        { key: "craft", label: t("equipment.toolSection.craft"), text: structuredParts.craft },
      ].filter((section) => section.text)
    : [];

  return (
    <span className={styles.toolPickEntry}>
      <span className={styles.toolPickName}>{displayName}</span>
      {sections.map((section) => (
        <span key={section.key} className={styles.toolPickDesc}>
          <strong>{section.label}</strong> {section.text}
        </span>
      ))}
    </span>
  );
}
