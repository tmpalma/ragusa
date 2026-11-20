import { NavLink } from "react-router";
import { useLocale } from "../../i18n/LocaleContext";
import { useCharacter } from "../../state/CharacterContext";
import { visibleCharacterViews, type CharacterViewId } from "./characterViews";
import styles from "./CharacterViewChips.module.css";

interface CharacterViewChipsProps {
  activeViewId: CharacterViewId;
}

export function CharacterViewChips({ activeViewId }: CharacterViewChipsProps) {
  const { t } = useLocale();
  const { character } = useCharacter();
  const characterViews = visibleCharacterViews(character);

  return (
    <nav className={styles.chips} aria-label={t("app.viewSwitcherAriaLabel")}>
      {characterViews.map((view) => {
        const path = view.segment ? `/character/${view.segment}` : "/character";
        const selected = view.id === activeViewId;
        return (
          <NavLink
            key={view.id}
            to={path}
            end={view.segment === ""}
            className={selected ? `${styles.chip} ${styles.chipSelected}` : styles.chip}
            aria-current={selected ? "page" : undefined}
          >
            {t(`app.tab.${view.labelKey}`)}
          </NavLink>
        );
      })}
    </nav>
  );
}
