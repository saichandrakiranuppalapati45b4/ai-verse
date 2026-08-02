import React, { useState, useEffect, useMemo, useRef } from "react";
import { 
  ClipboardList, 
  Search, 
  Trash2, 
  Check, 
  Loader2, 
  AlertCircle,
  FileSpreadsheet,
  User,
  Users as UsersIcon,
  X,
  RefreshCw,
  Download
} from "lucide-react";
import SEO from "../../components/layout/SEO";
import { db } from "../../config/firebase";
import { collection, getDocs, doc, deleteDoc, updateDoc, increment } from "firebase/firestore";

interface RegistrationItem {
  id: string;
  eventId: string;
  eventTitle: string;
  groupName: string;
  teamLeadName: string;
  teamLeadEmail: string;
  teamLeadStudentId: string;
  phoneNumber: string;
  branch: string;
  section: string;
  year: string;
  teamSize: number;
  members: Array<{ name: string; email: string; studentId: string; role?: string }>;
  status?: "Confirmed" | "Pending" | "Waitlisted";
  createdAt: number;
}

const RegistrationsManagementPage: React.FC = () => {
  const [registrations, setRegistrations] = useState<RegistrationItem[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedEvent, setSelectedEvent] = useState("All");
  const [selectedType, setSelectedType] = useState("All");
  const [selectedStatus, setSelectedStatus] = useState("All");
  const [selectedReg, setSelectedReg] = useState<RegistrationItem | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState<RegistrationItem | null>(null);
  const [activeLongPressRegId, setActiveLongPressRegId] = useState<string | null>(null);
  const longPressTimer = useRef<any>(null);
  const isLongPressActive = useRef(false);
  const [deleteModeOption, setDeleteModeOption] = useState<"single" | "group" | "event">("single");
  const [selectedRegIds, setSelectedRegIds] = useState<string[]>([]);
  const [isDeleteSelectionMode, setIsDeleteSelectionMode] = useState(false);

  // Export Modal State
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [exportSelectedEvent, setExportSelectedEvent] = useState("All");

  const handleExportCsv = () => {
    const targetRegs = exportSelectedEvent === "All"
      ? registrations
      : registrations.filter(r => r.eventTitle === exportSelectedEvent);

    if (targetRegs.length === 0) {
      alert("No registrations available for the selected event.");
      return;
    }

    const headers = [
      "Event Title",
      "Registration Type",
      "Student / Lead Name",
      "Roll Number / Student ID",
      "Email Address",
      "Phone Number",
      "Branch",
      "Section",
      "Year",
      "Team Size",
      "Status",
      "Registration Date"
    ];

    const rows: string[] = [];

    targetRegs.forEach((reg) => {
      const regType = reg.groupName && reg.groupName !== "Individual RSVP" ? "Group" : "Individual";
      const regDate = new Date(reg.createdAt).toLocaleDateString("en-US");
      const status = reg.status || "Confirmed";

      if (reg.members && reg.members.length > 0) {
        reg.members.forEach((m) => {
          const row = [
            `"${(reg.eventTitle || "").replace(/"/g, '""')}"`,
            `"${regType}"`,
            `"${(m.name || reg.teamLeadName || "").replace(/"/g, '""')}"`,
            `"${(m.studentId || reg.teamLeadStudentId || "").replace(/"/g, '""')}"`,
            `"${(m.email || reg.teamLeadEmail || "").replace(/"/g, '""')}"`,
            `"${((m as any).phoneNumber || reg.phoneNumber || "").replace(/"/g, '""')}"`,
            `"${((m as any).branch || reg.branch || "").replace(/"/g, '""')}"`,
            `"${((m as any).section || reg.section || "").replace(/"/g, '""')}"`,
            `"${((m as any).year || reg.year || "").replace(/"/g, '""')}"`,
            reg.teamSize || 1,
            `"${status}"`,
            `"${regDate}"`
          ];
          rows.push(row.join(","));
        });
      } else {
        const row = [
          `"${(reg.eventTitle || "").replace(/"/g, '""')}"`,
          `"${regType}"`,
          `"${(reg.teamLeadName || "").replace(/"/g, '""')}"`,
          `"${(reg.teamLeadStudentId || "").replace(/"/g, '""')}"`,
          `"${(reg.teamLeadEmail || "").replace(/"/g, '""')}"`,
          `"${(reg.phoneNumber || "").replace(/"/g, '""')}"`,
          `"${(reg.branch || "").replace(/"/g, '""')}"`,
          `"${(reg.section || "").replace(/"/g, '""')}"`,
          `"${(reg.year || "").replace(/"/g, '""')}"`,
          reg.teamSize || 1,
          `"${status}"`,
          `"${regDate}"`
        ];
        rows.push(row.join(","));
      }
    });

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    const filename = exportSelectedEvent === "All"
      ? "all_event_registrations.csv"
      : `${exportSelectedEvent.toLowerCase().replace(/[^a-z0-9]/g, "_")}_registrations.csv`;

    link.setAttribute("href", encodedUri);
    link.setAttribute("download", filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    setIsExportModalOpen(false);
  };

  const toggleSelectReg = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setSelectedRegIds(prev => 
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    if (selectedRegIds.length === filteredRegistrations.length && filteredRegistrations.length > 0) {
      setSelectedRegIds([]);
    } else {
      setSelectedRegIds(filteredRegistrations.map(r => r.id));
    }
  };

  const handleBulkDeleteRegistrations = async () => {
    if (selectedRegIds.length === 0) return;
    if (!window.confirm(`Are you sure you want to delete ${selectedRegIds.length} selected registration(s)?`)) return;

    try {
      setLoading(true);
      const selectedRegs = registrations.filter(r => selectedRegIds.includes(r.id));
      
      for (const reg of selectedRegs) {
        await deleteDoc(doc(db, "registrations", reg.id));
        try {
          await updateDoc(doc(db, "events", reg.eventId), {
            currentReg: increment(-reg.teamSize)
          });
        } catch (e) {
          console.error("Error updating event counter:", e);
        }
      }

      setRegistrations(prev => prev.filter(r => !selectedRegIds.includes(r.id)));
      setSelectedRegIds([]);
      setIsDeleteSelectionMode(false);
      alert(`Successfully deleted ${selectedRegs.length} registration(s).`);
    } catch (err) {
      console.error("Error bulk deleting registrations:", err);
      alert("Failed to delete selected registrations.");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteGroupRegistrations = async (groupName: string) => {
    if (!groupName || groupName === "Individual RSVP") return;
    try {
      const targets = registrations.filter(r => r.groupName === groupName);
      for (const reg of targets) {
        await deleteDoc(doc(db, "registrations", reg.id));
        try {
          await updateDoc(doc(db, "events", reg.eventId), {
            currentReg: increment(-reg.teamSize)
          });
        } catch (e) {
          console.error("Error updating event counter:", e);
        }
      }
      setRegistrations(prev => prev.filter(r => r.groupName !== groupName));
      alert(`Successfully deleted all registrations from group "${groupName}".`);
    } catch (err) {
      console.error("Error deleting group registrations:", err);
      alert("Failed to delete group registrations.");
    }
  };

  const handleDeleteEventRegistrations = async (eventId: string) => {
    if (!eventId) return;
    try {
      const targets = registrations.filter(r => r.eventId === eventId);
      for (const reg of targets) {
        await deleteDoc(doc(db, "registrations", reg.id));
        try {
          await updateDoc(doc(db, "events", reg.eventId), {
            currentReg: increment(-reg.teamSize)
          });
        } catch (e) {
          console.error("Error updating event counter:", e);
        }
      }
      setRegistrations(prev => prev.filter(r => r.eventId !== eventId));
      alert("Successfully deleted all registrations for this event.");
    } catch (err) {
      console.error("Error deleting event registrations:", err);
      alert("Failed to delete event registrations.");
    }
  };

  const fetchRegistrations = async () => {
    try {
      setLoading(true);
      const querySnapshot = await getDocs(collection(db, "registrations"));
      const list: RegistrationItem[] = [];
      querySnapshot.forEach((docSnap) => {
        const data = docSnap.data();
        list.push({
          id: docSnap.id,
          eventId: data.eventId || "",
          eventTitle: data.eventTitle || "Unknown Event",
          groupName: data.groupName || "Individual RSVP",
          teamLeadName: data.teamLeadName || "Student Registrant",
          teamLeadEmail: data.teamLeadEmail || "",
          teamLeadStudentId: data.teamLeadStudentId || "",
          phoneNumber: data.phoneNumber || "",
          branch: data.branch || "",
          section: data.section || "",
          year: data.year || "",
          teamSize: data.teamSize || 1,
          members: data.members || [],
          status: data.status || "Confirmed",
          createdAt: data.createdAt || Date.now()
        });
      });
      setRegistrations(list.sort((a, b) => b.createdAt - a.createdAt));
    } catch (err) {
      console.error("Error fetching registrations:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRegistrations();
  }, []);

  const handleDeleteRegistration = async (regId: string, eventId: string, teamSize: number) => {
    if (confirm("Are you sure you want to cancel and delete this registration?")) {
      try {
        await deleteDoc(doc(db, "registrations", regId));
        
        // Decrement currentReg on the event
        try {
          await updateDoc(doc(db, "events", eventId), {
            currentReg: increment(-teamSize)
          });
        } catch (e) {
          console.error("Error updating event capacity counter:", e);
        }

        setRegistrations(prev => prev.filter(r => r.id !== regId));
        alert("Registration successfully deleted.");
      } catch (err) {
        console.error("Error deleting registration:", err);
        alert("Failed to delete registration.");
      }
    }
  };

  const handleUpdateStatus = async (regId: string, newStatus: "Confirmed" | "Pending" | "Waitlisted") => {
    try {
      await updateDoc(doc(db, "registrations", regId), {
        status: newStatus
      });
      setRegistrations(prev => prev.map(r => r.id === regId ? { ...r, status: newStatus } : r));
    } catch (err) {
      console.error("Error updating status:", err);
      alert("Failed to update status.");
    }
  };

  const handleSaveRoster = async () => {
    if (!editForm) return;
    try {
      const regRef = doc(db, "registrations", editForm.id);
      await updateDoc(regRef, {
        groupName: editForm.groupName,
        teamLeadName: editForm.teamLeadName,
        teamLeadEmail: editForm.teamLeadEmail,
        teamLeadStudentId: editForm.teamLeadStudentId,
        members: editForm.members
      });
      
      // Update local state list
      setRegistrations(prev => prev.map(r => r.id === editForm.id ? { ...r, ...editForm } : r));
      setSelectedReg(editForm);
      setIsEditing(false);
      alert("Roster successfully updated.");
    } catch (err) {
      console.error("Error saving roster:", err);
      alert("Failed to save roster details.");
    }
  };

  // Get unique events list for filter dropdown
  const uniqueEvents = useMemo(() => {
    const eventsSet = new Set(registrations.map(r => r.eventTitle));
    return ["All", ...Array.from(eventsSet)];
  }, [registrations]);

  // Filtered registrations list
  const filteredRegistrations = useMemo(() => {
    return registrations.filter(r => {
      const matchesSearch = 
        (r.teamLeadName || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
        (r.groupName || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
        (r.teamLeadStudentId || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
        (r.eventTitle || "").toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesEvent = selectedEvent === "All" || r.eventTitle === selectedEvent;
      
      const isGroup = r.groupName && r.groupName !== "Individual RSVP";
      const matchesType = selectedType === "All" || 
        (selectedType === "Group" && isGroup) || 
        (selectedType === "Individual" && !isGroup);
      
      const matchesStatus = selectedStatus === "All" || (r.status || "Confirmed") === selectedStatus;

      return matchesSearch && matchesEvent && matchesType && matchesStatus;
    });
  }, [registrations, searchQuery, selectedEvent, selectedType, selectedStatus]);

  // Metrics
  const metrics = useMemo(() => {
    const total = registrations.length;
    const pending = registrations.filter(r => r.status === "Pending").length;
    const groupCount = registrations.filter(r => r.groupName && r.groupName !== "Individual RSVP").length;
    const individualCount = total - groupCount;

    return {
      total: total,
      pending: pending,
      group: groupCount,
      individual: individualCount
    };
  }, [registrations]);

  return (
    <div className="space-y-8 pb-12 font-sans text-left">
      <SEO 
        title="Event Registrations - Faculty Portal" 
        description="Oversee and manage all student enrollments, waitlist allocations, and group sizes."
      />

      {/* ================= HEADER ================= */}
      <div>
        <h1 className="text-3xl font-extrabold text-slate-800 tracking-tight">Event Registrations</h1>
        <p className="text-slate-500 text-xs sm:text-sm mt-1 max-w-2xl font-medium leading-relaxed">
          Manage and oversee all participant enrollments across club events with real-time tracking and verification tools.
        </p>
      </div>

      {/* ================= METRIC CARDS ================= */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Registrations */}
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-[0_8px_30px_rgba(0,0,0,0.015)] flex flex-col justify-between hover:shadow-md transition-all duration-300">
          <div className="flex justify-between items-start">
            <div className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600 shadow-inner">
              <ClipboardList className="h-4.5 w-4.5" />
            </div>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-600 border border-emerald-100 flex items-center gap-0.5">
              +12%
            </span>
          </div>
          <div className="mt-4">
            <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Total Registrations</span>
            <h3 className="text-2xl font-black text-slate-800 tracking-tight mt-1">
              {loading ? <Loader2 className="h-5 w-5 animate-spin text-slate-400 mt-1" /> : metrics.total}
            </h3>
          </div>
        </div>

        {/* Pending Approvals */}
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-[0_8px_30px_rgba(0,0,0,0.015)] flex flex-col justify-between hover:shadow-md transition-all duration-300">
          <div className="flex justify-between items-start">
            <div className="w-9 h-9 rounded-xl bg-amber-50 flex items-center justify-center text-amber-600 shadow-inner">
              <AlertCircle className="h-4.5 w-4.5" />
            </div>
            <span className="text-[9px] font-black px-2 py-0.5 rounded-md bg-amber-100/50 text-amber-700 border border-amber-200/30">
              High Priority
            </span>
          </div>
          <div className="mt-4">
            <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Pending Approvals</span>
            <h3 className="text-2xl font-black text-slate-800 tracking-tight mt-1">
              {loading ? <Loader2 className="h-5 w-5 animate-spin text-slate-400 mt-1" /> : metrics.pending}
            </h3>
          </div>
        </div>

        {/* Group Registrations */}
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-[0_8px_30px_rgba(0,0,0,0.015)] flex flex-col justify-between hover:shadow-md transition-all duration-300">
          <div className="flex justify-between items-start">
            <div className="w-9 h-9 rounded-xl bg-sky-50 flex items-center justify-center text-sky-600 shadow-inner">
              <UsersIcon className="h-4.5 w-4.5" />
            </div>
            <span className="text-[10px] font-bold text-sky-500">
              13% of total
            </span>
          </div>
          <div className="mt-4">
            <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Group Registrations</span>
            <h3 className="text-2xl font-black text-slate-800 tracking-tight mt-1">
              {loading ? <Loader2 className="h-5 w-5 animate-spin text-slate-400 mt-1" /> : metrics.group}
            </h3>
          </div>
        </div>

        {/* Individual Registrations */}
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-[0_8px_30px_rgba(0,0,0,0.015)] flex flex-col justify-between hover:shadow-md transition-all duration-300">
          <div className="flex justify-between items-start">
            <div className="w-9 h-9 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600 shadow-inner">
              <User className="h-4.5 w-4.5" />
            </div>
            <span className="text-[10px] font-bold text-indigo-500">
              87% of total
            </span>
          </div>
          <div className="mt-4">
            <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Individual Registrations</span>
            <h3 className="text-2xl font-black text-slate-800 tracking-tight mt-1">
              {loading ? <Loader2 className="h-5 w-5 animate-spin text-slate-400 mt-1" /> : metrics.individual}
            </h3>
          </div>
        </div>
      </div>

      {/* ================= MAIN COLUMN WORKSPACE ================= */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* Left Table Section (span 12) */}
        <div className="lg:col-span-12 bg-white rounded-3xl border border-slate-100 shadow-[0_8px_30px_rgba(0,0,0,0.015)] overflow-hidden">
          
          {/* Controls Bar */}
          <div className="p-6 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-4 flex-grow max-w-md">
              <span className="text-sm font-bold text-slate-850 whitespace-nowrap">Registration Directory</span>
              <div className="relative w-full">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search participants..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-xl focus:outline-none focus:border-blue-500 font-medium text-xs text-slate-800 bg-slate-50/20 focus:bg-white transition-all"
                />
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <select
                value={selectedEvent}
                onChange={(e) => setSelectedEvent(e.target.value)}
                className="px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:border-blue-500 font-semibold text-xs text-slate-700 bg-white"
              >
                <option value="All">All Events</option>
                {uniqueEvents.filter(ev => ev !== "All").map((ev, i) => (
                  <option key={i} value={ev}>{ev}</option>
                ))}
              </select>

              <select
                value={selectedType}
                onChange={(e) => setSelectedType(e.target.value)}
                className="px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:border-blue-500 font-semibold text-xs text-slate-700 bg-white"
              >
                <option value="All">All Types</option>
                <option value="Individual">Individual</option>
                <option value="Group">Group</option>
              </select>

              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:border-blue-500 font-semibold text-xs text-slate-700 bg-white"
              >
                <option value="All">All Status</option>
                <option value="Confirmed">Confirmed</option>
                <option value="Pending">Pending</option>
                <option value="Waitlisted">Waitlisted</option>
              </select>

              <button
                onClick={fetchRegistrations}
                disabled={loading}
                className="p-2 border border-slate-200 rounded-xl bg-white hover:bg-slate-50 text-slate-600 transition-all flex items-center justify-center shadow-sm disabled:opacity-55"
                title="Refresh Directory"
              >
                <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
              </button>

              <button
                onClick={() => setIsExportModalOpen(true)}
                className="flex items-center gap-1.5 justify-center px-4 py-2 bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-bold rounded-xl text-xs shadow-sm hover:shadow transition-all whitespace-nowrap"
              >
                <FileSpreadsheet className="h-3.5 w-3.5" />
                Export Data
              </button>

              {!isDeleteSelectionMode ? (
                <button
                  onClick={() => setIsDeleteSelectionMode(true)}
                  disabled={loading || filteredRegistrations.length === 0}
                  className="flex items-center gap-1.5 justify-center px-4 py-2 bg-red-50 hover:bg-red-100 text-red-600 border border-red-200/60 font-bold rounded-xl text-xs shadow-sm hover:shadow transition-all whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed"
                  title="Enable selection mode to delete registrations"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Delete
                </button>
              ) : (
                <div className="flex items-center gap-2 animate-in fade-in duration-200">
                  <button
                    onClick={() => {
                      setIsDeleteSelectionMode(false);
                      setSelectedRegIds([]);
                    }}
                    className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleBulkDeleteRegistrations}
                    disabled={selectedRegIds.length === 0 || loading}
                    className={`flex items-center gap-1.5 justify-center px-4 py-2 font-bold rounded-xl text-xs shadow-sm transition-all whitespace-nowrap ${
                      selectedRegIds.length > 0
                        ? "bg-red-600 hover:bg-red-700 text-white cursor-pointer shadow-red-100"
                        : "bg-red-200 text-white cursor-not-allowed"
                    }`}
                    title={selectedRegIds.length > 0 ? `Delete ${selectedRegIds.length} selected registration(s)` : "Select registrations using radio buttons below"}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    Confirm Delete {selectedRegIds.length > 0 ? `(${selectedRegIds.length})` : ""}
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Directory Table */}
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-xs text-slate-600">
              <thead className="bg-slate-50/70 text-[9px] font-bold text-slate-400 tracking-wider uppercase border-b border-slate-100">
                <tr>
                  {isDeleteSelectionMode && (
                    <th scope="col" className="px-4 py-4 w-10 text-center animate-in fade-in">
                      <input
                        type="checkbox"
                        checked={filteredRegistrations.length > 0 && selectedRegIds.length === filteredRegistrations.length}
                        onChange={toggleSelectAll}
                        className="w-4 h-4 rounded-full border-slate-300 text-red-600 focus:ring-red-500 cursor-pointer accent-red-600"
                        title="Select / Deselect all"
                      />
                    </th>
                  )}
                  <th scope="col" className="px-6 py-4">Participant / ID</th>
                  <th scope="col" className="px-6 py-4">Event Name</th>
                  <th scope="col" className="px-6 py-4">Type</th>
                  <th scope="col" className="px-6 py-4">Date</th>
                  <th scope="col" className="px-6 py-4">Status</th>
                  <th scope="col" className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-750">
                {loading ? (
                  <tr>
                    <td colSpan={isDeleteSelectionMode ? 7 : 6} className="px-6 py-12 text-center">
                      <Loader2 className="h-6 w-6 text-blue-600 animate-spin mx-auto mb-2" />
                      <span className="text-slate-400 font-bold">Querying registration listings...</span>
                    </td>
                  </tr>
                ) : filteredRegistrations.length === 0 ? (
                  <tr>
                    <td colSpan={isDeleteSelectionMode ? 7 : 6} className="px-6 py-12 text-center text-slate-400 font-semibold">
                      No registrations matched current search filters.
                    </td>
                  </tr>
                ) : (
                  filteredRegistrations.map((reg) => {
                    const isGroup = reg.groupName && reg.groupName !== "Individual RSVP";
                    const initial = reg.teamLeadName ? reg.teamLeadName.substring(0, 2).toUpperCase() : "US";
                    const isSelected = selectedRegIds.includes(reg.id);
                    
                    return (
                      <tr 
                        key={reg.id} 
                        className={`hover:bg-slate-50/40 transition-colors cursor-pointer ${isDeleteSelectionMode && isSelected ? "bg-red-50/30" : ""}`}
                        onClick={() => {
                          if (isDeleteSelectionMode) {
                            toggleSelectReg(reg.id);
                          } else {
                            setSelectedReg(reg);
                            setEditForm(JSON.parse(JSON.stringify(reg)));
                            setIsEditing(false);
                          }
                        }}
                      >
                        {isDeleteSelectionMode && (
                          <td className="px-4 py-4 text-center animate-in fade-in" onClick={(e) => e.stopPropagation()}>
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={(e) => toggleSelectReg(reg.id, e as any)}
                              className="w-4 h-4 rounded-full border-slate-300 text-red-600 focus:ring-red-500 cursor-pointer accent-red-600"
                            />
                          </td>
                        )}
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-[10px] shrink-0">
                              {initial}
                            </div>
                            <div className="text-left leading-normal">
                              <span className="font-bold text-slate-800 text-xs block">{reg.teamLeadName}</span>
                              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block mt-0.5">{reg.teamLeadStudentId || "REG-2026-000"}</span>
                            </div>
                          </div>
                        </td>

                        <td className="px-6 py-4 font-bold text-slate-700 max-w-[150px] truncate">
                          {reg.eventTitle}
                        </td>

                        <td className="px-6 py-4 whitespace-nowrap">
                          {isGroup ? (
                            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[8px] font-black tracking-wide bg-blue-50 text-blue-700 border border-blue-100/30 uppercase">
                              Group ({reg.teamSize})
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[8px] font-black tracking-wide bg-slate-100 text-slate-500 border border-slate-200/50 uppercase">
                              Individual
                            </span>
                          )}
                        </td>

                        <td className="px-6 py-4 font-semibold text-slate-500 whitespace-nowrap">
                          {new Date(reg.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                        </td>

                        <td className="px-6 py-4 whitespace-nowrap">
                          {(reg.status || "Confirmed") === "Confirmed" && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[9px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-100/30">
                              <span className="w-1 h-1 rounded-full bg-emerald-600 animate-pulse"></span>
                              Confirmed
                            </span>
                          )}
                          {(reg.status || "Confirmed") === "Pending" && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[9px] font-bold bg-amber-50 text-amber-700 border border-amber-100/30">
                              <span className="w-1 h-1 rounded-full bg-amber-600"></span>
                              Pending
                            </span>
                          )}
                          {(reg.status || "Confirmed") === "Waitlisted" && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[9px] font-bold bg-slate-100 text-slate-650 border border-slate-200/50">
                              <span className="w-1 h-1 rounded-full bg-slate-450"></span>
                              Waitlisted
                            </span>
                          )}
                        </td>

                        <td className="px-6 py-4 text-right whitespace-nowrap relative">
                          <div className="flex items-center justify-end gap-1.5" onClick={(e) => e.stopPropagation()}>
                            {(reg.status || "Confirmed") !== "Confirmed" && (
                              <button
                                onClick={() => handleUpdateStatus(reg.id, "Confirmed")}
                                className="p-1 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-all"
                                title="Approve Registration"
                              >
                                <Check className="h-3.5 w-3.5" />
                              </button>
                            )}
                            <button
                              onMouseDown={() => {
                                isLongPressActive.current = false;
                                longPressTimer.current = setTimeout(() => {
                                  isLongPressActive.current = true;
                                  setActiveLongPressRegId(reg.id);
                                }, 600);
                              }}
                              onMouseUp={() => {
                                if (longPressTimer.current) {
                                  clearTimeout(longPressTimer.current);
                                  longPressTimer.current = null;
                                }
                                if (!isLongPressActive.current) {
                                  handleDeleteRegistration(reg.id, reg.eventId, reg.teamSize);
                                }
                              }}
                              onMouseLeave={() => {
                                if (longPressTimer.current) {
                                  clearTimeout(longPressTimer.current);
                                  longPressTimer.current = null;
                                }
                              }}
                              onTouchStart={() => {
                                isLongPressActive.current = false;
                                longPressTimer.current = setTimeout(() => {
                                  isLongPressActive.current = true;
                                  setActiveLongPressRegId(reg.id);
                                }, 600);
                              }}
                              onTouchEnd={() => {
                                if (longPressTimer.current) {
                                  clearTimeout(longPressTimer.current);
                                  longPressTimer.current = null;
                                }
                                if (!isLongPressActive.current) {
                                  handleDeleteRegistration(reg.id, reg.eventId, reg.teamSize);
                                }
                              }}
                              className="p-1 text-slate-400 hover:text-red-650 hover:bg-red-50 rounded-lg transition-all relative"
                              title="Hold for Multiple Delete Options"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>

                            {activeLongPressRegId === reg.id && (
                              <div className="absolute right-12 top-10 bg-slate-950 text-white rounded-xl shadow-xl border border-slate-800 p-4.5 z-40 w-64 space-y-4 text-left animate-in fade-in slide-in-from-top-1 duration-150 select-none">
                                <span className="text-[10px] font-black uppercase text-red-500 tracking-wider block">Delete Options</span>
                                
                                <select
                                  value={deleteModeOption}
                                  onChange={(e) => setDeleteModeOption(e.target.value as "single" | "group" | "event")}
                                  className="w-full bg-slate-900 border border-slate-700 text-slate-200 text-xs font-bold rounded-lg px-3 py-2.5 outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500/30 transition-all cursor-pointer appearance-auto"
                                >
                                  <option value="single">Delete this registration only</option>
                                  {reg.groupName && reg.groupName !== "Individual RSVP" && (
                                    <option value="group">Delete all from group "{reg.groupName}"</option>
                                  )}
                                  <option value="event">Delete all for this event</option>
                                </select>

                                <div className="flex gap-2.5 pt-2.5 border-t border-slate-900">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setActiveLongPressRegId(null);
                                      setDeleteModeOption("single");
                                    }}
                                    className="flex-1 border border-slate-800 hover:bg-slate-900 hover:border-slate-700 text-slate-300 font-extrabold text-[10px] py-2 rounded-lg transition-all text-center uppercase tracking-wider"
                                  >
                                    Cancel
                                  </button>
                                  <button
                                    type="button"
                                    onClick={async () => {
                                      setActiveLongPressRegId(null);
                                      if (deleteModeOption === "single") {
                                        await handleDeleteRegistration(reg.id, reg.eventId, reg.teamSize);
                                      } else if (deleteModeOption === "group") {
                                        if (confirm(`Delete all registrations from group "${reg.groupName}"?`)) {
                                          await handleDeleteGroupRegistrations(reg.groupName);
                                        }
                                      } else if (deleteModeOption === "event") {
                                        if (confirm(`Delete all registrations for event "${reg.eventTitle}"?`)) {
                                          await handleDeleteEventRegistrations(reg.eventId);
                                        }
                                      }
                                      setDeleteModeOption("single");
                                    }}
                                    className="flex-1 bg-red-650 hover:bg-red-750 text-white font-extrabold text-[10px] py-2 rounded-lg transition-all text-center uppercase tracking-wider shadow-md shadow-red-950/40"
                                  >
                                    Confirm
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          <div className="p-4 border-t border-slate-100 flex items-center justify-between text-[10px] font-bold text-slate-400">
            <span>Showing {filteredRegistrations.length} of {registrations.length} results</span>
            <div className="flex items-center gap-1">
              <button disabled className="px-2.5 py-1 bg-slate-50 border border-slate-200/50 rounded-lg text-slate-350 shrink-0">Previous</button>
              <button disabled className="px-2.5 py-1 bg-white border border-slate-200 rounded-lg text-slate-700 hover:bg-slate-50 shrink-0">Next</button>
            </div>
          </div>
        </div>


      </div>

      {/* Registration Details Modal */}
      {selectedReg && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl border border-slate-100 shadow-2xl max-w-2xl w-full mx-4 overflow-hidden animate-in zoom-in-95 duration-200 text-left">
            {/* Header */}
            <div className="p-6 border-b border-slate-100 flex justify-between items-start bg-slate-50/50">
              <div>
                <span className="text-[10px] font-black text-blue-600 tracking-wider uppercase block">Roster Details</span>
                <h3 className="text-lg font-black text-slate-800 tracking-tight mt-1 flex items-center gap-3">
                  {selectedReg.eventTitle}
                  {!isEditing && (
                    <button
                      onClick={() => setIsEditing(true)}
                      className="px-2.5 py-1 text-[10px] font-black bg-blue-50 hover:bg-blue-100 text-blue-600 border border-blue-200/50 rounded-lg transition-all"
                    >
                      Edit Roster
                    </button>
                  )}
                </h3>
              </div>
              <button 
                onClick={() => {
                  setSelectedReg(null);
                  setIsEditing(false);
                }}
                className="p-1.5 hover:bg-slate-100 rounded-xl text-slate-400 hover:text-slate-600 transition-all"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Content */}
            <div className="p-6 space-y-6 max-h-[500px] overflow-y-auto">
              
              {/* Group Identity Card */}
              <div className="bg-slate-50/50 border border-slate-100 rounded-2xl p-4.5 space-y-4">
                <h4 className="text-xs font-black text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                  <UsersIcon className="h-3.5 w-3.5 text-blue-600" />
                  Group Summary
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-0.5">
                    <span className="text-[10px] font-bold text-slate-400 block uppercase">Group Name</span>
                    {isEditing ? (
                      <input 
                        type="text" 
                        className="w-full px-3 py-1.5 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:border-blue-500" 
                        value={editForm?.groupName || ""}
                        onChange={(e) => setEditForm(prev => prev ? { ...prev, groupName: e.target.value } : null)}
                      />
                    ) : (
                      <span className="text-xs font-bold text-slate-800 block">{selectedReg.groupName || "Individual RSVP"}</span>
                    )}
                  </div>
                  <div className="space-y-0.5">
                    <span className="text-[10px] font-bold text-slate-400 block uppercase">Registration Date</span>
                    <span className="text-xs font-bold text-slate-800 block">
                      {new Date(selectedReg.createdAt).toLocaleString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                    </span>
                  </div>
                </div>
              </div>

              {/* Roster Table */}
              <div className="space-y-3">
                <h4 className="text-xs font-black text-slate-400 uppercase tracking-wider pl-1 flex items-center gap-1.5">
                  <ClipboardList className="h-3.5 w-3.5 text-blue-600" />
                  Roster List ({selectedReg.members.length + 1} members)
                </h4>
                
                <div className="border border-slate-100 rounded-2xl overflow-hidden bg-white shadow-sm">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 text-[9px] font-black text-slate-450 tracking-wider uppercase border-b border-slate-100">
                      <tr>
                        <th className="px-4 py-3">Member</th>
                        <th className="px-4 py-3">Student ID</th>
                        <th className="px-4 py-3">Email</th>
                        <th className="px-4 py-3 text-right">Role</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                      {/* Team Lead */}
                      <tr className="bg-blue-50/10">
                        <td className="px-4 py-3.5">
                          {isEditing ? (
                            <div className="space-y-1">
                              <input 
                                type="text"
                                className="w-full px-2 py-1 border border-slate-200 rounded-lg text-xs font-bold text-slate-850"
                                value={editForm?.teamLeadName || ""}
                                onChange={(e) => setEditForm(prev => prev ? { ...prev, teamLeadName: e.target.value } : null)}
                              />
                              <span className="text-[8px] font-bold text-blue-600 uppercase tracking-wider block">Team Lead</span>
                            </div>
                          ) : (
                            <>
                              <span className="font-extrabold text-slate-800 block">{selectedReg.teamLeadName}</span>
                              <span className="text-[8px] font-bold text-blue-600 uppercase tracking-wider block mt-0.5">Team Lead</span>
                            </>
                          )}
                        </td>
                        <td className="px-4 py-3.5 font-bold text-slate-500">
                          {isEditing ? (
                            <input 
                              type="text"
                              className="w-full px-2 py-1 border border-slate-200 rounded-lg text-xs text-slate-700 font-bold"
                              value={editForm?.teamLeadStudentId || ""}
                              onChange={(e) => setEditForm(prev => prev ? { ...prev, teamLeadStudentId: e.target.value } : null)}
                            />
                          ) : (
                            selectedReg.teamLeadStudentId || "REG-2026-TL"
                          )}
                        </td>
                        <td className="px-4 py-3.5 text-slate-655">
                          {isEditing ? (
                            <input 
                              type="text"
                              className="w-full px-2 py-1 border border-slate-200 rounded-lg text-xs text-slate-705"
                              value={editForm?.teamLeadEmail || ""}
                              onChange={(e) => setEditForm(prev => prev ? { ...prev, teamLeadEmail: e.target.value } : null)}
                            />
                          ) : (
                            selectedReg.teamLeadEmail
                          )}
                        </td>
                        <td className="px-4 py-3.5 text-right">
                          <span className="inline-block px-2 py-0.5 bg-blue-100 border border-blue-200 text-blue-700 font-black rounded text-[8px] uppercase tracking-wide">
                            Leader
                          </span>
                        </td>
                      </tr>

                      {/* Teammates */}
                      {selectedReg.members.map((m, idx) => {
                        const roles = ["Developer", "Researcher", "Analyst"];
                        const badgeStyles = [
                          "bg-sky-50 text-sky-700 border-sky-100",
                          "bg-emerald-50 text-emerald-700 border-emerald-100",
                          "bg-indigo-50 text-indigo-700 border-indigo-100"
                        ];
                        const roleName = roles[idx % roles.length];
                        const badgeStyle = badgeStyles[idx % badgeStyles.length];

                        return (
                          <tr key={idx} className="hover:bg-slate-50/30">
                            <td className="px-4 py-3.5">
                              {isEditing ? (
                                <div className="space-y-1">
                                  <input 
                                    type="text"
                                    className="w-full px-2 py-1 border border-slate-200 rounded-lg text-xs font-bold text-slate-850"
                                    value={editForm?.members[idx]?.name || ""}
                                    onChange={(e) => {
                                      const val = e.target.value;
                                      setEditForm(prev => {
                                        if (!prev) return null;
                                        const members = [...prev.members];
                                        members[idx] = { ...members[idx], name: val };
                                        return { ...prev, members };
                                      });
                                    }}
                                  />
                                  <span className="text-[8px] font-bold text-slate-400 uppercase tracking-wider block">Member #{idx + 2}</span>
                                </div>
                              ) : (
                                <>
                                  <span className="font-bold text-slate-850 block">{m.name}</span>
                                  <span className="text-[8px] font-bold text-slate-400 uppercase tracking-wider block mt-0.5">Member #{idx + 2}</span>
                                </>
                              )}
                            </td>
                            <td className="px-4 py-3.5 font-bold text-slate-500">
                              {isEditing ? (
                                <input 
                                  type="text"
                                  className="w-full px-2 py-1 border border-slate-200 rounded-lg text-xs text-slate-700 font-bold"
                                  value={editForm?.members[idx]?.studentId || ""}
                                  onChange={(e) => {
                                    const val = e.target.value;
                                    setEditForm(prev => {
                                      if (!prev) return null;
                                      const members = [...prev.members];
                                      members[idx] = { ...members[idx], studentId: val };
                                      return { ...prev, members };
                                    });
                                  }}
                                />
                              ) : (
                                m.studentId
                              )}
                            </td>
                            <td className="px-4 py-3.5 text-slate-655">
                              {isEditing ? (
                                <input 
                                  type="text"
                                  className="w-full px-2 py-1 border border-slate-200 rounded-lg text-xs text-slate-705"
                                  value={editForm?.members[idx]?.email || ""}
                                  onChange={(e) => {
                                    const val = e.target.value;
                                    setEditForm(prev => {
                                      if (!prev) return null;
                                      const members = [...prev.members];
                                      members[idx] = { ...members[idx], email: val };
                                      return { ...prev, members };
                                    });
                                  }}
                                />
                              ) : (
                                m.email
                              )}
                            </td>
                            <td className="px-4 py-3.5 text-right">
                              {isEditing ? (
                                <select
                                  className="px-2 py-1 border border-slate-200 rounded-lg text-[10px] font-bold text-slate-600 bg-white focus:outline-none"
                                  value={editForm?.members[idx]?.role || roleName}
                                  onChange={(e) => {
                                    const val = e.target.value;
                                    setEditForm(prev => {
                                      if (!prev) return null;
                                      const members = [...prev.members];
                                      members[idx] = { ...members[idx], role: val };
                                      return { ...prev, members };
                                    });
                                  }}
                                >
                                  <option value="Developer">Developer</option>
                                  <option value="Researcher">Researcher</option>
                                  <option value="Analyst">Analyst</option>
                                </select>
                              ) : (
                                <span className={`inline-block px-2.5 py-0.5 border font-black rounded text-[8px] uppercase tracking-wide ${badgeStyle}`}>
                                  {m.role || roleName}
                                </span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

            </div>

            {/* Footer */}
            <div className="p-4 border-t border-slate-100 bg-slate-50/50 flex justify-end gap-2">
              {isEditing ? (
                <>
                  <button
                    onClick={() => {
                      setIsEditing(false);
                      setEditForm(JSON.parse(JSON.stringify(selectedReg)));
                    }}
                    className="px-5 py-2.5 bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 font-bold rounded-2xl text-xs transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSaveRoster}
                    className="px-5 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold rounded-2xl text-xs hover:shadow-lg transition-all"
                  >
                    Save Changes
                  </button>
                </>
              ) : (
                <button
                  onClick={() => setSelectedReg(null)}
                  className="px-5 py-2.5 bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 font-bold rounded-2xl text-xs transition-colors"
                >
                  Close Roster
                </button>
              )}
            </div>

          </div>
        </div>
      )}

      {/* ================= EXPORT DATA MODAL ================= */}
      {isExportModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-md rounded-3xl border border-slate-100 shadow-2xl overflow-hidden p-6 space-y-6 text-left">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-2xl bg-blue-50 text-[#2563EB] flex items-center justify-center font-bold shadow-inner">
                  <FileSpreadsheet className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-slate-850">Export Registration Records</h3>
                  <p className="text-xs text-slate-500 font-medium mt-0.5">Select an event to generate and download CSV data report.</p>
                </div>
              </div>
              <button
                onClick={() => setIsExportModalOpen(false)}
                className="p-1.5 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">Select Event</label>
                <select
                  value={exportSelectedEvent}
                  onChange={(e) => setExportSelectedEvent(e.target.value)}
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-2xl focus:outline-none focus:border-blue-500 font-semibold text-xs text-slate-800 bg-slate-50/30 focus:bg-white transition-all cursor-pointer"
                >
                  <option value="All">All Events (All Registrations)</option>
                  {uniqueEvents.filter(ev => ev !== "All").map((ev, idx) => (
                    <option key={idx} value={ev}>{ev}</option>
                  ))}
                </select>
              </div>

              <div className="p-4 bg-blue-50/50 rounded-2xl border border-blue-100/60 text-xs text-slate-600 space-y-1">
                <span className="font-bold text-blue-700 block">Report Summary:</span>
                <p>
                  Will export {exportSelectedEvent === "All" ? registrations.length : registrations.filter(r => r.eventTitle === exportSelectedEvent).length} registration record(s) 
                  for <span className="font-bold text-slate-800">{exportSelectedEvent}</span> into CSV spreadsheet format.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100">
              <button
                onClick={() => setIsExportModalOpen(false)}
                className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleExportCsv}
                className="flex items-center gap-2 px-5 py-2.5 bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-bold rounded-xl text-xs shadow-md transition-all cursor-pointer"
              >
                <Download className="h-4 w-4" />
                Export CSV Report
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RegistrationsManagementPage;
