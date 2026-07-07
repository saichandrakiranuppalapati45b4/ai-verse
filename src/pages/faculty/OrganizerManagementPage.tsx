import React, { useState, useMemo } from "react";
import SEO from "../../components/layout/SEO";
import { 
  Award, 
  Plus, 
  SlidersHorizontal, 
  Download, 
  Trophy, 
  X
} from "lucide-react";

// Import local assets if they exist
import elenaImg from "../../assets/images/elena.png";
import sarahImg from "../../assets/images/sarah.png";
import satoshiImg from "../../assets/images/satoshi.png";

interface Organizer {
  id: string;
  name: string;
  email: string;
  department: string;
  eventsCount: number;
  successRate: number;
  xp: number;
  badge: string;
  image?: string;
}

interface Achievement {
  id: string;
  time: string;
  title: string;
  description: string;
  color: string;
}

const OrganizerManagementPage: React.FC = () => {
  // Mock data matching the mockup layout + extra for functional sorting/pagination
  const [organizers, setOrganizers] = useState<Organizer[]>([
    {
      id: "1",
      name: "Alex Rivers",
      email: "a.rivers@uni.edu",
      department: "AI & ROBOTICS",
      eventsCount: 8,
      successRate: 98,
      xp: 2450,
      badge: "CHAMPION",
      image: elenaImg // Reusing Elena image for Alex
    },
    {
      id: "2",
      name: "Sarah Chen",
      email: "s.chen@uni.edu",
      department: "DATA SCIENCE",
      eventsCount: 5,
      successRate: 92,
      xp: 2120,
      badge: "ELITE",
      image: sarahImg
    },
    {
      id: "3",
      name: "Jordan Smith",
      email: "j.smith@uni.edu",
      department: "COMPUTER SCIENCE",
      eventsCount: 3,
      successRate: 85,
      xp: 1890,
      badge: "RISING STAR",
      image: satoshiImg // Reusing Satoshi image for Jordan
    },
    {
      id: "4",
      name: "Sophia Martinez",
      email: "s.martinez@uni.edu",
      department: "AI & ROBOTICS",
      eventsCount: 7,
      successRate: 94,
      xp: 1750,
      badge: "ELITE"
    },
    {
      id: "5",
      name: "David K.",
      email: "d.k@uni.edu",
      department: "COMPUTER SCIENCE",
      eventsCount: 4,
      successRate: 88,
      xp: 1600,
      badge: "RISING STAR"
    }
  ]);

  // Achievement timeline state
  const [achievements, setAchievements] = useState<Achievement[]>([
    {
      id: "1",
      time: "2 hours ago",
      title: "Alex completed 'Deep Learning Symposium'",
      description: "Successfully managed 250+ attendees and speakers.",
      color: "bg-emerald-500"
    },
    {
      id: "2",
      time: "Yesterday",
      title: "Sarah earned 'Master Recruiter' badge",
      description: "Onboarded 10 new volunteers this month.",
      color: "bg-blue-600"
    },
    {
      id: "3",
      time: "2 days ago",
      title: "Tech Club Hackathon Approved",
      description: "Finalized venue and sponsor agreements.",
      color: "bg-sky-400"
    }
  ]);

  // States
  const [searchQuery, setSearchQuery] = useState("");
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newDept, setNewDept] = useState("AI & ROBOTICS");
  const [newEvents, setNewEvents] = useState(1);
  const [newSuccess, setNewSuccess] = useState(90);

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 3;

  // Derive top performers based on XP
  const topPerformers = useMemo(() => {
    return [...organizers].sort((a, b) => b.xp - a.xp).slice(0, 3);
  }, [organizers]);

  // Filtered organizers
  const filteredOrganizers = useMemo(() => {
    return organizers.filter(org => 
      org.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      org.department.toLowerCase().includes(searchQuery.toLowerCase()) ||
      org.email.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [organizers, searchQuery]);

  // Paginated organizers
  const paginatedOrganizers = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredOrganizers.slice(start, start + itemsPerPage);
  }, [filteredOrganizers, currentPage]);

  const totalPages = Math.ceil(filteredOrganizers.length / itemsPerPage) || 1;

  // Reset page when search changes
  React.useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery]);

  // Handlers
  const handleAddOrganizer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName || !newEmail) return;

    // Determine badge and XP based on success rate for mock purposes
    let badge = "RISING STAR";
    let xp = 1000 + newEvents * 100;
    if (newSuccess >= 95) {
      badge = "CHAMPION";
      xp += 500;
    } else if (newSuccess >= 90) {
      badge = "ELITE";
      xp += 300;
    }

    const newOrg: Organizer = {
      id: Date.now().toString(),
      name: newName,
      email: newEmail,
      department: newDept.toUpperCase(),
      eventsCount: Number(newEvents),
      successRate: Number(newSuccess),
      xp,
      badge
    };

    setOrganizers([newOrg, ...organizers]);

    // Log achievement automatically
    const newAch: Achievement = {
      id: Date.now().toString(),
      time: "Just now",
      title: `${newName} joined as Organizer`,
      description: `Assigned to ${newDept} department.`,
      color: "bg-blue-600"
    };
    setAchievements([newAch, ...achievements]);

    // Clear form
    setNewName("");
    setNewEmail("");
    setIsAddModalOpen(false);
  };

  const handleNextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1);
    }
  };

  const handlePrevPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };

  return (
    <div className="space-y-8 pb-12 font-sans">
      <SEO 
        title="Organizer Management - Faculty Portal" 
        description="Oversee club leadership, manage student organizers, and monitor performance metrics across all departments."
      />

      {/* ================= HEADER ================= */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 text-left">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-800 tracking-tight">Organizer Management</h1>
          <p className="text-slate-500 text-xs sm:text-sm mt-1 max-w-2xl font-medium leading-relaxed">
            Oversee club leadership, manage student organizers, and monitor performance metrics 
            across all departments within Azure Intelligence.
          </p>
        </div>

        <button
          onClick={() => setIsAddModalOpen(true)}
          className="flex items-center gap-2 justify-center px-5 py-2.5 bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-bold rounded-2xl shadow-md shadow-blue-600/10 hover:shadow-lg transition-all text-sm whitespace-nowrap self-start md:self-center"
        >
          <Plus className="h-4.5 w-4.5" />
          Add New Organizer
        </button>
      </div>

      {/* ================= METRICS CARDS (COMPACT THEME WITH LEFT COLOR BORDERS) ================= */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Organizers */}
        <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-[0_8px_30px_rgba(0,0,0,0.015)] border-l-4 border-l-blue-500 flex flex-col justify-between text-left group hover:shadow-md transition-all duration-300">
          <div>
            <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Total Organizers</span>
            <div className="flex items-baseline gap-2 mt-1">
              <h3 className="text-2xl font-extrabold text-slate-800 tracking-tight">
                {organizers.length + 13} {/* Mock offset matching mockup */}
              </h3>
              <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded">
                +12%
              </span>
            </div>
          </div>
          <p className="text-[10px] text-slate-400 font-medium mt-3">Active this semester</p>
        </div>

        {/* Pending Applications */}
        <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-[0_8px_30px_rgba(0,0,0,0.015)] border-l-4 border-l-amber-500 flex flex-col justify-between text-left group hover:shadow-md transition-all duration-300">
          <div>
            <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Pending Applications</span>
            <div className="flex items-baseline gap-2 mt-1">
              <h3 className="text-2xl font-extrabold text-slate-800 tracking-tight">05</h3>
              <span className="text-[8px] font-extrabold text-amber-700 bg-[#FEF3C7] px-1.5 py-0.5 rounded uppercase tracking-wider">
                Urgent
              </span>
            </div>
          </div>
          <p className="text-[10px] text-slate-400 font-medium mt-3">Review required</p>
        </div>

        {/* Active Projects */}
        <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-[0_8px_30px_rgba(0,0,0,0.015)] border-l-4 border-l-indigo-600/90 flex flex-col justify-between text-left group hover:shadow-md transition-all duration-300">
          <div>
            <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Active Projects</span>
            <div className="flex items-baseline gap-2 mt-1">
              <h3 className="text-2xl font-extrabold text-slate-800 tracking-tight">12</h3>
            </div>
          </div>
          <p className="text-[10px] text-slate-400 font-medium mt-3">Ongoing initiatives</p>
        </div>

        {/* Avg. Success Rate */}
        <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-[0_8px_30px_rgba(0,0,0,0.015)] border-l-4 border-l-emerald-500 flex flex-col justify-between text-left group hover:shadow-md transition-all duration-300">
          <div>
            <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Avg. Success Rate</span>
            <div className="flex items-baseline gap-2 mt-1">
              <h3 className="text-2xl font-extrabold text-slate-800 tracking-tight">94%</h3>
            </div>
          </div>
          <p className="text-[10px] text-slate-400 font-medium mt-3">High performance team</p>
        </div>
      </div>

      {/* ================= CONTENT GRID ================= */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* LEFT COLUMN: Organizer Directory (65% / 8 grid cols) */}
        <div className="lg:col-span-8 space-y-6">
          <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden text-left">
            {/* Card Header with search & filters */}
            <div className="p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-0.5">
                <h3 className="text-base font-bold text-slate-800 tracking-tight">Organizer Directory</h3>
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                <div className="relative flex-1 sm:w-60">
                  <SlidersHorizontal className="absolute left-3.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search organizers..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-1.5 bg-slate-50 border border-slate-200/80 rounded-xl text-slate-700 placeholder-slate-400 text-xs focus:outline-none focus:border-blue-500 focus:bg-white transition-all font-medium"
                  />
                </div>
                <button
                  onClick={() => alert("Downloading directory data...")}
                  className="p-2 border border-slate-200 rounded-xl bg-white hover:bg-slate-50 text-slate-500 hover:text-slate-700 transition-colors"
                  title="Export List"
                >
                  <Download className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Table wrapper */}
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left text-sm text-slate-600">
                <thead className="bg-slate-50/70 text-[9px] font-bold text-slate-400 tracking-wider uppercase border-b border-slate-100">
                  <tr>
                    <th scope="col" className="px-6 py-3">Organizer</th>
                    <th scope="col" className="px-6 py-3">Department</th>
                    <th scope="col" className="px-6 py-3 text-center">Events</th>
                    <th scope="col" className="px-6 py-3">Success Rate</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {paginatedOrganizers.length > 0 ? (
                    paginatedOrganizers.map(org => {
                      // Determine progress bar color
                      let progressBg = "bg-emerald-500";
                      if (org.successRate < 90) {
                        progressBg = "bg-amber-500";
                      } else if (org.successRate < 95) {
                        progressBg = "bg-blue-600";
                      }
                      
                      return (
                        <tr key={org.id} className="hover:bg-slate-50/50 transition-colors">
                          {/* Organizer Info */}
                          <td className="px-6 py-3.5 whitespace-nowrap">
                            <div className="flex items-center gap-3">
                              {org.image ? (
                                <img
                                  src={org.image}
                                  alt={org.name}
                                  className="w-9 h-9 rounded-full object-cover border border-slate-100"
                                />
                              ) : (
                                <div className="w-9 h-9 rounded-full bg-slate-100 border border-slate-200/80 flex items-center justify-center font-bold text-xs text-slate-500">
                                  {org.name.split(" ").map(n => n[0]).join("")}
                                </div>
                              )}
                              <div>
                                <div className="font-bold text-slate-800 text-xs leading-normal">{org.name}</div>
                                <div className="text-[10px] text-slate-400 font-medium">{org.email}</div>
                              </div>
                            </div>
                          </td>

                          {/* Department */}
                          <td className="px-6 py-3.5 whitespace-nowrap">
                            <span className={`inline-block px-2 py-0.5 rounded text-[8px] font-bold tracking-wide
                              ${org.department === "AI & ROBOTICS" ? "bg-blue-50 text-blue-700 border border-blue-100/30" : ""}
                              ${org.department === "DATA SCIENCE" ? "bg-purple-50 text-purple-700 border border-purple-100/30" : ""}
                              ${org.department === "COMPUTER SCIENCE" ? "bg-indigo-50 text-indigo-700 border border-indigo-100/30" : ""}
                            `}>
                              {org.department}
                            </span>
                          </td>

                          {/* Events Count */}
                          <td className="px-6 py-3.5 whitespace-nowrap text-center font-bold text-slate-800 text-xs">
                            {org.eventsCount.toString().padStart(2, "0")}
                          </td>

                          {/* Success Rate Progress Bar */}
                          <td className="px-6 py-3.5 whitespace-nowrap">
                            <div className="w-32">
                              <div className="flex justify-between items-center text-[10px] font-bold text-slate-800 mb-1">
                                <span>{org.successRate}%</span>
                              </div>
                              <div className="w-full bg-slate-100 rounded-full h-1.5">
                                <div 
                                  className={`h-1.5 rounded-full ${progressBg}`} 
                                  style={{ width: `${org.successRate}%` }}
                                ></div>
                              </div>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={4} className="px-6 py-10 text-center text-xs font-semibold text-slate-400">
                        No organizers found matching query.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="p-4 border-t border-slate-150/50 bg-slate-50/40 flex items-center justify-between gap-4">
              <div className="text-[10px] text-slate-400 font-bold tracking-tight">
                Showing {Math.min(filteredOrganizers.length, itemsPerPage)} of {filteredOrganizers.length} organizers
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handlePrevPage}
                  disabled={currentPage === 1}
                  className={`px-3 py-1 text-xs border border-slate-200 rounded-lg bg-white text-slate-600 font-bold hover:bg-slate-50 transition-all ${currentPage === 1 ? 'opacity-40 pointer-events-none' : ''}`}
                >
                  Previous
                </button>
                <button
                  onClick={handleNextPage}
                  disabled={currentPage === totalPages}
                  className={`px-3 py-1 text-xs border border-[#2563EB] rounded-lg bg-[#2563EB] text-white font-bold hover:bg-blue-700 transition-all ${currentPage === totalPages ? 'opacity-40 pointer-events-none' : ''}`}
                >
                  Next
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: Leaderboard & Activity (35% / 4 grid cols) */}
        <div className="lg:col-span-4 space-y-6">
          
          {/* Top Performers Card */}
          <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm text-left">
            <div className="flex items-center gap-2 pb-4 border-b border-slate-50">
              <Trophy className="h-4.5 w-4.5 text-amber-500" />
              <h3 className="text-sm font-bold text-slate-800 tracking-tight">Top Performers</h3>
            </div>

            <div className="space-y-4 pt-4">
              {topPerformers.map((org, index) => {
                const colors = [
                  "bg-amber-100 text-amber-600 border-amber-200", // Gold 1st
                  "bg-slate-100 text-slate-500 border-slate-200",  // Silver 2nd
                  "bg-amber-50/70 text-amber-800 border-amber-100"  // Bronze 3rd
                ];

                return (
                  <div key={org.id} className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="relative">
                        {org.image ? (
                          <img
                            src={org.image}
                            alt={org.name}
                            className="w-9 h-9 rounded-full object-cover border border-slate-100"
                          />
                        ) : (
                          <div className="w-9 h-9 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center font-bold text-xs text-slate-500">
                            {org.name.split(" ").map(n => n[0]).join("")}
                          </div>
                        )}
                        <span className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border text-[8px] font-black flex items-center justify-center shadow ${colors[index]}`}>
                          {index + 1}
                        </span>
                      </div>

                      <div className="leading-tight">
                        <h4 className="text-xs font-bold text-slate-800">{org.name}</h4>
                        <span className="text-[8px] font-bold text-slate-400 tracking-wider uppercase">
                          {org.badge}
                        </span>
                      </div>
                    </div>

                    <div className="text-right">
                      <span className="text-xs font-extrabold text-slate-800">{org.xp.toLocaleString()} XP</span>
                    </div>
                  </div>
                );
              })}

              <button
                onClick={() => alert("Leaderboard feature coming soon...")}
                className="w-full mt-2 py-2 text-center text-xs font-bold border border-slate-200 hover:border-slate-300 rounded-xl text-slate-700 bg-white hover:bg-slate-50 transition-all select-none"
              >
                View Leaderboard
              </button>
            </div>
          </div>

          {/* Recent Achievements Card */}
          <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm text-left">
            <div className="flex items-center gap-2 pb-4 border-b border-slate-50">
              <Award className="h-4.5 w-4.5 text-blue-600" />
              <h3 className="text-sm font-bold text-slate-800 tracking-tight">Recent Achievements</h3>
            </div>

            {/* Timeline */}
            <div className="relative border-l border-slate-100 pl-4 space-y-5 pt-4 mt-1">
              {achievements.map((ach) => (
                <div key={ach.id} className="relative space-y-1">
                  {/* Timeline dot */}
                  <span className={`absolute -left-[20.5px] top-1 w-2.5 h-2.5 rounded-full border border-white ${ach.color}`}></span>
                  
                  <span className="text-[9px] font-semibold text-slate-400">{ach.time}</span>
                  <h4 className="text-xs font-bold text-slate-800 leading-tight">{ach.title}</h4>
                  <p className="text-[10px] text-slate-400 font-medium leading-relaxed">{ach.description}</p>
                </div>
              ))}
            </div>

            <button
              onClick={() => alert("Redirecting to activities log...")}
              className="w-full mt-4 py-2 text-center text-xs font-bold border border-slate-200 hover:border-slate-300 rounded-xl text-slate-700 bg-white hover:bg-slate-50 transition-all select-none"
            >
              View All Activity
            </button>
          </div>

        </div>

      </div>

      {/* ================= ADD NEW ORGANIZER MODAL ================= */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl border border-slate-100 overflow-hidden text-left animate-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <div className="flex items-center gap-2 text-slate-800">
                <Plus className="h-5 w-5 text-blue-600" />
                <h3 className="text-lg font-bold">Add Student Organizer</h3>
              </div>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="p-1 hover:bg-slate-100 text-slate-400 hover:text-slate-600 rounded-lg transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleAddOrganizer} className="p-6 space-y-4 font-sans">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Alex Rivers"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="w-full px-4 py-2 border border-slate-200 rounded-2xl focus:outline-none focus:border-blue-500 font-medium text-sm text-slate-800"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Email Address</label>
                <input
                  type="email"
                  required
                  placeholder="e.g. a.rivers@uni.edu"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  className="w-full px-4 py-2 border border-slate-200 rounded-2xl focus:outline-none focus:border-blue-500 font-medium text-sm text-slate-800"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Department</label>
                <select
                  value={newDept}
                  onChange={(e) => setNewDept(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-2xl focus:outline-none focus:border-blue-500 font-medium text-sm text-slate-800 cursor-pointer"
                >
                  <option value="AI & Robotics">AI & Robotics</option>
                  <option value="Data Science">Data Science</option>
                  <option value="Computer Science">Computer Science</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Events Managed</label>
                  <input
                    type="number"
                    min="0"
                    value={newEvents}
                    onChange={(e) => setNewEvents(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-slate-200 rounded-2xl focus:outline-none focus:border-blue-500 font-medium text-sm text-slate-800"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Success Rate (%)</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={newSuccess}
                    onChange={(e) => setNewSuccess(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-slate-200 rounded-2xl focus:outline-none focus:border-blue-500 font-medium text-sm text-slate-800"
                  />
                </div>
              </div>

              <div className="flex items-center gap-3 pt-4 border-t border-slate-50">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="flex-1 py-2.5 border border-slate-200 hover:bg-slate-50 text-slate-600 font-bold rounded-2xl text-sm transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-bold rounded-2xl text-sm shadow-md shadow-blue-600/10 hover:shadow-lg transition-all"
                >
                  Add Organizer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default OrganizerManagementPage;
