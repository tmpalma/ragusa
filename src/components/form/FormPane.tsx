import { ALIGNMENTS, BACKGROUNDS, DEITIES, SPECIES, findByKey } from "../../data";
import { catalogGroupLabel } from "../../data/catalogSelectLabel";
import { CUSTOM_BACKGROUND_KEY, isCustomBackground } from "../../domain/background";
import { pantheonLocaleKey } from "../../domain/deityFacts";
import { useLocale } from "../../i18n/LocaleContext";
import { useCharacter } from "../../state/CharacterContext";
import { ClassSection } from "./ClassSection";
import { Combobox } from "./Combobox";
import { DeityFacts } from "./DeityFacts";
import { FeatInput } from "./FeatInput";
import { FeatChoicesInput } from "./FeatChoicesInput";
import { HumanVersatileFeatInput } from "./HumanVersatileFeatInput";
import styles from "./Form.module.css";
import { SpeciesChoicesInput } from "./SpeciesChoicesInput";
import { LanguagesInput } from "./LanguagesInput";
import { BackgroundSkillsDisplay } from "./SkillsInput";
import { BackgroundToolsInput } from "./ToolsInput";
import { NewCharacterAction, PaneHeader } from "../rest/PaneRestActions";

export function FormPane() {
  const { character, dispatch } = useCharacter();
  const { t, tEntity } = useLocale();
  const selectedDeity = findByKey(DEITIES, character.deityKey);

  return (
    <div className={styles.pane}>
      <PaneHeader title={t("character.title")} actions={<NewCharacterAction />} />

      <ClassSection />

      <section className={styles.section}>
        <h3>{t("character.section.origins")}</h3>

        <div className={styles.subsection}>
          <h4 id="origins-background-heading">{t("character.background")}</h4>

          <Combobox
            id="background-select"
            label={t("character.background")}
            hideLabel
            labelledBy="origins-background-heading"
            value={character.backgroundKey}
            onChange={(key) => dispatch({ type: "SET_BACKGROUND", key })}
            options={[
              ...BACKGROUNDS.map((b) => {
                const name = tEntity("catalog.backgrounds", b.key, "name", b.name);
                return {
                  key: b.key,
                  group: catalogGroupLabel(b.book),
                  label: name,
                };
              }),
              { key: CUSTOM_BACKGROUND_KEY, label: t("character.customBackground") },
            ]}
          />

          {isCustomBackground(character.backgroundKey) ? (
            <div className={styles.field}>
              <label htmlFor="custom-background-name">{t("character.customBackgroundName")}</label>
              <input
                id="custom-background-name"
                type="text"
                value={character.customBackgroundName}
                onChange={(e) => dispatch({ type: "SET_CUSTOM_BACKGROUND_NAME", value: e.target.value })}
                placeholder={t("character.optional")}
              />
            </div>
          ) : null}

          <FeatInput />
          <FeatChoicesInput />
          <BackgroundSkillsDisplay />
          <BackgroundToolsInput />
        </div>

        <div className={styles.subsection}>
          <h4 id="origins-species-heading">{t("character.species")}</h4>

          <Combobox
            id="species-select"
            label={t("character.species")}
            hideLabel
            labelledBy="origins-species-heading"
            value={character.speciesKey}
            onChange={(key) => dispatch({ type: "SET_SPECIES", key })}
            options={SPECIES.map((s) => ({
              key: s.key,
              label: tEntity("catalog.species", s.key, "name", s.name),
            }))}
          />

          <SpeciesChoicesInput />
          <HumanVersatileFeatInput />
        </div>
      </section>

      <section className={styles.section}>
        <h3>{t("character.section.identity")}</h3>

        <div className={styles.identityGrid}>
          <div className={styles.identityDetails}>
            <div className={styles.field}>
              <label htmlFor="character-name">{t("character.characterName")}</label>
              <input
                id="character-name"
                type="text"
                value={character.name}
                onChange={(e) => dispatch({ type: "SET_NAME", value: e.target.value })}
              />
            </div>

            <Combobox
              id="alignment-select"
              label={t("character.alignment")}
              value={character.alignmentKey}
              onChange={(key) => {
                const defaultDescription =
                  tEntity(
                    "catalog.alignments",
                    key ?? "",
                    "description",
                    findByKey(ALIGNMENTS, key)?.description ?? "",
                  ) ?? "";
                dispatch({ type: "SET_ALIGNMENT", key, defaultDescription });
              }}
              options={ALIGNMENTS.map((a) => ({
                key: a.key,
                label: tEntity("catalog.alignments", a.key, "name", a.name),
              }))}
            />

            <div className={styles.field}>
              <label htmlFor="alignment-description">{t("character.alignmentDescription")}</label>
              <textarea
                id="alignment-description"
                rows={3}
                value={character.alignmentDescription}
                onChange={(e) => dispatch({ type: "SET_ALIGNMENT_DESCRIPTION", value: e.target.value })}
              />
            </div>

            <LanguagesInput />

            <Combobox
              id="deity-select"
              label={t("character.deity")}
              value={character.deityKey}
              onChange={(key) => dispatch({ type: "SET_DEITY", key })}
              options={DEITIES.map((deity) => ({
                key: deity.key,
                label: tEntity("catalog.deities", deity.key, "name", deity.name),
                group: t(pantheonLocaleKey(deity.pantheon), undefined, deity.pantheon),
              }))}
            >
              {selectedDeity ? <DeityFacts deity={selectedDeity} /> : null}
            </Combobox>
          </div>

          <div className={`${styles.field} ${styles.identityBackstory}`}>
            <label htmlFor="backstory">{t("character.backstory")}</label>
            <textarea
              id="backstory"
              rows={5}
              value={character.backstory}
              onChange={(e) => dispatch({ type: "SET_BACKSTORY", value: e.target.value })}
              placeholder={t("character.backstoryPlaceholder")}
            />
          </div>
        </div>
      </section>
    </div>
  );
}
