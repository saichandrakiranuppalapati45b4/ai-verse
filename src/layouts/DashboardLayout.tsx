import React, { useState } from "react";
import { Outlet, Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
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
  Network,
  Megaphone,
  FileText
} from "lucide-react";
import riyaImg from "../assets/images/riya.png";

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

  const menuItems = [
    { path: "/faculty/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { path: "/faculty/users", label: "User Management", icon: Users },
    { path: "/faculty/team", label: "Organizers", icon: ClipboardList },
    { path: "/faculty/content", label: "Content", icon: FileText },
    { path: "/faculty/events", label: "Events", icon: Calendar },
    { path: "/faculty/registrations", label: "Registrations", icon: ClipboardList },
    { path: "/faculty/gallery", label: "Gallery", icon: Image },
    { path: "/faculty/announcements", label: "Announcements", icon: Megaphone },
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
            <Network className="h-6 w-6 text-[#2563EB] shrink-0" />
            {isSidebarOpen && <span className="tracking-tight font-sans">AI Verse</span>}
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
                className={`flex items-center gap-3 py-3 px-4 rounded-xl font-semibold text-sm transition-all duration-200 group relative
                  ${isActive 
                    ? "bg-[#2563EB] text-white shadow-md shadow-blue-600/10" 
                    : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
                  }`}
              >
                <Icon className={`h-5 w-5 shrink-0 ${isActive ? "text-white" : "text-slate-400 group-hover:text-slate-600"}`} />
                {isSidebarOpen ? (
                  <span>{item.label}</span>
                ) : (
                  <span className="absolute left-full ml-2 px-2 py-1 bg-slate-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-50">
                    {item.label}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* Sidebar Footer with Dr. Sarah Chen profile card */}
        <div className="p-4 border-t border-slate-100 space-y-3 bg-white">
          <div className="flex items-center gap-3 p-2.5 bg-slate-50/80 rounded-2xl border border-slate-100">
            <img 
              src={riyaImg} 
              alt="Dr. Sarah Chen" 
              className="w-10 h-10 rounded-full object-cover border border-slate-200 shrink-0" 
            />
            {isSidebarOpen && (
              <div className="text-left leading-tight">
                <div className="text-xs font-bold text-slate-800">Dr. Sarah Chen</div>
                <div className="text-[9px] font-bold text-slate-400 mt-0.5 uppercase tracking-wide">Faculty Advisor</div>
              </div>
            )}
          </div>

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
        {/* Topbar / Header in mockup */}
        <header className="h-16 bg-white border-b border-slate-100 flex items-center justify-between px-8 sticky top-0 z-30">
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

          <div className="flex items-center gap-5">
            {/* Notification Bell with red dot */}
            <button className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-xl relative transition-colors">
              <Bell className="h-5 w-5" />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full border-2 border-white"></span>
            </button>

            {/* Status indicator badge */}
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#E6F9F0] text-[#10B981] border border-[#B3F3D2]/30 text-xs font-bold font-sans">
              <span className="w-1.5 h-1.5 rounded-full bg-[#10B981] animate-pulse"></span>
              Al Verse <span className="uppercase text-[9px] opacity-80">Online</span>
            </div>

            {/* Admin Profile Circle */}
            <div className="w-10 h-10 rounded-full bg-[#2563EB] text-white flex items-center justify-center font-bold text-sm shadow-md border border-white shrink-0 font-sans">
              AD
            </div>
          </div>
        </header>

        {/* Content Outlet */}
        <main className="flex-grow p-6 sm:p-8 max-w-7xl w-full mx-auto bg-slate-50/50">
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
