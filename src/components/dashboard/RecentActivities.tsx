import React from "react";
import { Filter, Download, ArrowRight } from "lucide-react";

interface Activity {
  id: string;
  user: {
    initials: string;
    name: string;
    bgColor: string;
    textColor: string;
  };
  action: {
    label: string;
    type: "create" | "update" | "delete" | "backup";
  };
  entity: string;
  time: string;
  status: "success" | "rejected" | "info";
}

export const RecentActivities: React.FC = () => {
  const activities: Activity[] = [
    {
      id: "1",
      user: { initials: "RK", name: "Rahul K.", bgColor: "bg-blue-50", textColor: "text-blue-600" },
      action: { label: "CREATE EVENT", type: "create" },
      entity: "Neural Hackathon 2024",
      time: "2 mins ago",
      status: "success"
    },
    {
      id: "2",
      user: { initials: "SM", name: "Sarah M.", bgColor: "bg-purple-50", textColor: "text-purple-600" },
      action: { label: "CONTENT UPDATE", type: "update" },
      entity: "About Us Page",
      time: "45 mins ago",
      status: "success"
    },
    {
      id: "3",
      user: { initials: "JD", name: "James D.", bgColor: "bg-pink-50", textColor: "text-pink-600" },
      action: { label: "DELETE ASSET", type: "delete" },
      entity: "IMG_9042.jpg",
      time: "2 hours ago",
      status: "rejected"
    },
    {
      id: "4",
      user: { initials: "SYS", name: "System", bgColor: "bg-slate-100", textColor: "text-slate-600" },
      action: { label: "AUTO BACKUP", type: "backup" },
      entity: "Core Database",
      time: "5 hours ago",
      status: "info"
    }
  ];

  return (
    <div className="bg-white rounded-2xl border border-slate-100 p-4 shadow-[0_8px_30px_rgba(0,0,0,0.015)] text-left flex flex-col justify-between h-full">
      <div>
        {/* Header line */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-slate-50">
          <div className="space-y-1">
            <h3 className="text-sm font-bold text-slate-800 tracking-tight">Recent Activities</h3>
            <p className="text-[10px] text-slate-400 font-medium">Complete audit log of system actions</p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {/* Filter Action */}
            <button
              onClick={() => alert("Opening activity filter...")}
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg border border-slate-200 text-xs font-semibold text-slate-600 bg-white hover:bg-slate-50 transition-colors"
            >
              <Filter className="h-3.5 w-3.5" />
              Filter
            </button>
            {/* Export Action */}
            <button
              onClick={() => alert("Exporting audit logs...")}
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg border border-slate-200 text-xs font-semibold text-slate-600 bg-white hover:bg-slate-50 transition-colors"
            >
              <Download className="h-3.5 w-3.5" />
              Export
            </button>
          </div>
        </div>

        {/* Audit Log Table */}
        <div className="overflow-x-auto w-full pt-3">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-50 text-[10px] uppercase font-bold tracking-wider text-slate-400">
                <th className="py-2.5 pr-4 font-semibold">User</th>
                <th className="py-2.5 px-4 font-semibold">Action</th>
                <th className="py-2.5 px-4 font-semibold">Entity</th>
                <th className="py-2.5 px-4 font-semibold">Time</th>
                <th className="py-2.5 pl-4 font-semibold">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50/50 text-slate-700">
              {activities.map((act) => (
                <tr key={act.id} className="text-xs font-medium hover:bg-slate-50/40 transition-colors">
                  {/* User Column */}
                  <td className="py-2.5 pr-4">
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-[10px] ${act.user.bgColor} ${act.user.textColor} shrink-0`}>
                        {act.user.initials}
                      </div>
                      <span className="font-semibold text-slate-800">{act.user.name}</span>
                    </div>
                  </td>

                  {/* Action Column */}
                  <td className="py-2.5 px-4">
                    <span className={`inline-block px-2.5 py-1 rounded text-[9px] font-bold tracking-wider uppercase
                      ${act.action.type === "delete" 
                        ? "bg-red-50 text-red-600" 
                        : "bg-blue-50 text-[#2563EB]"
                      }`}
                    >
                      {act.action.label}
                    </span>
                  </td>

                  {/* Entity Column */}
                  <td className="py-2.5 px-4 font-medium text-slate-500 max-w-[150px] truncate">
                    {act.entity}
                  </td>

                  {/* Time Column */}
                  <td className="py-2.5 px-4 text-slate-400">
                    {act.time}
                  </td>

                  {/* Status Column */}
                  <td className="py-2.5 pl-4">
                    <span className={`inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider
                      ${act.status === "success" && "text-[#10B981]"}
                      ${act.status === "rejected" && "text-red-500"}
                      ${act.status === "info" && "text-[#2563EB]"}
                    `}>
                      <span className={`w-1.5 h-1.5 rounded-full
                        ${act.status === "success" && "bg-[#10B981] animate-pulse"}
                        ${act.status === "rejected" && "bg-red-500"}
                        ${act.status === "info" && "bg-[#2563EB]"}
                      `} />
                      {act.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Footer historical audit link */}
      <div className="pt-5 border-t border-slate-50 mt-4 text-center sm:text-left">
        <button
          onClick={() => alert("Navigating to all audit logs...")}
          className="inline-flex items-center gap-1 text-xs font-bold text-[#2563EB] hover:text-blue-700 transition-colors group"
        >
          View Historical Audit
          <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
        </button>
      </div>
    </div>
  );
};

export default RecentActivities;
