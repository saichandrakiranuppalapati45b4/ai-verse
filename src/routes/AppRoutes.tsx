import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import PublicLayout from "../layouts/PublicLayout";
import DashboardLayout from "../layouts/DashboardLayout";
import ProtectedRoute from "./ProtectedRoute";

// Public Pages
import HomePage from "../pages/public/HomePage";
import AboutPage from "../pages/public/AboutPage";
import EventsPage from "../pages/public/EventsPage";
import EventDetailsPage from "../pages/public/EventDetailsPage";
import GalleryPage from "../pages/public/GalleryPage";
import TeamPage from "../pages/public/TeamPage";
import ContactPage from "../pages/public/ContactPage";
import RegistrationPage from "../pages/public/RegistrationPage";
import TicketPage from "../pages/public/TicketPage";
import LoginPage from "../pages/auth/LoginPage";
import AdminSetupPage from "../pages/auth/AdminSetupPage";
import NotFoundPage from "../pages/errors/NotFoundPage";

// Dashboards
import OrgDashboardPage from "../pages/organizer/OrgDashboardPage";
import OrgEventsPage from "../pages/organizer/OrgEventsPage";
import OrgAttendancePage from "../pages/organizer/OrgAttendancePage";
import FacDashboardPage from "../pages/faculty/FacDashboardPage";
import UserManagementPage from "../pages/faculty/UserManagementPage";
import OrganizerManagementPage from "../pages/faculty/OrganizerManagementPage";
import EventManagementPage from "../pages/faculty/EventManagementPage";
import GalleryManagementPage from "../pages/faculty/GalleryManagementPage";
import SettingsPage from "../pages/faculty/SettingsPage";
import RegistrationsManagementPage from "../pages/faculty/RegistrationsManagementPage";
import AttendanceManagementPage from "../pages/faculty/AttendanceManagementPage";
import ProfilePage from "../pages/faculty/ProfilePage";

const AppRoutes: React.FC = () => {
  return (
    <Routes>
      {/* Public Routes */}
      <Route path="/" element={<PublicLayout />}>
        <Route index element={<HomePage />} />
        <Route path="about" element={<AboutPage />} />
        <Route path="events" element={<EventsPage />} />
        <Route path="events/:id" element={<EventDetailsPage />} />
        <Route path="events/:id/register" element={<RegistrationPage />} />
        <Route path="gallery" element={<GalleryPage />} />
        <Route path="team" element={<TeamPage />} />
        <Route path="contact" element={<ContactPage />} />
        <Route path="login" element={<LoginPage />} />
        <Route path="admin-setup" element={<AdminSetupPage />} />
        <Route path="404" element={<NotFoundPage />} />
      </Route>

      <Route path="/ticket/:registrationId" element={<TicketPage />} />

      {/* Organizer Routes */}
      <Route
        path="/organizer"
        element={
          <ProtectedRoute allowedRoles={["organizer"]}>
            <DashboardLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="/organizer/dashboard" replace />} />
        <Route path="dashboard" element={<OrgDashboardPage />} />
        <Route path="events" element={<OrgEventsPage />} />
        <Route path="attendance" element={<OrgAttendancePage />} />
        <Route path="gallery" element={<div className="p-6 bg-white rounded-card shadow-card border border-slate-100"><h2 className="text-xl font-bold mb-2">Gallery Management</h2><p className="text-sm text-slate-500">Upload and album configure.</p></div>} />
        <Route path="registrations" element={<div className="p-6 bg-white rounded-card shadow-card border border-slate-100"><h2 className="text-xl font-bold mb-2">Registrations</h2><p className="text-sm text-slate-500">View and export registrant records.</p></div>} />
        <Route path="profile" element={<div className="p-6 bg-white rounded-card shadow-card border border-slate-100"><h2 className="text-xl font-bold mb-2">Profile Settings</h2><p className="text-sm text-slate-500">Update organizer credentials.</p></div>} />
      </Route>

      {/* Faculty Routes */}
      <Route
        path="/faculty"
        element={
          <ProtectedRoute allowedRoles={["faculty"]}>
            <DashboardLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="/faculty/dashboard" replace />} />
        <Route path="dashboard" element={<FacDashboardPage />} />
        <Route path="events" element={<EventManagementPage />} />
        <Route path="registrations" element={<RegistrationsManagementPage />} />
        <Route path="team" element={<OrganizerManagementPage />} />
        <Route path="users" element={<UserManagementPage />} />
        <Route path="attendance" element={<AttendanceManagementPage />} />
        <Route path="analytics" element={<div className="p-6 bg-white rounded-card shadow-card border border-slate-100"><h2 className="text-xl font-bold mb-2">Analytics</h2><p className="text-sm text-slate-500">Detailed overview of attendance trends.</p></div>} />
        <Route path="settings" element={<SettingsPage />} />
        <Route path="gallery" element={<GalleryManagementPage />} />
        <Route path="profile" element={<ProfilePage />} />
      </Route>

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/404" replace />} />
    </Routes>
  );
};

export default AppRoutes;
