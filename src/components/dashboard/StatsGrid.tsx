import React from "react";
import { Users, Calendar, UserPlus, Image, ArrowUp } from "lucide-react";

export const StatsGrid: React.FC = () => {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      
      {/* Stat Card 1: Total Members */}
      <div className="bg-white rounded-2xl border border-slate-100 p-4 shadow-[0_8px_30px_rgba(0,0,0,0.015)] flex flex-col justify-between text-left">
        <div className="flex items-center justify-between">
          <div className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600 shadow-inner">
            <Users className="h-4.5 w-4.5" />
          </div>
          <span className="flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#E6F9F0] text-[#10B981]">
            <ArrowUp className="h-2.5 w-2.5 stroke-[3]" />
            12%
          </span>
        </div>
        <div className="mt-3">
          <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Total Members</span>
          <h3 className="text-2xl font-extrabold text-slate-800 tracking-tight mt-1">1,284</h3>
        </div>
      </div>

      {/* Stat Card 2: Active Events */}
      <div className="bg-white rounded-2xl border border-slate-100 p-4 shadow-[0_8px_30px_rgba(0,0,0,0.015)] flex flex-col justify-between text-left">
        <div className="flex items-center justify-between">
          <div className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600 shadow-inner">
            <Calendar className="h-4.5 w-4.5" />
          </div>
          <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-[#E6F9F0] text-[#10B981] uppercase tracking-wider border border-[#B3F3D2]/40">
            Active
          </span>
        </div>
        <div className="mt-3">
          <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Active Events</span>
          <h3 className="text-2xl font-extrabold text-slate-800 tracking-tight mt-1">8</h3>
        </div>
      </div>

      {/* Stat Card 3: Registration Queue */}
      <div className="bg-white rounded-2xl border border-slate-100 p-4 shadow-[0_8px_30px_rgba(0,0,0,0.015)] flex flex-col justify-between text-left">
        <div className="flex items-center justify-between">
          <div className="w-9 h-9 rounded-xl bg-yellow-50/70 flex items-center justify-center text-yellow-600 shadow-inner">
            <UserPlus className="h-4.5 w-4.5" />
          </div>
          <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-[#FEF3C7] text-[#D97706] uppercase tracking-wider">
            Pending
          </span>
        </div>
        <div className="mt-3">
          <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Registration Queue</span>
          <h3 className="text-2xl font-extrabold text-slate-800 tracking-tight mt-1">45</h3>
        </div>
      </div>

      {/* Stat Card 4: Gallery Assets */}
      <div className="bg-white rounded-2xl border border-slate-100 p-4 shadow-[0_8px_30px_rgba(0,0,0,0.015)] flex flex-col justify-between text-left">
        <div className="flex items-center justify-between">
          <div className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600 shadow-inner">
            <Image className="h-4.5 w-4.5" />
          </div>
          <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-blue-50 text-blue-600 tracking-wide font-sans">
            + 12 today
          </span>
        </div>
        <div className="mt-3">
          <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Gallery Assets</span>
          <h3 className="text-2xl font-extrabold text-slate-800 tracking-tight mt-1">428</h3>
        </div>
      </div>

    </div>
  );
};

export default StatsGrid;
