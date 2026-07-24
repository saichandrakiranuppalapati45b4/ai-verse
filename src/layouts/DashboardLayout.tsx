import React, { useState } from "react";
import { Outlet, Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { motion } from "framer-motion";
import {
  LayoutDashboard,
  Calendar,
  Image,
  Users,
  ClipboardList,
  LogOut,
  Settings,
  Menu,
  X,
  ChevronLeft,
  ChevronRight,
  Bell,
  ClipboardCheck
} from "lucide-react";

const DashboardLayout: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  if (!user) return null;

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  const menuItems = user.role === "organizer" ? [
    { path: "/organizer/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { path: "/organizer/events", label: "My Events", icon: Calendar },
    { path: "/organizer/attendance", label: "Attendance", icon: ClipboardCheck },
  ] : [
    { path: "/faculty/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { path: "/faculty/attendance", label: "Attendance", icon: ClipboardCheck },
    { path: "/faculty/users", label: "User Management", icon: Users },
    { path: "/faculty/team", label: "Organizers", icon: ClipboardList },
    { path: "/faculty/events", label: "Events", icon: Calendar },
    { path: "/faculty/registrations", label: "Registrations", icon: ClipboardList },
    { path: "/faculty/gallery", label: "Gallery", icon: Image },
    { path: "/faculty/settings", label: "Settings", icon: Settings },
  ];

  return (
    <div className="h-screen bg-slate-50 flex font-sans overflow-hidden">
      {/* Mobile Menu Backdrop */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-sm lg:hidden"
          onClick={() => setIsMobileOpen(false)}
        ></div>
      )}

      {/* Sidebar Container - Light themed bg-white */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex flex-col bg-white text-slate-600 border-r border-slate-200 transition-all duration-300 h-full
          ${isSidebarOpen ? "w-64" : "w-20"} 
          ${isMobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"} 
          lg:relative`}
      >
        {/* Sidebar Header with AI Club Logo */}
        <div className="h-16 flex items-center justify-between px-6 border-b border-slate-100 bg-white">
          <Link to="/" className="flex items-center gap-2 font-black text-[#2563EB] text-xl">
            {isSidebarOpen && (
              user.role === "organizer" ? (
                <div className="leading-tight text-left">
                  <span className="tracking-tight font-sans font-black block text-sm">AI Verse Club</span>
                  <span className="text-[8px] text-slate-400 font-bold uppercase tracking-wider block">Operational Hub</span>
                </div>
              ) : (
                <span className="tracking-tight font-sans">AI Verse</span>
              )
            )}
          </Link>
          <button
            onClick={() => setIsMobileOpen(false)}
            className="lg:hidden text-slate-400 hover:text-slate-600 p-1"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Sidebar Navigation */}
        <nav className="flex-grow py-6 px-3 space-y-1 overflow-y-auto">
          {menuItems.map((item, index) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={index}
                to={item.path}
                onClick={() => setIsMobileOpen(false)}
                className={`flex items-center gap-3 py-3 px-4 rounded-xl font-semibold text-sm transition-colors duration-200 group relative z-0
                  ${isActive
                    ? "text-white"
                    : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
                  }`}
              >
                {isActive && (
                  <motion.div
                    layoutId="activeTabIndicator"
                    className="absolute inset-0 bg-[#2563EB] rounded-xl shadow-md shadow-blue-600/10 -z-10"
                    initial={false}
                    transition={{ type: "spring", stiffness: 500, damping: 30 }}
                  />
                )}
                <Icon className={`relative z-10 h-5 w-5 shrink-0 transition-colors duration-200 ${isActive ? "text-white" : "text-slate-400 group-hover:text-slate-600"}`} />
                {isSidebarOpen ? (
                  <span className="relative z-10">{item.label}</span>
                ) : (
                  <span className="absolute left-full ml-2 px-2 py-1 bg-slate-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-50">
                    {item.label}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* Sidebar Footer with user profile card */}
        <div className="p-4 border-t border-slate-100 space-y-3 bg-white">
          <Link
            to={user.role === "faculty" ? "/faculty/profile" : "/organizer/profile"}
            className="flex items-center gap-3 p-2.5 bg-slate-50/80 rounded-2xl border border-slate-100 hover:bg-slate-100/50 hover:border-slate-200/60 cursor-pointer transition-all duration-200 block"
          >
            {user.image ? (
              <img
                src={user.image}
                alt={user.name || "User Avatar"}
                className="w-10 h-10 rounded-full object-cover border border-slate-200 shrink-0"
              />
            ) : (
              <div className="w-10 h-10 rounded-full bg-[#2563EB] text-white flex items-center justify-center font-bold text-xs shadow-sm border border-slate-200 shrink-0 font-sans">
                {(() => {
                  if (!user.name) return "AV";
                  const parts = user.name.trim().split(/\s+/);
                  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
                  return parts[0].substring(0, 2).toUpperCase();
                })()}
              </div>
            )}
            {isSidebarOpen && (
              <div className="text-left leading-tight">
                <div className="text-xs font-bold text-slate-800">
                  {user.name}
                </div>
                <div className="text-[9px] font-bold text-slate-400 mt-0.5 uppercase tracking-wide">
                  {user.displayRole || (user.role === "organizer" ? "Senior Coordinator" : "Faculty Advisor")}
                </div>
              </div>
            )}
          </Link>

          <button
            onClick={handleLogout}
            className="flex items-center gap-3 w-full py-2.5 px-4 hover:bg-red-50 hover:text-red-600 text-slate-500 rounded-xl text-sm font-semibold transition-all"
          >
            <LogOut className="h-5 w-5 shrink-0" />
            {isSidebarOpen && <span>Logout</span>}
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-grow flex flex-col min-w-0 h-full overflow-y-auto">
        {/* Topbar / Header */}
        <header className="h-14 flex items-center justify-between px-4 sm:px-6 lg:px-8 sticky top-0 z-30 bg-slate-50/80 backdrop-blur-md">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setIsMobileOpen(true)}
              className="lg:hidden p-2 hover:bg-slate-50 rounded-lg text-slate-500"
            >
              <Menu className="h-5 w-5" />
            </button>

            {/* Sidebar toggle button for desktop */}
            <button
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="hidden lg:flex p-1.5 hover:bg-slate-50 rounded-lg text-slate-400 hover:text-slate-600 transition-colors"
            >
              {isSidebarOpen ? <ChevronLeft className="h-5 w-5" /> : <ChevronRight className="h-5 w-5" />}
            </button>
          </div>

          <div className="flex items-center gap-3 sm:gap-5">
            {/* Notification Bell with red dot */}
            <button className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-xl relative transition-colors">
              <Bell className="h-5 w-5 animate-none" />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full border-2 border-white"></span>
            </button>

            {/* Status indicator badge */}
            <div className="flex items-center gap-1.5 px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-full bg-[#E6F9F0] text-[#10B981] border border-[#B3F3D2]/30 text-[10px] sm:text-xs font-bold font-sans shrink-0">
              <span className="w-1.5 h-1.5 rounded-full bg-[#10B981] animate-pulse"></span>
              <span className="hidden sm:inline">Al Verse <span className="uppercase text-[9px] opacity-80">Online</span></span>
              <span className="inline sm:hidden uppercase text-[9px] opacity-80">Online</span>
            </div>

            {/* Profile Avatar / Circle */}
            <div className="flex items-center gap-3 animate-in fade-in duration-200">
              <div className="text-right hidden sm:block leading-tight text-left">
                <div className="text-xs font-bold text-slate-800">{user.name}</div>
                <div className="text-[9px] font-bold text-slate-400 mt-0.5 uppercase tracking-wide">
                  {user.displayRole || (user.role === "organizer" ? "Senior Coordinator" : "Faculty Advisor")}
                </div>
              </div>
              {user.image ? (
                <img
                  src={user.image}
                  alt={user.name || "User Avatar"}
                  className="w-10 h-10 rounded-full object-cover border border-slate-200 shadow-md shrink-0"
                />
              ) : (
                <div className="w-10 h-10 rounded-full bg-[#2563EB] text-white flex items-center justify-center font-bold text-sm shadow-md border border-white shrink-0 font-sans">
                  {(() => {
                    if (!user.name) return "AV";
                    const parts = user.name.trim().split(/\s+/);
                    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
                    return parts[0].substring(0, 2).toUpperCase();
                  })()}
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Content Outlet */}
        <main className="flex-grow p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto bg-slate-50/50">
          <Outlet />
        </main>

        {/* Dashboard Footer */}
        <footer className="py-5 border-t border-slate-100 bg-white text-center text-xs text-slate-400 font-medium">
          © 2026 AI Verse. Precise Innovation.
        </footer>
      </div>
    </div>
  );
};

export default DashboardLayout;
