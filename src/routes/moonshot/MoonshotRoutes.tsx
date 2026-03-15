import { lazy } from "react";
import { Navigate, Route, Routes } from "react-router-dom";

const MoonshotLayout = lazy(() => import("@/features/admin/moonshot/MoonshotLayout"));
const MoonshotDashboardPage = lazy(() => import("@/pages/admin/moonshot/MoonshotDashboardPage"));
const MoonshotWorkspacePage = lazy(() => import("@/pages/admin/moonshot/MoonshotWorkspacePage"));
const MoonshotMeetingsPage = lazy(() => import("@/pages/admin/moonshot/MoonshotMeetingsPage"));
const MoonshotNewMeetingPage = lazy(() => import("@/pages/admin/moonshot/MoonshotNewMeetingPage"));
const MoonshotMeetingDetailPage = lazy(() => import("@/pages/admin/moonshot/MoonshotMeetingDetailPage"));
const MoonshotScorecardsPage = lazy(() => import("@/pages/admin/moonshot/MoonshotScorecardsPage"));
const MoonshotRocksPage = lazy(() => import("@/pages/admin/moonshot/MoonshotRocksPage"));
const MoonshotTodosPage = lazy(() => import("@/pages/admin/moonshot/MoonshotTodosPage"));
const MoonshotIssuesPage = lazy(() => import("@/pages/admin/moonshot/MoonshotIssuesPage"));
const MoonshotBusinessPlanPage = lazy(() => import("@/pages/admin/moonshot/MoonshotBusinessPlanPage"));
const MoonshotToolsPage = lazy(() => import("@/pages/admin/moonshot/MoonshotToolsPage"));
const MoonshotUsersPage = lazy(() => import("@/pages/admin/moonshot/MoonshotUsersPage"));
const MoonshotPlaceholderPage = lazy(() => import("@/pages/admin/moonshot/MoonshotPlaceholderPage"));
const MoonshotResourcesPage = lazy(() => import("@/pages/admin/moonshot/MoonshotResourcesPage"));
const MoonshotSettingsPage = lazy(() => import("@/pages/admin/moonshot/MoonshotSettingsPage"));
const MoonshotOrgChartPage = lazy(() => import("@/pages/admin/moonshot/MoonshotOrgChartPage"));
const MoonshotOneOnOnesPage = lazy(() => import("@/pages/admin/moonshot/MoonshotOneOnOnesPage"));
const MoonshotRightPersonRightSeatPage = lazy(() => import("@/pages/admin/moonshot/MoonshotRightPersonRightSeatPage"));

const MoonshotRoutes = () => (
  <Routes>
    <Route element={<MoonshotLayout />}>
      <Route index element={<Navigate to="dashboard" replace />} />
      <Route path="dashboard" element={<MoonshotDashboardPage />} />
      <Route path="workspace" element={<MoonshotWorkspacePage />} />
      <Route path="meetings" element={<MoonshotMeetingsPage />} />
      <Route path="meetings/new" element={<MoonshotNewMeetingPage />} />
      <Route path="meetings/:meetingId" element={<MoonshotMeetingDetailPage />} />
      <Route path="scorecards" element={<MoonshotScorecardsPage />} />
      <Route path="rocks" element={<MoonshotRocksPage />} />
      <Route path="todos" element={<MoonshotTodosPage />} />
      <Route path="issues" element={<MoonshotIssuesPage />} />
      <Route path="business-plan" element={<MoonshotBusinessPlanPage />} />
      <Route path="tools" element={<MoonshotToolsPage />} />
      <Route path="tools/org-chart" element={<MoonshotOrgChartPage />} />
      <Route path="tools/one-on-ones" element={<MoonshotOneOnOnesPage />} />
      <Route path="tools/right-person-right-seat" element={<MoonshotRightPersonRightSeatPage />} />
      <Route path="users" element={<MoonshotUsersPage />} />
      <Route path="resources" element={<MoonshotResourcesPage />} />
      <Route path="settings" element={<MoonshotSettingsPage />} />
      <Route path="feedback" element={<MoonshotPlaceholderPage title="Thanks! Feedback form coming soon" />} />
      <Route path="*" element={<Navigate to="dashboard" replace />} />
    </Route>
  </Routes>
);

export default MoonshotRoutes;
