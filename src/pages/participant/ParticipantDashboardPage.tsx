import React, { useState, useEffect } from "react";
import { useAuth } from "../../context/AuthContext";
import { Link, useNavigate } from "react-router-dom";
import { 
  LayoutDashboard, 
  Users, 
  Upload, 
  BarChart2, 
  LogOut, 
  Bell, 
  GitFork,
  Video,
  ExternalLink,
  Clock,
  ArrowRight,
  CircleCheckBig,
  FileText,
  Search
} from "lucide-react";
import SEO from "../../components/layout/SEO";
import TeamReviewPage from "./TeamReviewPage";
import ProjectSubmissionPage from "./ProjectSubmissionPage";
import { db } from "../../config/firebase";
import { collection, getDocs, doc, getDoc } from "firebase/firestore";

// Countdown Timer Component
const CountdownTimer: React.FC = () => {
  const [timeLeft, setTimeLeft] = useState({ hours: 0, mins: 0, secs: 0 });

  useEffect(() => {
    // Set deadline to 24 hours from page load (or configure from event data)
    const deadline = Date.now() + 24 * 60 * 60 * 1000;

    const tick = () => {
      const diff = Math.max(0, deadline - Date.now());
      setTimeLeft({
        hours: Math.floor(diff / (1000 * 60 * 60)),
        mins: Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60)),
        secs: Math.floor((diff % (1000 * 60)) / 1000)
      });
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="flex items-center gap-3">
      {[
        { val: String(timeLeft.hours).padStart(2, "0"), unit: "HRS" },
        { val: String(timeLeft.mins).padStart(2, "0"), unit: "MIN" },
        { val: String(timeLeft.secs).padStart(2, "0"), unit: "SEC" }
      ].map((t, i) => (
        <div key={i} className="text-center">
          <div className="bg-slate-900 text-white font-black text-2xl rounded-xl w-14 h-14 flex items-center justify-center tabular-nums tracking-wider shadow-lg">
            {t.val}
          </div>
          <span className="text-[10px] font-bold text-slate-400 mt-1 block tracking-wider">{t.unit}</span>
        </div>
      ))}
    </div>
  );
};

export const ParticipantDashboardPage: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState<"dashboard" | "review-team" | "submission" | "status">("review-team");

  // Real Database State
  const [targetRegId, setTargetRegId] = useState<string>("");
  const [teamName, setTeamName] = useState<string>("");
  const [eventTitle, setEventTitle] = useState<string>("");
  const [teamId, setTeamId] = useState<string>("");
  const [leaderName, setLeaderName] = useState<string>("");
  const [members, setMembers] = useState<any[]>([]);
  const [eventBannerUrl, setEventBannerUrl] = useState<string>("/event-banner.png");

  // Submission Form State
  const [projectTitle, setProjectTitle] = useState<string>("");
  const [githubUrl, setGithubUrl] = useState<string>("");
  const [demoVideoUrl, setDemoVideoUrl] = useState<string>("");
  const [submissionStatus, setSubmissionStatus] = useState<string>("Registered");
  const [submittedAt, setSubmittedAt] = useState<number | null>(null);

  // Team review confirmed state
  const [teamReviewConfirmed, setTeamReviewConfirmed] = useState(false);

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  // Fetch real team & submission data from Firestore
  useEffect(() => {
    const fetchRealData = async () => {
      const cleanEmail = user?.email?.toLowerCase().trim() || "";

      try {
        const regSnap = await getDocs(collection(db, "registrations"));
        const allRegs: any[] = [];
        regSnap.forEach((docItem) => {
          allRegs.push({ id: docItem.id, ...docItem.data() });
        });

        let targetReg: any = null;

        if (allRegs.length > 0) {
          // Rank 0: Match by registrationId stored in user profile (exact link)
          if (!targetReg && user?.registrationId) {
            targetReg = allRegs.find((r) => r.id === user.registrationId);
          }

          // Rank 1: Match by exact email in teamLeadEmail, teamEmail, or members array
          if (!targetReg && cleanEmail) {
            targetReg = allRegs.find((r) => {
              const leadEmail = (r.teamLeadEmail || "").toLowerCase().trim();
              const tEmail = (r.teamEmail || "").toLowerCase().trim();
              if (leadEmail === cleanEmail) return true;
              if (tEmail === cleanEmail) return true;
              if (Array.isArray(r.members) && r.members.some((m: any) => m.email?.toLowerCase().trim() === cleanEmail)) return true;
              return false;
            });
          }

          // Rank 2: Match by user teamName (excluding default placeholder names)
          if (!targetReg && user?.teamName) {
            const tn = user.teamName.toLowerCase().trim();
            if (tn !== "team alpha-9" && tn !== "my team") {
              targetReg = allRegs.find((r) => (r.groupName || "").toLowerCase().trim() === tn);
            }
          }
        }

        if (targetReg) {
          const currentEventTitle = targetReg.eventTitle || "Hackathon";
          setTargetRegId(targetReg.id || "");
          setTeamName(targetReg.groupName || user?.teamName || "My Team");
          setEventTitle(currentEventTitle);
          setTeamId(targetReg.id ? `AI-${targetReg.id.substring(0, 4).toUpperCase()}-${targetReg.id.substring(4, 7).toUpperCase()}` : "AI-REG-001");
          setLeaderName(targetReg.teamLeadName || user?.name || "Participant");
          
          // Members
          const regMembers = Array.isArray(targetReg.members) ? targetReg.members : [];
          setMembers(regMembers);

          // Submission data
          setProjectTitle(targetReg.projectTitle || targetReg.title || "");
          setGithubUrl(targetReg.githubUrl || targetReg.githubLink || "");
          setDemoVideoUrl(targetReg.demoVideoUrl || targetReg.videoLink || "");
          setSubmissionStatus(targetReg.submissionStatus || targetReg.status || "Registered");
          if (targetReg.submittedAt) setSubmittedAt(targetReg.submittedAt);

          // Fetch event poster/banner from Firestore events collection
          let foundBanner = "/event-banner.png";
          if (targetReg.eventId) {
            try {
              const evDoc = await getDoc(doc(db, "events", targetReg.eventId));
              if (evDoc.exists()) {
                const evData = evDoc.data();
                const img = evData.posterPreview || evData.posterImages?.[0]?.preview || evData.bannerUrl || evData.imageUrl || evData.image;
                if (img) foundBanner = img;
              }
            } catch (err) {
              console.warn("Error fetching event doc by eventId:", err);
            }
          }

          // Fallback: search events collection by event title match if not found yet
          if (foundBanner === "/event-banner.png" && currentEventTitle) {
            try {
              const eventsSnap = await getDocs(collection(db, "events"));
              const matchTitle = currentEventTitle.toLowerCase().trim();
              eventsSnap.forEach((eDoc) => {
                const eData = eDoc.data();
                if ((eData.title || "").toLowerCase().trim() === matchTitle) {
                  const img = eData.posterPreview || eData.posterImages?.[0]?.preview || eData.bannerUrl || eData.imageUrl || eData.image;
                  if (img) foundBanner = img;
                }
              });
            } catch (err) {
              console.warn("Error searching events collection by title:", err);
            }
          }

          setEventBannerUrl(foundBanner);
        } else {
          setTeamName(user?.teamName || (user?.name ? `${user.name}'s Team` : "My Team"));
          setEventTitle("General Track");
          setTeamId(user?.uid ? `AI-${user.uid.substring(0, 4).toUpperCase()}-${user.uid.substring(4, 7).toUpperCase()}` : "AI-REG");
          setLeaderName(user?.name || "Participant");
        }
      } catch (err) {
        console.error("Error fetching participant dashboard data:", err);
      }
    };

    fetchRealData();
  }, [user]);


  const getInitials = (name: string) => {
    if (!name) return "PU";
    const parts = name.trim().split(" ");
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  // Calculate submission progress
  const getSubmissionProgress = () => {
    let progress = 20; // base registered
    if (teamReviewConfirmed) progress += 20;
    if (projectTitle) progress += 20;
    if (githubUrl) progress += 20;
    if (demoVideoUrl) progress += 10;
    if (submissionStatus === "Submitted") progress = 100;
    return Math.min(progress, 100);
  };

  const submissionProgress = getSubmissionProgress();

  const handleConfirmAndContinue = () => {
    setTeamReviewConfirmed(true);
    setActiveTab("dashboard");
  };

  // Sidebar items
  const sidebarItems = [
    { id: "dashboard" as const, label: "Dashboard", icon: LayoutDashboard },
    { id: "review-team" as const, label: "Team", icon: Users },
    { id: "submission" as const, label: "Submission", icon: Upload },
    { id: "status" as const, label: "Submission Status", icon: BarChart2 },
  ];

  return (
    <div className="h-screen bg-[#F8FAFC] flex font-sans text-slate-800 antialiased overflow-hidden selection:bg-blue-500/20 selection:text-blue-600">
      <SEO 
        title="Participant Portal - AI Verse" 
        description="Manage team details, submit projects, and view evaluation status."
      />

      {/* Fixed Left Sidebar */}
      <aside className="w-[260px] h-screen border-r border-slate-200/80 bg-white flex flex-col justify-between shrink-0 z-20 sticky top-0 overflow-y-auto">
        <div className="p-5 space-y-6">
          {/* Logo Header */}
          <Link to="/" className="flex items-center gap-3 px-2">
            <img src="/ai_verse.png" alt="AI Verse Logo" className="w-9 h-9 rounded-xl object-contain shadow-md shadow-blue-500/20" />
            <span className="text-lg font-extrabold text-slate-900 tracking-tight">AI Verse</span>
          </Link>

          {/* Navigation */}
          <nav className="space-y-1">
            {sidebarItems.map((item) => (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`w-full px-4 py-3 rounded-2xl flex items-center gap-3.5 text-sm font-semibold transition-all text-left cursor-pointer ${
                  activeTab === item.id
                    ? "bg-[#EFF6FF] text-[#2563EB] font-bold shadow-sm"
                    : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
                }`}
              >
                <item.icon className={`w-5 h-5 ${activeTab === item.id ? "text-[#2563EB]" : "text-slate-400"}`} />
                {item.label}
              </button>
            ))}
          </nav>
        </div>

        {/* Bottom Section: User Profile + Logout */}
        <div className="p-5 space-y-3 border-t border-slate-100">
          {/* User Profile Card */}
          <div className="flex items-center gap-3 px-3 py-2.5">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 text-white font-bold flex items-center justify-center text-xs shadow-md shadow-blue-500/20">
              {getInitials(leaderName || user?.name || "P")}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-slate-900 truncate">{leaderName || user?.name || "Participant"}</p>
              <p className="text-[11px] text-slate-400 font-medium truncate">Team Participant</p>
            </div>
          </div>

          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-2.5 text-slate-500 hover:text-red-600 font-semibold text-sm transition-colors text-left cursor-pointer rounded-xl hover:bg-red-50"
          >
            <LogOut className="w-4.5 h-4.5" />
            Logout
          </button>
        </div>
      </aside>

      {/* Main Content (Scrollable Right Panel) */}
      <div className="flex-1 min-w-0 h-screen flex flex-col bg-[#F8FAFC] overflow-y-auto">
        
        {/* Top Search Bar */}
        <header className="h-16 px-8 border-b border-slate-200/60 bg-white flex items-center justify-between sticky top-0 z-10 shrink-0">
          <div className="flex items-center gap-3 bg-slate-50 rounded-xl px-4 py-2.5 w-full max-w-md border border-slate-200/60">
            <Search className="w-4 h-4 text-slate-400" />
            <input 
              type="text" 
              placeholder="Search resources, teams, or status..." 
              className="bg-transparent text-sm font-medium text-slate-600 placeholder:text-slate-400 focus:outline-none w-full"
            />
          </div>

          <div className="flex items-center gap-4">
            <button className="p-2 text-slate-400 hover:text-slate-700 rounded-xl relative transition-colors cursor-pointer">
              <Bell className="w-5 h-5" />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full" />
            </button>
          </div>
        </header>

        {/* Tab Body */}
        <main className="p-8 space-y-8 max-w-6xl w-full mx-auto flex-1">

          {/* Review Team Tab */}
          {activeTab === "review-team" && (
            <TeamReviewPage 
              embedded={true} 
              onConfirm={handleConfirmAndContinue}
            />
          )}

          {/* ==================== PREMIUM DASHBOARD TAB ==================== */}
          {activeTab === "dashboard" && (
            <div className="space-y-8">

              {/* Welcome Header */}
              <div className="flex items-start justify-between">
                <div>
                  <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">
                    Welcome back, {(leaderName || user?.name || "Participant").split(" ")[0]}
                  </h1>
                  <div className="flex items-center gap-3 mt-2">
                    <span className="text-sm font-bold text-blue-600">Team: {teamName}</span>
                    <span className="text-slate-300 font-light">|</span>
                    <span className="text-sm text-slate-500 font-medium">Team ID: <span className="bg-slate-100 text-slate-700 font-mono text-xs px-2 py-0.5 rounded-md font-bold">{teamId}</span></span>
                  </div>
                </div>

                {/* Hackathon Live Badge */}
                <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-full px-4 py-2 shadow-sm">
                  <span className="relative flex h-2.5 w-2.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
                  </span>
                  <span className="text-sm font-bold text-slate-700">{eventTitle} — Live</span>
                </div>
              </div>

              {/* Main Content Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                {/* Left Column: Submission Status Card with Event Banner */}
                <div className="lg:col-span-2 bg-white border border-slate-200/80 rounded-3xl shadow-sm overflow-hidden flex flex-col">
                  {/* Top: Full-bleed Event Banner */}
                  <div className="relative h-48 sm:h-56 w-full overflow-hidden bg-slate-900 flex items-end p-6 sm:p-8">
                    {/* Banner Background Image */}
                    <img 
                      src={eventBannerUrl || "/event-banner.png"} 
                      alt="Event Banner" 
                      className="absolute inset-0 w-full h-full object-cover opacity-85"
                    />
                    {/* Gradient Overlay for text readability & visual depth */}
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-900/40 to-transparent" />
                    
                    {/* Event Banner Overlay Content */}
                    <div className="relative z-10 w-full flex items-end justify-between">
                      <div>
                        <div className="flex items-center gap-2 mb-2">
                          <span className="bg-blue-600/90 backdrop-blur-md text-white text-[11px] font-extrabold uppercase tracking-wider px-3 py-1 rounded-full shadow-sm">
                            AI VERSE HACKATHON
                          </span>
                          <span className="bg-emerald-500/90 backdrop-blur-md text-white text-[11px] font-extrabold uppercase tracking-wider px-3 py-1 rounded-full shadow-sm flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" /> LIVE TRACK
                          </span>
                        </div>
                        <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight drop-shadow-md">
                          {eventTitle || "AI Verse Hackathon"}
                        </h2>
                      </div>

                      <div className="hidden sm:block text-right">
                        <span className="text-xs font-semibold text-blue-200 block">Team Entry</span>
                        <span className="text-lg font-extrabold text-white">{teamName}</span>
                      </div>
                    </div>
                  </div>

                  {/* Bottom: Submission Status & Controls (Below Event Banner) */}
                  <div className="p-6 sm:p-8 space-y-5 bg-white flex-1 flex flex-col justify-between">
                    <div className="space-y-4">
                      {/* Badge & Timestamp */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <span className={`text-xs font-extrabold px-3 py-1 rounded-full ${
                            submissionStatus === "Submitted" 
                              ? "bg-emerald-50 text-emerald-600 border border-emerald-200" 
                              : "bg-amber-50 text-amber-600 border border-amber-200"
                          }`}>
                            {submissionStatus === "Submitted" ? "SUBMITTED" : "DRAFT PHASE"}
                          </span>
                          {submittedAt && (
                            <span className="text-xs text-slate-400 font-medium">
                              Last edited {new Date(submittedAt).toLocaleDateString()} at {new Date(submittedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          )}
                        </div>

                        <span className="text-xs font-extrabold text-blue-600 bg-blue-50 px-3 py-1 rounded-full">
                          {submissionProgress}% COMPLETE
                        </span>
                      </div>

                      {/* Title & Description */}
                      <div>
                        <h3 className="text-2xl font-extrabold text-slate-900 tracking-tight">
                          Submission Status: {submissionProgress}% Complete
                        </h3>
                        <p className="text-sm text-slate-500 font-medium mt-1.5 leading-relaxed">
                          {submissionProgress === 100 
                            ? "Great work! Your project has been submitted successfully. You can still update it before the deadline."
                            : submissionProgress >= 60 
                              ? "Good progress! Complete the remaining steps and upload your demo video to finalize your entry."
                              : "Get started by reviewing your team details and submitting your project information."
                          }
                        </p>
                      </div>

                      {/* Progress Bar */}
                      <div className="space-y-2 pt-1">
                        <div className="flex items-center justify-between text-xs font-bold text-slate-500">
                          <span>PROGRESS</span>
                          <span className="text-blue-600">{submissionProgress}%</span>
                        </div>
                        <div className="h-3 bg-slate-100 rounded-full overflow-hidden p-0.5 border border-slate-200/50">
                          <div 
                            className="h-full bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full transition-all duration-700 ease-out" 
                            style={{ width: `${submissionProgress}%` }}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex items-center gap-3 pt-4 border-t border-slate-100">
                      <button 
                        onClick={() => setActiveTab("submission")}
                        className="bg-[#2563EB] hover:bg-blue-700 text-white font-bold text-sm px-6 py-3 rounded-xl shadow-md shadow-blue-500/20 transition-all flex items-center gap-2 cursor-pointer"
                      >
                        {submissionStatus === "Submitted" ? "Update Submission" : "Continue Submission"}
                        <ArrowRight className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => setActiveTab("status")}
                        className="bg-white hover:bg-slate-50 text-slate-700 font-bold text-sm px-6 py-3 rounded-xl border border-slate-200 transition-all cursor-pointer"
                      >
                        Preview Draft
                      </button>
                    </div>
                  </div>
                </div>

                {/* Right Column: Steps + Deadline */}
                <div className="space-y-6">
                  {/* Step 1: Team Review */}
                  <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-sm space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">STEP 1</span>
                      <CircleCheckBig className="w-5 h-5 text-emerald-500" />
                    </div>
                    <h3 className="text-base font-extrabold text-slate-900">Team Review</h3>
                    <p className="text-xs text-slate-500 font-medium">All members verified</p>
                    <span className="text-xs font-bold text-emerald-600">Completed</span>
                  </div>

                  {/* Step 2: Project Details */}
                  <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-sm space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">STEP 2</span>
                      <FileText className="w-5 h-5 text-blue-500" />
                    </div>
                    <h3 className="text-base font-extrabold text-slate-900">Project Details</h3>
                    <p className="text-xs text-slate-500 font-medium">
                      {submissionStatus === "Submitted" ? "100% Complete" : `${submissionProgress}% Complete`}
                    </p>
                    <button onClick={() => setActiveTab("submission")} className="text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1 cursor-pointer">
                      Go to page <ExternalLink className="w-3 h-3" />
                    </button>
                  </div>

                  {/* Final Deadline */}
                  <div className="bg-gradient-to-br from-red-500 to-red-600 rounded-2xl p-5 shadow-lg shadow-red-500/20 text-white space-y-4">
                    <div>
                      <h3 className="text-base font-extrabold">Final Deadline</h3>
                      <p className="text-xs text-red-100 font-medium mt-1">Make sure to submit before the timer runs out to be eligible for prizes.</p>
                    </div>
                    <CountdownTimer />
                  </div>
                </div>
              </div>

              {/* Bottom Grid: Team Progress + Milestones */}
              <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
                
                {/* Team Progress Section */}
                <div className="lg:col-span-3 bg-white border border-slate-200/80 rounded-3xl p-6 shadow-sm space-y-5">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-extrabold text-slate-900">Team Progress</h3>
                    <button onClick={() => setActiveTab("review-team")} className="text-xs font-bold text-blue-600 hover:text-blue-700 cursor-pointer">
                      Manage Team
                    </button>
                  </div>

                  {/* Leader Card */}
                  <div className="flex items-center gap-4 py-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 text-white font-bold flex items-center justify-center text-xs shadow-sm">
                      {getInitials(leaderName)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-bold text-slate-900">{leaderName}</p>
                        <span className="text-[11px] font-semibold text-slate-400">Team Lead</span>
                      </div>
                      <div className="mt-2 h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div className="h-full bg-gradient-to-r from-blue-500 to-blue-600 rounded-full" style={{ width: `${submissionProgress}%` }} />
                      </div>
                    </div>
                  </div>

                  {/* Member Cards */}
                  {members.length > 0 ? members.map((m: any, i: number) => {
                    const colors = [
                      "from-amber-500 to-orange-600",
                      "from-emerald-500 to-teal-600",
                      "from-violet-500 to-purple-600",
                      "from-pink-500 to-rose-600"
                    ];
                    return (
                      <div key={i} className="flex items-center gap-4 py-3 border-t border-slate-50">
                        <div className={`w-10 h-10 rounded-full bg-gradient-to-br ${colors[i % colors.length]} text-white font-bold flex items-center justify-center text-xs shadow-sm`}>
                          {getInitials(m.name || "TM")}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <p className="text-sm font-bold text-slate-900">{m.name || "Team Member"}</p>
                            <span className="text-[11px] font-semibold text-slate-400">{m.role || "Developer"}</span>
                          </div>
                          <div className="mt-2 h-2 bg-slate-100 rounded-full overflow-hidden">
                            <div className={`h-full bg-gradient-to-r ${colors[i % colors.length]} rounded-full`} style={{ width: `${30 + Math.random() * 50}%` }} />
                          </div>
                        </div>
                      </div>
                    );
                  }) : (
                    <div className="text-center py-6 text-sm text-slate-400 font-medium border-t border-slate-50">
                      No additional team members registered
                    </div>
                  )}
                </div>

                {/* Upcoming Milestones */}
                <div className="lg:col-span-2 bg-white border border-slate-200/80 rounded-3xl p-6 shadow-sm space-y-5">
                  <h3 className="text-lg font-extrabold text-slate-900">Upcoming Milestones</h3>

                  <div className="space-y-5">
                    {[
                      { color: "bg-emerald-500", title: "Team Review", desc: "Completed", done: true },
                      { color: "bg-blue-500", title: "Project Submission", desc: submissionStatus === "Submitted" ? "Submitted" : "In Progress", done: submissionStatus === "Submitted" },
                      { color: "bg-amber-500", title: "Final Submission Window", desc: "Deadline approaching", done: false },
                      { color: "bg-slate-300", title: "Grand Finale Ceremony", desc: eventTitle, done: false },
                    ].map((milestone, i) => (
                      <div key={i} className="flex items-start gap-3">
                        <div className="flex flex-col items-center">
                          <div className={`w-3 h-3 rounded-full ${milestone.color} ${milestone.done ? "" : "opacity-60"} mt-0.5`} />
                          {i < 3 && <div className="w-px h-8 bg-slate-200 mt-1" />}
                        </div>
                        <div>
                          <p className={`text-sm font-bold ${milestone.done ? "text-slate-900" : "text-slate-600"}`}>
                            {milestone.title}
                          </p>
                          <p className="text-xs text-slate-400 font-medium mt-0.5">{milestone.desc}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

              </div>
            </div>
          )}

          {/* Project Submission Tab */}
          {activeTab === "submission" && (
            <ProjectSubmissionPage
              targetRegId={targetRegId}
              initialData={{
                githubUrl,
                demoVideoUrl,
                submissionStatus,
                submittedAt
              }}
              onSuccess={() => {
                setSubmissionStatus("Submitted");
                setSubmittedAt(Date.now());
              }}
              embedded={true}
            />
          )}

          {/* Submission Status Tab */}
          {activeTab === "status" && (
            <div className="space-y-6">
              <div>
                <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Submission Status</h1>
                <p className="text-sm text-slate-500 font-medium mt-1">Track evaluation scores, project links, and feedback from jury panelists.</p>
              </div>

              <div className="bg-white border border-slate-200/80 rounded-3xl p-6 sm:p-8 shadow-sm space-y-6">
                
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-100">
                  <div>
                    <h3 className="text-xl font-extrabold text-slate-900">{teamName} Submission Entry</h3>
                    <p className="text-xs text-slate-500 font-medium mt-1">Event Track: {eventTitle}</p>
                  </div>

                  <span className={`self-start sm:self-auto font-bold text-xs px-4 py-1.5 rounded-full ${
                    submissionStatus === "Submitted"
                      ? "bg-emerald-50 text-emerald-600 border border-emerald-200"
                      : "bg-amber-50 text-amber-600 border border-amber-200"
                  }`}>
                    {submissionStatus === "Submitted" ? "Submitted & In Queue" : "Draft / Registered"}
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  
                  <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 space-y-3">
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Project Title</span>
                    <h4 className="text-base font-extrabold text-slate-900">{projectTitle || "Not Submitted Yet"}</h4>
                    {submittedAt && (
                      <div className="flex items-center gap-1.5 text-xs text-slate-500 pt-2 border-t border-slate-200/50">
                        <Clock className="w-3.5 h-3.5 text-slate-400" />
                        <span>Submitted on {new Date(submittedAt).toLocaleDateString()}</span>
                      </div>
                    )}
                  </div>

                  <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 space-y-3">
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Submission Links</span>
                    <div className="space-y-2 text-xs">
                      {githubUrl ? (
                        <a href={githubUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-blue-600 hover:underline font-bold">
                          <GitFork className="w-4 h-4" /> View GitHub Repository <ExternalLink className="w-3 h-3" />
                        </a>
                      ) : (
                        <span className="text-slate-400 font-medium">No GitHub link provided</span>
                      )}

                      {demoVideoUrl ? (
                        <a href={demoVideoUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-blue-600 hover:underline font-bold">
                          <Video className="w-4 h-4" /> Watch Demo Video <ExternalLink className="w-3 h-3" />
                        </a>
                      ) : (
                        <span className="text-slate-400 font-medium block">No Demo Video URL provided</span>
                      )}
                    </div>
                  </div>

                </div>

                <div className="pt-4 flex justify-end">
                  <button
                    onClick={() => setActiveTab("submission")}
                    className="bg-[#2563EB] hover:bg-blue-700 text-white font-bold text-xs px-6 py-2.5 rounded-xl transition-all cursor-pointer"
                  >
                    Edit Project Submission
                  </button>
                </div>

              </div>
            </div>
          )}

        </main>
      </div>
    </div>
  );
};

export default ParticipantDashboardPage;
