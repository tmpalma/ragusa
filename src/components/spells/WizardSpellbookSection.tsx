import type { ReactNode } from "react";
import {
  findSpellByKey,
  spellPickerLabel,
} from "../../domain/spellSelection";
import { useLocale } from "../../i18n/LocaleContext";
import { ConfirmRemoveButton } from "../confirm/ConfirmRemoveButton";
import formStyles from "../form/Form.module.css";
import { SpellCappedPickList } from "./SpellCappedPickList";
import styles from "./Spells.module.css";

function spellOptionLabel(
  spellKey: string,
  tEntity: ReturnType<typeof useLocale>["tEntity"],
  tGlossary: ReturnType<typeof useLocale>["tGlossary"],
): string {
  const spell = findSpellByKey(spellKey);
  const name = tEntity("catalog.spells", spellKey, "name", spell?.name ?? spellKey);
  if (!spell?.school) return name;
  return spellPickerLabel(name, tGlossary("spellSchool", spell.school));
}

function SpellbookSpellList({
  spellKeys,
  onRemove,
}: {
  spellKeys: string[];
  onRemove: (spellKey: string) => void;
}) {
  const { tEntity, tGlossary } = useLocale();
  if (spellKeys.length === 0) return null;

  return (
    <ul className={formStyles.itemList}>
      {spellKeys.map((spellKey) => (
        <li key={spellKey}>
          <div className={formStyles.itemListMain}>
            <span className={formStyles.itemListName}>
              {spellOptionLabel(spellKey, tEntity, tGlossary)}
            </span>
          </div>
          <div className={formStyles.itemListActions}>
            <ConfirmRemoveButton
              itemName={spellOptionLabel(spellKey, tEntity, tGlossary)}
              onConfirm={() => onRemove(spellKey)}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}

export interface WizardSpellbookSectionProps {
  id: string;
  progressionSpellKeys: string[];
  copiedSpellKeys: string[];
  copyOptions: string[];
  copyExcludeKeys: string[];
  onCopyAdd: (spellKey: string) => void;
  onRemove: (spellKey: string) => void;
  knownSpellsPicker?: ReactNode;
  subclassSavantPicker?: ReactNode;
}

export function WizardSpellbookSection({
  id,
  progressionSpellKeys,
  copiedSpellKeys,
  copyOptions,
  copyExcludeKeys,
  onCopyAdd,
  onRemove,
  knownSpellsPicker,
  subclassSavantPicker,
}: WizardSpellbookSectionProps) {
  const { t } = useLocale();

  return (
    <section className={styles.section}>
      <h3>{t("spells.spellbook")}</h3>
      {knownSpellsPicker}
      {subclassSavantPicker}
      <SpellbookSpellList spellKeys={progressionSpellKeys} onRemove={onRemove} />
      <SpellCappedPickList
        id={`${id}-copy`}
        showSelectedList={false}
        groupLabel={t("spells.copyToSpellbook")}
        comboboxLabel={t("spells.spell")}
        allowedOptions={copyOptions}
        selectedKeys={[]}
        excludeKeys={copyExcludeKeys}
        onAdd={onCopyAdd}
        onRemove={() => undefined}
      />
      <SpellbookSpellList spellKeys={copiedSpellKeys} onRemove={onRemove} />
    </section>
  );
}
