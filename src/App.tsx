import { BrowserRouter, Route, Routes } from "react-router-dom";

import { AlertsPage } from "@/components/alerts/AlertsPage";
import { ChatPage } from "@/components/chat/ChatPage";
import { DashboardPage } from "@/components/dashboard/DashboardPage";
import { GoalPage } from "@/components/goal/GoalPage";
import { HistoryPage } from "@/components/history/HistoryPage";
import { AppShell } from "@/components/layout/AppShell";
import { MusicPage } from "@/components/music/MusicPage";
import { OverlayPage as OverlaySetupPage } from "@/components/overlay/OverlayPage";
import { SettingsPage } from "@/components/settings/SettingsPage";
import { OverlayPage } from "@/overlay/OverlayPage";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* The OBS browser source. Outside the shell: no chrome, no toaster,
            no splash - the team ident must never land on stream. */}
        <Route path="/overlay" element={<OverlayPage />} />

        <Route element={<AppShell />}>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/history" element={<HistoryPage />} />
          <Route path="/alerts" element={<AlertsPage />} />
          <Route path="/overlay-setup" element={<OverlaySetupPage />} />
          <Route path="/music" element={<MusicPage />} />
          <Route path="/goal" element={<GoalPage />} />
          <Route path="/chat" element={<ChatPage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="*" element={<DashboardPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
