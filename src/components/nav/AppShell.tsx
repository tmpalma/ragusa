import { useCallback, useEffect, useRef, useState } from "react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router";
import { useLocale } from "../../i18n/LocaleContext";
import { useBackOverlay } from "../../platform/useBackOverlay";
import { useSession } from "../../state/SessionContext";
import { CAMPAIGN_VIEWS, isCampaignRoute } from "./campaignViews";
import { visibleCharacterViews, isCharacterRoute } from "./characterViews";
import { useCharacter } from "../../state/CharacterContext";
import { LanguageSwitcher } from "./LanguageSwitcher";
import { MeasurementSwitcher } from "./MeasurementSwitcher";
import styles from "./AppShell.module.css";

interface SidebarNavProps {
  onNavigate?: () => void;
}

function SidebarNav({ onNavigate }: SidebarNavProps) {
  const { t } = useLocale();
  const { character } = useCharacter();
  const characterViews = visibleCharacterViews(character);
  const navigate = useNavigate();
  const { endSession } = useSession();
  const location = useLocation();
  const onCharacterRoute = isCharacterRoute(location.pathname);
  const onCampaignRoute = isCampaignRoute(location.pathname);

  function signOut() {
    onNavigate?.();
    void endSession("manual").then(() => {
      navigate("/login", { replace: true });
    });
  }

  function navLinkClass(isActive: boolean) {
    return isActive ? `${styles.navLink} ${styles.navLinkActive}` : styles.navLink;
  }

  function viewLinkClass(isActive: boolean) {
    return isActive ? `${styles.viewLink} ${styles.viewLinkActive}` : styles.viewLink;
  }

  return (
    <nav className={styles.nav} aria-label={t("app.sidebarAriaLabel")}>
      <NavLink to="/" end className={({ isActive }) => navLinkClass(isActive)} onClick={onNavigate}>
        {t("app.sidebar.home")}
      </NavLink>

      <div className={styles.section}>
        <p id="sidebar-character-group" className={`${styles.navLink} ${styles.sectionLabel}`}>
          {t("app.mode.character")}
        </p>
        <ul className={styles.viewList} aria-labelledby="sidebar-character-group">
          {characterViews.map((view) => {
            const path = view.segment ? `/character/${view.segment}` : "/character";
            return (
              <li key={view.id}>
                <NavLink
                  to={path}
                  end={view.segment === ""}
                  className={({ isActive }) => viewLinkClass(isActive)}
                  onClick={onNavigate}
                  aria-current={onCharacterRoute && location.pathname === path ? "page" : undefined}
                >
                  {t(`app.tab.${view.labelKey}`)}
                </NavLink>
              </li>
            );
          })}
        </ul>
      </div>

      <div className={styles.section}>
        <p id="sidebar-campaign-group" className={`${styles.navLink} ${styles.sectionLabel}`}>
          {t("app.mode.campaign")}
        </p>
        <ul className={styles.viewList} aria-labelledby="sidebar-campaign-group">
          {CAMPAIGN_VIEWS.map((view) => {
            const path = `/campaign/${view.segment}`;
            return (
              <li key={view.id}>
                <NavLink
                  to={path}
                  className={({ isActive }) => viewLinkClass(isActive)}
                  onClick={onNavigate}
                  aria-current={onCampaignRoute && location.pathname === path ? "page" : undefined}
                >
                  {t(`app.tab.${view.labelKey}`)}
                </NavLink>
              </li>
            );
          })}
        </ul>
      </div>

      <div className={styles.section}>
        <p id="sidebar-account-group" className={`${styles.navLink} ${styles.sectionLabel}`}>
          {t("app.mode.account")}
        </p>
        <ul className={styles.viewList} aria-labelledby="sidebar-account-group">
          <li>
            <NavLink
              to="/account"
              className={({ isActive }) => viewLinkClass(isActive)}
              onClick={onNavigate}
            >
              {t("account.title")}
            </NavLink>
          </li>
          <li>
            <button type="button" className={`${styles.viewLink} ${styles.viewLinkButton}`} onClick={signOut}>
              {t("app.sidebar.signOut")}
            </button>
          </li>
        </ul>
      </div>
    </nav>
  );
}

export function AppShell() {
  const { t } = useLocale();
  const location = useLocation();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const menuToggleRef = useRef<HTMLButtonElement | null>(null);

  const closeDrawer = useCallback(() => {
    setDrawerOpen(false);
  }, []);

  useBackOverlay(drawerOpen, closeDrawer);

  useEffect(() => {
    closeDrawer();
  }, [location.pathname, closeDrawer]);

  useEffect(() => {
    if (!drawerOpen) return;

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        closeDrawer();
        menuToggleRef.current?.focus();
      }
    }

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [drawerOpen]);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(min-width: 720px)");

    function handleChange() {
      if (mediaQuery.matches) closeDrawer();
    }

    mediaQuery.addEventListener("change", handleChange);
    return () => mediaQuery.removeEventListener("change", handleChange);
  }, []);

  useEffect(() => {
    if (!drawerOpen) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [drawerOpen]);

  return (
    <div className={styles.shell}>
      {drawerOpen ? (
        <button
          type="button"
          className={styles.backdrop}
          onClick={closeDrawer}
          tabIndex={-1}
          aria-hidden="true"
        />
      ) : null}

      <aside
        id="app-sidebar"
        className={drawerOpen ? `${styles.sidebar} ${styles.sidebarOpen}` : styles.sidebar}
      >
        <div className={styles.sidebarHeader}>
          <p className={styles.toolsetTitle}>{t("app.toolsetTitle")}</p>
        </div>
        <SidebarNav onNavigate={closeDrawer} />
        <div className={styles.sidebarFooter}>
          <LanguageSwitcher />
          <MeasurementSwitcher />
        </div>
      </aside>

      <div className={styles.main}>
        <header className={styles.mobileTopBar}>
          <button
            ref={menuToggleRef}
            type="button"
            className={drawerOpen ? `${styles.menuToggle} ${styles.menuToggleOpen}` : styles.menuToggle}
            aria-expanded={drawerOpen}
            aria-controls="app-sidebar"
            aria-label={drawerOpen ? t("app.menuClose") : t("app.menuOpen")}
            onClick={() => setDrawerOpen((open) => !open)}
          >
            <span className={styles.menuIcon} aria-hidden="true" />
          </button>
          <span className={styles.mobileTitle}>{t("app.toolsetTitle")}</span>
        </header>
        <div className={styles.mainContent}>
          <Outlet />
        </div>
      </div>
    </div>
  );
}
