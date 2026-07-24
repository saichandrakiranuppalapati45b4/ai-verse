import React from "react";
import StatsGrid from "../../components/dashboard/StatsGrid";
import QuickControls from "../../components/dashboard/QuickControls";
import NewOrganizers from "../../components/dashboard/NewOrganizers";
import RecentActivities from "../../components/dashboard/RecentActivities";
import GrowthAnalytics from "../../components/dashboard/GrowthAnalytics";
import SEO from "../../components/layout/SEO";

const FacDashboardPage: React.FC = () => {
  return (
    <div className="space-y-6 text-left">
      <SEO 
        title="Faculty Dashboard - Admin Portal" 
        description="Faculty coordinator workspace for student organizer approvals, event scheduling, and member growth analytics." 
        keywords="AI Verse Faculty Dashboard, Student Approvals Workspace"
      />
      {/* Title Header */}
      <div className="mb-4">
        <h1 className="text-4xl font-extrabold bg-clip-text text-transparent bg-gradient-to-r from-slate-800 to-[#2563EB] tracking-tight font-sans">Faculty Dashboard</h1>
        <p className="text-slate-500 text-sm mt-2 font-medium">Welcome back, Admin. Here is your overview for today.</p>
      </div>

      {/* Row 1: Summary Cards Grid */}
      <StatsGrid />

      {/* Row 2: Quick Controls + New Organizers (Left) & Recent Activities (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        
        {/* Left Column (40% / 5 grid cols) */}
        <div className="lg:col-span-5 flex flex-col gap-6">
          <div className="flex-1">
            <QuickControls />
          </div>
          <div className="flex-1">
            <NewOrganizers />
          </div>
        </div>

        {/* Right Column (60% / 7 grid cols) */}
        <div className="lg:col-span-7 h-full">
          <RecentActivities />
        </div>

      </div>

      {/* Row 3: Growth Analytics Chart */}
      <GrowthAnalytics />

    </div>
  );
};

export default FacDashboardPage;
