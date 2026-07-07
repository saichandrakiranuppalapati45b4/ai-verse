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
import LoginPage from "../pages/auth/LoginPage";
import NotFoundPage from "../pages/errors/NotFoundPage";

// Dashboards
import OrgDashboardPage from "../pages/organizer/OrgDashboardPage";
import FacDashboardPage from "../pages/faculty/FacDashboardPage";
import UserManagementPage from "../pages/faculty/UserManagementPage";
import OrganizerManagementPage from "../pages/faculty/OrganizerManagementPage";
import ContentManagementPage from "../pages/faculty/ContentManagementPage";
import EventManagementPage from "../pages/faculty/EventManagementPage";
import GalleryManagementPage from "../pages/faculty/GalleryManagementPage";
import AnnouncementManagementPage from "../pages/faculty/AnnouncementManagementPage";
import SettingsPage from "../pages/faculty/SettingsPage";
import RegistrationsManagementPage from "../pages/faculty/RegistrationsManagementPage";

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
        <Route path="404" element={<NotFoundPage />} />
      </Route>

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
        {/* Placeholder sub-routes for now */}
        <Route path="events" element={<div className="p-6 bg-white rounded-card shadow-card border border-slate-100"><h2 className="text-xl font-bold mb-2">Event Management</h2><p className="text-sm text-slate-500">Manage all event listing, creation, and updating.</p></div>} />
        <Route path="gallery" element={<div className="p-6 bg-white rounded-card shadow-card border border-slate-100"><h2 className="text-xl font-bold mb-2">Gallery Management</h2><p className="text-sm text-slate-500">Upload and album configure.</p></div>} />
        <Route path="team" element={<div className="p-6 bg-white rounded-card shadow-card border border-slate-100"><h2 className="text-xl font-bold mb-2">Team Management</h2><p className="text-sm text-slate-500">Manage committee positions and volunteers.</p></div>} />
        <Route path="announcements" element={<div className="p-6 bg-white rounded-card shadow-card border border-slate-100"><h2 className="text-xl font-bold mb-2">Announcements CRUD</h2><p className="text-sm text-slate-500">Pin updates and manage bulletins.</p></div>} />
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
        <Route path="content" element={<ContentManagementPage />} />
        <Route path="analytics" element={<div className="p-6 bg-white rounded-card shadow-card border border-slate-100"><h2 className="text-xl font-bold mb-2">Analytics</h2><p className="text-sm text-slate-500">Detailed overview of attendance trends.</p></div>} />
        <Route path="settings" element={<SettingsPage />} />
        <Route path="gallery" element={<GalleryManagementPage />} />
        <Route path="announcements" element={<AnnouncementManagementPage />} />
        <Route path="profile" element={<div className="p-6 bg-white rounded-card shadow-card border border-slate-100"><h2 className="text-xl font-bold mb-2">Faculty Profile</h2><p className="text-sm text-slate-500">Update coordinator credentials.</p></div>} />
      </Route>

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/404" replace />} />
    </Routes>
  );
};

export default AppRoutes;
