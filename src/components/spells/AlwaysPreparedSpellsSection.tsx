import { useMemo } from "react";
import { SPELLS } from "../../data";
import { findSpellByKey } from "../../domain/spellSelection";
import { useLocale } from "../../i18n/LocaleContext";
import { useCharacter } from "../../state/CharacterContext";
import { CollapsiblePane } from "../CollapsiblePane";
import { SpellCappedPickList } from "./SpellCappedPickList";
import styles from "./Spells.module.css";

export function AlwaysPreparedSpellsSection() {
  const { character, dispatch } = useCharacter();
  const { t } = useLocale();

  const { cantripKeys, leveledKeys } = useMemo(() => {
    const cantrips: string[] = [];
    const leveled: string[] = [];
    for (const spell of SPELLS) {
      if (spell.level === 0) {
        cantrips.push(spell.key);
      } else {
        leveled.push(spell.key);
      }
    }
    return { cantripKeys: cantrips, leveledKeys: leveled };
  }, []);

  const selectedCantrips = useMemo(
    () => character.alwaysPreparedSpellPicks.filter((key) => findSpellByKey(key)?.level === 0),
    [character.alwaysPreparedSpellPicks],
  );
  const selectedLeveled = useMemo(
    () => character.alwaysPreparedSpellPicks.filter((key) => (findSpellByKey(key)?.level ?? 0) > 0),
    [character.alwaysPreparedSpellPicks],
  );

  const addPick = (spellKey: string) => dispatch({ type: "ADD_ALWAYS_PREPARED_SPELL_PICK", spellKey });
  const removePick = (spellKey: string) =>
    dispatch({ type: "REMOVE_ALWAYS_PREPARED_SPELL_PICK", spellKey });

  return (
    <section className={`${styles.section} ${styles.alwaysPreparedSpellsSection}`}>
      <CollapsiblePane
        title={<h3>{t("spells.alwaysPreparedSpells", undefined, "Always Prepared Spells")}</h3>}
      >
        <div className={styles.alwaysPreparedPickStack}>
          <SpellCappedPickList
            id="always-prepared-cantrip-pick"
            groupLabel={t("spells.chooseAlwaysPreparedCantrips", undefined, "Cantrips")}
            comboboxLabel={t("spells.cantrip")}
            allowedOptions={cantripKeys}
            selectedKeys={selectedCantrips}
            showSelectedList
            stackedAddRow
            groupLabelClassName={styles.alwaysPreparedPickGroupLabel}
            onAdd={addPick}
            onRemove={removePick}
          />
          <SpellCappedPickList
            id="always-prepared-spell-pick"
            groupLabel={t("spells.chooseAlwaysPreparedSpells", undefined, "Spells")}
            comboboxLabel={t("spells.alwaysPreparedSpell", undefined, "Spell")}
            allowedOptions={leveledKeys}
            selectedKeys={selectedLeveled}
            showSelectedList
            stackedAddRow
            groupLabelClassName={styles.alwaysPreparedPickGroupLabel}
            levelFilterClassName={styles.alwaysPreparedLevelFilter}
            onAdd={addPick}
            onRemove={removePick}
          />
        </div>
      </CollapsiblePane>
    </section>
  );
}