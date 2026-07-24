import React, { useState, useEffect } from "react";
import { Filter, Download, ArrowRight } from "lucide-react";
import { db } from "../../config/firebase";
import { collection, getDocs } from "firebase/firestore";

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
  timestamp: number;
}

export const RecentActivities: React.FC = () => {
  const [activities, setActivities] = useState<Activity[]>([]);

  useEffect(() => {
    const fetchRecentActivities = async () => {
      try {
        const mergedList: Activity[] = [];

        // 1. Fetch Events
        const eventsSnap = await getDocs(collection(db, "events"));
        eventsSnap.forEach(d => {
          const data = d.data();
          const timestamp = data.createdAt || Date.now();
          mergedList.push({
            id: `event-${d.id}`,
            user: { initials: "AD", name: "Admin", bgColor: "bg-blue-50", textColor: "text-blue-600" },
            action: { label: "CREATE EVENT", type: "create" },
            entity: data.title || data.name || "Event Item",
            time: formatRelativeTime(timestamp),
            status: "success",
            timestamp
          });
        });

        // 2. Fetch Team/Organizers
        const teamSnap = await getDocs(collection(db, "organizers"));
        teamSnap.forEach(d => {
          const data = d.data();
          const timestamp = data.createdAt || Date.now();
          mergedList.push({
            id: `team-${d.id}`,
            user: { initials: "AD", name: "Admin", bgColor: "bg-purple-50", textColor: "text-purple-600" },
            action: { label: "ADD ORGANIZER", type: "create" },
            entity: data.name || "Team Member",
            time: formatRelativeTime(timestamp),
            status: "success",
            timestamp
          });
        });

        // 3. Fetch Albums
        const albumsSnap = await getDocs(collection(db, "albums"));
        albumsSnap.forEach(d => {
          const data = d.data();
          const timestamp = data.createdAt || Date.now();
          mergedList.push({
            id: `album-${d.id}`,
            user: { initials: "AD", name: "Admin", bgColor: "bg-emerald-50", textColor: "text-emerald-600" },
            action: { label: "CREATE ALBUM", type: "create" },
            entity: data.title || "Gallery Album",
            time: formatRelativeTime(timestamp),
            status: "success",
            timestamp
          });
        });

        // 4. Fetch Users
        const usersSnap = await getDocs(collection(db, "users"));
        usersSnap.forEach(d => {
          const data = d.data();
          const timestamp = data.createdAt || Date.now();
          const initials = (data.name || "U").split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2);
          mergedList.push({
            id: `user-${d.id}`,
            user: { initials, name: data.name || "User", bgColor: "bg-slate-100", textColor: "text-slate-600" },
            action: { label: "NEW USER JOINED", type: "create" },
            entity: data.email || "Registered Account",
            time: formatRelativeTime(timestamp),
            status: data.status === "Pending" ? "info" : "success",
            timestamp
          });
        });

        // Sort by timestamp desc and take top 5
        const sorted = mergedList.sort((a, b) => b.timestamp - a.timestamp).slice(0, 5);
        
        if (sorted.length === 0) {
          setActivities([
            {
              id: "1",
              user: { initials: "RK", name: "Rahul K.", bgColor: "bg-blue-50", textColor: "text-blue-600" },
              action: { label: "CREATE EVENT", type: "create" },
              entity: "Neural Hackathon 2024",
              time: "2 mins ago",
              status: "success",
              timestamp: Date.now()
            }
          ]);
        } else {
          setActivities(sorted);
        }
      } catch (err) {
        console.error("Error loading recent activities:", err);
      }
    };

    fetchRecentActivities();
  }, []);

  const formatRelativeTime = (timestamp: any) => {
    if (!timestamp) return "Just now";
    const date = typeof timestamp === "number" ? timestamp : timestamp.seconds ? timestamp.seconds * 1000 : Date.now();
    const diff = Date.now() - date;
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "Just now";
    if (mins < 60) return `${mins} mins ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours} hours ago`;
    const days = Math.floor(hours / 24);
    return `${days} days ago`;
  };

  return (
    <div className="bg-white rounded-3xl border border-slate-100 p-6 shadow-sm hover:shadow-xl transition-all duration-300 text-left flex flex-col justify-between h-full">
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
