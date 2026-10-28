import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { LandingPage } from './pages/LandingPage';
import { AppLayout } from './layouts/AppLayout';
import { Dashboard } from './pages/Dashboard';
import { MeetingsList } from './pages/MeetingsList';
import { UploadMeeting } from './pages/UploadMeeting';
import { MeetingDetails } from './pages/MeetingDetails';
import { ActionItems } from './pages/ActionItems';
import { HumanReview } from './pages/HumanReview';
import { AgentActivityPage } from './pages/AgentActivityPage';
import { AnalyticsPage } from './pages/AnalyticsPage';
import { SettingsPage } from './pages/SettingsPage';

export const App: React.FC = () => {
  return (
    <BrowserRouter>
      <Routes>
        {/* Landing Page with Hero */}
        <Route path="/" element={<LandingPage />} />

        {/* Dashboard and Core App Layout */}
        <Route element={<AppLayout />}>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/meetings" element={<MeetingsList />} />
          <Route path="/upload" element={<UploadMeeting />} />
          <Route path="/meetings/:id" element={<MeetingDetails />} />
          <Route path="/tasks" element={<ActionItems />} />
          <Route path="/review" element={<HumanReview />} />
          <Route path="/activity" element={<AgentActivityPage />} />
          <Route path="/analytics" element={<AnalyticsPage />} />
          <Route path="/settings" element={<SettingsPage />} />
        </Route>

        {/* Catch-all */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
};

export default App;
