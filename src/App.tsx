import { BrowserRouter, Navigate, Route, Routes } from "react-router";
import { RequireSession } from "./components/auth/RequireSession";
import { PlaySessionGate } from "./components/auth/PlaySessionGate";
import { SkillConflictToast } from "./components/form/SkillConflictToast";
import { CachedCatalogBootToast } from "./components/toast/CachedCatalogBootToast";
import { AppShell } from "./components/nav/AppShell";
import { AccountPage } from "./pages/AccountPage";
import { CampaignPage } from "./pages/CampaignPage";
import { CharacterPage } from "./pages/CharacterPage";
import { LoginPage } from "./pages/LoginPage";
import { WelcomePage } from "./pages/WelcomePage";
import { setupLibraryClient } from "./platform/configureLibraryClient";
import { CampaignProvider } from "./state/CampaignContext";
import { CharacterProvider } from "./state/CharacterContext";
import { SessionProvider } from "./state/SessionContext";
import { TableRulesProvider } from "./state/TableRulesContext";

setupLibraryClient();

function App() {
  return (
    <BrowserRouter>
      <SessionProvider>
        <TableRulesProvider>
          <CharacterProvider>
            <CampaignProvider>
              <PlaySessionGate>
              <SkillConflictToast />
              <CachedCatalogBootToast />
              <Routes>
                <Route path="login" element={<LoginPage />} />
                <Route element={<RequireSession />}>
                  <Route element={<AppShell />}>
                    <Route index element={<WelcomePage />} />
                    <Route path="character">
                      <Route index element={<CharacterPage />} />
                      <Route path=":view" element={<CharacterPage />} />
                    </Route>
                    <Route path="campaign">
                      <Route index element={<Navigate to="party" replace />} />
                      <Route path=":view" element={<CampaignPage />} />
                    </Route>
                    <Route path="account" element={<AccountPage />} />
                    <Route path="*" element={<Navigate to="/" replace />} />
                  </Route>
                </Route>
              </Routes>
              </PlaySessionGate>
            </CampaignProvider>
          </CharacterProvider>
        </TableRulesProvider>
      </SessionProvider>
    </BrowserRouter>
  );
}

export default App;
