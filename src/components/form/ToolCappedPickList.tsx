import type { ToolId } from "../../data/toolStats";
import { useLocale } from "../../i18n/LocaleContext";
import { CappedPickList } from "./CappedPickList";
import { ToolSelectedRow } from "./ToolSelectedRow";
import { useToolName } from "./ToolsInput";

export function ToolCappedPickList({
  id,
  groupLabel,
  comboboxLabel,
  selectedKeys,
  maxCount,
  options,
  suggestedToolId,
  onAdd,
  onRemove,
}: {
  id: string;
  groupLabel: string;
  comboboxLabel: string;
  selectedKeys: ToolId[];
  maxCount: number;
  options: ToolId[];
  suggestedToolId?: ToolId | null;
  onAdd: (toolId: ToolId) => void;
  onRemove: (toolId: ToolId) => void;
}) {
  const { t } = useLocale();
  const toolName = useToolName();

  return (
    <CappedPickList
      id={id}
      groupLabel={groupLabel}
      comboboxLabel={comboboxLabel}
      options={options.map((toolId) => ({
        key: toolId,
        label:
          suggestedToolId === toolId
            ? t("character.suggestedTool", { name: toolName(toolId) })
            : toolName(toolId),
      }))}
      selectedKeys={selectedKeys}
      maxCount={maxCount}
      onAdd={(toolId) => onAdd(toolId as ToolId)}
      onRemove={(toolId) => onRemove(toolId as ToolId)}
      removeConfirmName={(toolId) => toolName(toolId as ToolId)}
      renderSelected={(toolId) => (
        <ToolSelectedRow toolId={toolId as ToolId} suggestedToolId={suggestedToolId} />
      )}
    />
  );
}
