import React from "react";
import SEO from "../../components/layout/SEO";

const OrgDashboardPage: React.FC = () => {
  return (
    <div className="space-y-6">
      <SEO 
        title="Organizer Dashboard - Portal" 
        description="Workspace for student organizers to manage hackathons, workshops, announcements, and registrations."
        keywords="AI Verse Organizer Dashboard, Member Management, Event Planning"
      />
      <div>
        <h1 className="text-3xl font-extrabold text-aether-dark">Organizer Dashboard</h1>
        <p className="text-slate-500 text-sm mt-1">Manage events, registrations, updates, and members.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-card shadow-card border border-slate-100">
          <div className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Total Events</div>
          <div className="text-3xl font-bold mt-2 text-aether-dark">12</div>
        </div>
        <div className="bg-white p-6 rounded-card shadow-card border border-slate-100">
          <div className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Registrations</div>
          <div className="text-3xl font-bold mt-2 text-aether-dark">2,500+</div>
        </div>
        <div className="bg-white p-6 rounded-card shadow-card border border-slate-100">
          <div className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Gallery Images</div>
          <div className="text-3xl font-bold mt-2 text-aether-dark">148</div>
        </div>
        <div className="bg-white p-6 rounded-card shadow-card border border-slate-100">
          <div className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Announcements</div>
          <div className="text-3xl font-bold mt-2 text-aether-dark">8</div>
        </div>
      </div>
    </div>
  );
};

export default OrgDashboardPage;
