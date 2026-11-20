import type { ToolId } from "../../data/toolStats";
import {
  ALL_TOOL_OPTIONS,
  availableToolOptions,
  backgroundToolGrantLabelProfile,
  backgroundToolOptions,
  backgroundToolSlotCount,
  classToolGrantLabelProfile,
  classToolOptions,
  classToolSlotCount,
  compactToolPicks,
  firstEmptyToolPickSlot,
  initialToolPicks,
  suggestedBackgroundTool,
  suggestedClassTool,
  toolPickSlotForId,
  type ToolGrantLabelProfile,
} from "../../domain/toolPicks";
import { isCustomBackground } from "../../domain/background";
import { useLocale } from "../../i18n/LocaleContext";
import { useCharacter } from "../../state/CharacterContext";
import { MusicalInstrumentCappedPickList } from "./MusicalInstrumentCappedPickList";
import { ToolCappedPickList } from "./ToolCappedPickList";
import styles from "./Form.module.css";

export function useToolName() {
  const { t } = useLocale();
  return (id: ToolId) => t(`rules.tool.${id}`);
}

function toolGrantGroupLabel(
  profile: ToolGrantLabelProfile,
  slotCount: number,
  singleKey: string,
  multipleKey: string,
  t: (key: string, params?: Record<string, string | number>) => string,
): string {
  switch (profile) {
    case "musicalInstrument":
      return slotCount === 1 ? t("character.musicalInstrument") : t("character.musicalInstruments");
    case "artisan":
      return slotCount === 1 ? t("character.artisansTool") : t("character.artisansTools");
    case "gamingSet":
      return slotCount === 1 ? t("character.gamingSet") : t("character.gamingSets");
    case "artisanOrMusicalInstrument":
      return t("character.artisansToolsOrMusicalInstrument");
    default:
      return slotCount === 1 ? t(singleKey) : t(multipleKey, { count: slotCount });
  }
}

function toolGrantSlotLabel(
  profile: ToolGrantLabelProfile,
  slotCount: number,
  index: number,
  fallbackKey: string,
  t: (key: string, params?: Record<string, string | number>) => string,
): string {
  switch (profile) {
    case "musicalInstrument":
      return t("character.musicalInstrument");
    case "artisan":
      return t("character.artisansTool");
    case "gamingSet":
      return t("character.gamingSet");
    case "artisanOrMusicalInstrument":
      return t("character.artisansToolsOrMusicalInstrument");
    default:
      return slotCount === 1 ? t(fallbackKey) : t("character.toolPick", { index: index + 1 });
  }
}

export function BackgroundToolsInput() {
  const { character, dispatch, derived } = useCharacter();
  const { t } = useLocale();
  const background = derived.backgroundData;
  const slotCount = backgroundToolSlotCount(background);
  const suggested = suggestedBackgroundTool(background);
  const labelProfile = backgroundToolGrantLabelProfile(background);
  const options = isCustomBackground(character.backgroundKey)
    ? ALL_TOOL_OPTIONS
    : backgroundToolOptions(background);

  if (!background) {
    return (
      <div className={styles.field}>
        <span className={styles.groupLabel}>{t("character.backgroundTools")}</span>
        <p className={styles.hint}>{t("character.chooseBackgroundForTools")}</p>
      </div>
    );
  }

  if (slotCount === 0) return null;

  const picks =
    character.backgroundToolPicks.length === slotCount
      ? character.backgroundToolPicks
      : initialToolPicks(slotCount);

  const selectedKeys = compactToolPicks(picks);
  const groupLabel =
    slotCount > 1
      ? t("character.backgroundToolsChoose", { count: slotCount })
      : t("character.backgroundTool");
  const comboboxLabel = toolGrantSlotLabel(
    labelProfile,
    slotCount,
    0,
    "character.backgroundTool",
    t,
  );

  return (
    <ToolCappedPickList
      id="background-tool-select"
      groupLabel={groupLabel}
      comboboxLabel={comboboxLabel}
      selectedKeys={selectedKeys}
      maxCount={slotCount}
      suggestedToolId={suggested}
      options={availableToolOptions(options, picks, [], -1)}
      onAdd={(toolId) => {
        const index = firstEmptyToolPickSlot(picks);
        if (index < 0) return;
        dispatch({ type: "SET_BACKGROUND_TOOL_PICK", index, tool: toolId });
      }}
      onRemove={(toolId) => {
        const index = toolPickSlotForId(picks, toolId);
        if (index < 0) return;
        dispatch({ type: "SET_BACKGROUND_TOOL_PICK", index, tool: null });
      }}
    />
  );
}

export function ClassToolsInput() {
  const { character, dispatch, derived } = useCharacter();
  const { t } = useLocale();
  const classData = derived.classData;
  const slotCount = classToolSlotCount(classData);
  const labelProfile = classToolGrantLabelProfile(classData);
  const options = classToolOptions(classData);

  if (!classData) {
    return (
      <div className={styles.field}>
        <span className={styles.groupLabel}>{t("character.classTools")}</span>
        <p className={styles.hint}>{t("character.chooseClassForTools")}</p>
      </div>
    );
  }

  if (slotCount === 0) return null;

  const picks =
    character.classToolPicks.length === slotCount ? character.classToolPicks : initialToolPicks(slotCount);

  if (labelProfile === "musicalInstrument" || labelProfile === "artisanOrMusicalInstrument") {
    const selectedKeys = compactToolPicks(picks);
    const cappedPickerProps = {
      selectedKeys,
      maxCount: slotCount,
      options: availableToolOptions(options, picks, [], -1),
      onAdd: (toolId: ToolId) => {
        const index = firstEmptyToolPickSlot(picks);
        if (index < 0) return;
        dispatch({ type: "SET_CLASS_TOOL_PICK", index, tool: toolId });
      },
      onRemove: (toolId: ToolId) => {
        const index = toolPickSlotForId(picks, toolId);
        if (index < 0) return;
        dispatch({ type: "SET_CLASS_TOOL_PICK", index, tool: null });
      },
    };

    if (labelProfile === "musicalInstrument") {
      return (
        <MusicalInstrumentCappedPickList
          id="class-musical-instrument-select"
          {...cappedPickerProps}
        />
      );
    }

    return (
      <ToolCappedPickList
        id="class-artisan-or-musical-instrument-select"
        groupLabel={t("character.artisansToolsOrMusicalInstrumentChoose", {
          count: selectedKeys.length,
          max: slotCount,
        })}
        comboboxLabel={t("character.artisansToolsOrMusicalInstrument")}
        {...cappedPickerProps}
      />
    );
  }

  const selectedKeys = compactToolPicks(picks);
  const groupLabel = toolGrantGroupLabel(
    labelProfile,
    slotCount,
    "character.classTool",
    "character.classToolsChoose",
    t,
  );
  const comboboxLabel = toolGrantSlotLabel(
    labelProfile,
    slotCount,
    0,
    "character.classTool",
    t,
  );

  return (
    <ToolCappedPickList
      id="class-tool-select"
      groupLabel={groupLabel}
      comboboxLabel={comboboxLabel}
      selectedKeys={selectedKeys}
      maxCount={slotCount}
      suggestedToolId={suggestedClassTool(classData, 0)}
      options={availableToolOptions(options, picks, [], -1)}
      onAdd={(toolId) => {
        const index = firstEmptyToolPickSlot(picks);
        if (index < 0) return;
        dispatch({ type: "SET_CLASS_TOOL_PICK", index, tool: toolId });
      }}
      onRemove={(toolId) => {
        const index = toolPickSlotForId(picks, toolId);
        if (index < 0) return;
        dispatch({ type: "SET_CLASS_TOOL_PICK", index, tool: null });
      }}
    />
  );
}
