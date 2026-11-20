import type { ToolId } from "../../data/toolStats";
import { useLocale } from "../../i18n/LocaleContext";
import { ToolCappedPickList } from "./ToolCappedPickList";

export function MusicalInstrumentCappedPickList({
  id,
  selectedKeys,
  maxCount,
  options,
  onAdd,
  onRemove,
}: {
  id: string;
  selectedKeys: ToolId[];
  maxCount: number;
  options: ToolId[];
  onAdd: (toolId: ToolId) => void;
  onRemove: (toolId: ToolId) => void;
}) {
  const { t } = useLocale();

  return (
    <ToolCappedPickList
      id={id}
      groupLabel={t("character.musicalInstrumentsChoose", {
        count: selectedKeys.length,
        max: maxCount,
      })}
      comboboxLabel={t("character.musicalInstrument")}
      selectedKeys={selectedKeys}
      maxCount={maxCount}
      options={options}
      onAdd={onAdd}
      onRemove={onRemove}
    />
  );
}
