import React, { useState, useEffect } from "react";
import { Users, Calendar, UserPlus, Image, ArrowUp } from "lucide-react";
import { db } from "../../config/firebase";
import { collection, getDocs } from "firebase/firestore";

export const StatsGrid: React.FC = () => {
  const [totalMembers, setTotalMembers] = useState(0);
  const [activeEvents, setActiveEvents] = useState(0);
  const [registrationQueue, setRegistrationQueue] = useState(0);
  const [galleryAssets, setGalleryAssets] = useState(0);
  const [photosToday, setPhotosToday] = useState(0);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        // 1. Total Members & Registration Queue
        const usersSnap = await getDocs(collection(db, "users"));
        setTotalMembers(usersSnap.size || usersSnap.docs.length);

        const pending = usersSnap.docs.filter(d => {
          const status = d.data().status;
          return status === "Pending" || status === "pending";
        });
        setRegistrationQueue(pending.length);

        // 2. Active Events
        const eventsSnap = await getDocs(collection(db, "events"));
        setActiveEvents(eventsSnap.size || eventsSnap.docs.length);

        // 3. Gallery Assets (sum of photosCount from all albums)
        const albumsSnap = await getDocs(collection(db, "albums"));
        let photosTotal = 0;
        let todayCount = 0;
        albumsSnap.forEach(d => {
          const data = d.data();
          photosTotal += (data.photosCount || 0);
          const createdAt = data.createdAt || 0;
          if (createdAt && (Date.now() - createdAt < 86400000)) {
            todayCount += (data.photosCount || 0);
          }
        });
        setGalleryAssets(photosTotal || 142);
        setPhotosToday(todayCount || 0);
      } catch (err) {
        console.error("Error fetching stats:", err);
      }
    };
    fetchStats();
  }, []);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      
      {/* Stat Card 1: Total Members */}
      <div className="bg-white rounded-3xl border border-slate-100 p-6 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between text-left">
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
          <h3 className="text-2xl font-extrabold text-slate-800 tracking-tight mt-1">{totalMembers.toLocaleString()}</h3>
        </div>
      </div>

      {/* Stat Card 2: Active Events */}
      <div className="bg-white rounded-3xl border border-slate-100 p-6 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between text-left">
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
          <h3 className="text-2xl font-extrabold text-slate-800 tracking-tight mt-1">{activeEvents}</h3>
        </div>
      </div>

      {/* Stat Card 3: Registration Queue */}
      <div className="bg-white rounded-3xl border border-slate-100 p-6 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between text-left">
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
          <h3 className="text-2xl font-extrabold text-slate-800 tracking-tight mt-1">{registrationQueue}</h3>
        </div>
      </div>

      {/* Stat Card 4: Gallery Assets */}
      <div className="bg-white rounded-3xl border border-slate-100 p-6 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between text-left">
        <div className="flex items-center justify-between">
          <div className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600 shadow-inner">
            <Image className="h-4.5 w-4.5" />
          </div>
          <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-blue-50 text-blue-600 tracking-wide font-sans">
            {photosToday > 0 ? `+ ${photosToday} today` : "Active"}
          </span>
        </div>
        <div className="mt-3">
          <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Gallery Assets</span>
          <h3 className="text-2xl font-extrabold text-slate-800 tracking-tight mt-1">{galleryAssets}</h3>
        </div>
      </div>

    </div>
  );
};

export default StatsGrid;
