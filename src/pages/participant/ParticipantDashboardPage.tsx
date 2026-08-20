import React, { useState, useEffect } from "react";
import { useAuth } from "../../context/AuthContext";
import { Link, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  Users,
  Upload,
  BarChart2,
  LogOut,
  GitFork,
  Video,
  ExternalLink,
  Clock,
  ArrowRight,
  CircleCheckBig,
  FileText,
  HelpCircle
} from "lucide-react";
import SEO from "../../components/layout/SEO";
import TeamReviewPage from "./TeamReviewPage";
import ProjectSubmissionPage from "./ProjectSubmissionPage";
import { db } from "../../config/firebase";
import { collection, getDocs, doc, getDoc } from "firebase/firestore";
import { getAllQuizzes } from "../../services/quizService";
import type { Quiz } from "../../types/quiz";

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
          <div className="bg-[#0B1528] text-white font-black text-2xl rounded-xl w-14 h-14 flex items-center justify-center tabular-nums tracking-wider shadow-inner border border-blue-900/50">
            {t.val}
          </div>
          <span className="text-[10px] font-bold text-blue-200 mt-1 block tracking-wider">{t.unit}</span>
        </div>
      ))}
    </div>
  );
};

export const ParticipantDashboardPage: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState<"dashboard" | "review-team" | "submission" | "status" | "quizzes">("review-team");

  // Real Database State
  const [targetRegId, setTargetRegId] = useState<string>("");
  const [teamName, setTeamName] = useState<string>("");
  const [eventTitle, setEventTitle] = useState<string>("");
  const [teamId, setTeamId] = useState<string>("");
  const [leaderName, setLeaderName] = useState<string>("");
  const [members, setMembers] = useState<any[]>([]);
  const [eventBannerUrl, setEventBannerUrl] = useState<string>("/event-banner.png");
  const [availableQuizzes, setAvailableQuizzes] = useState<Quiz[]>([]);

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

  // Fetch real team, submission data, and quizzes
  useEffect(() => {
    const fetchRealData = async () => {
      const cleanEmail = user?.email?.toLowerCase().trim() || "";

      try {
        // Fetch active quizzes
        getAllQuizzes().then((qzList) => setAvailableQuizzes(qzList.filter(q => q.status === "active"))).catch(() => {});

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
    { id: "quizzes" as const, label: "Online Quiz", icon: HelpCircle },
    { id: "review-team" as const, label: "Team", icon: Users },
    { id: "submission" as const, label: "Submission", icon: Upload },
    { id: "status" as const, label: "Submission Status", icon: BarChart2 },
  ];

  return (
    <div className="h-screen bg-[#F4F7FC] flex font-sans text-slate-800 antialiased overflow-hidden selection:bg-blue-500/20 selection:text-blue-600">
      <SEO
        title="Participant Portal - AI Verse"
        description="Manage team details, submit projects, and view evaluation status."
      />

      {/* Fixed Left Sidebar - Modern Dark Navy Theme */}
      <aside className="w-[260px] h-screen border-r border-[#1E293B] bg-gradient-to-b from-[#0A1128] via-[#0F172A] to-[#0A0F1D] flex flex-col justify-between shrink-0 z-20 sticky top-0 overflow-y-auto shadow-2xl">
        <div className="p-5 space-y-6">
          {/* Logo Header */}
          <Link to="/" className="flex items-center gap-3 px-2 group">
            <div className="relative">
              <img src="/ai_verse.png" alt="AI Verse Logo" className="w-9 h-9 rounded-xl object-contain shadow-md shadow-blue-500/30 ring-1 ring-blue-400/20" />
              <div className="absolute -inset-0.5 bg-blue-500/20 rounded-xl blur-xs -z-10 group-hover:bg-blue-500/40 transition-all" />
            </div>
            <div>
              <span className="text-lg font-extrabold text-white tracking-tight block leading-none">AI Verse</span>
              <span className="text-[10px] text-blue-400 font-semibold tracking-wider block mt-1">Participant Portal</span>
            </div>
          </Link>

          {/* Navigation */}
          <nav className="space-y-1.5">
            {sidebarItems.map((item) => (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`w-full px-4 py-3 rounded-2xl flex items-center gap-3.5 text-sm font-semibold transition-all text-left cursor-pointer ${activeTab === item.id
                    ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold shadow-lg shadow-blue-600/30 ring-1 ring-blue-400/30"
                    : "text-slate-400 hover:bg-white/5 hover:text-white"
                  }`}
              >
                <item.icon className={`w-5 h-5 ${activeTab === item.id ? "text-white" : "text-slate-400"}`} />
                {item.label}
              </button>
            ))}
          </nav>
        </div>

        {/* Bottom Section: User Profile + Logout */}
        <div className="p-5 space-y-3 border-t border-slate-800/80">
          {/* User Profile Card */}
          <div className="flex items-center gap-3 px-3 py-2.5 bg-[#131E3A]/80 border border-blue-900/40 rounded-2xl shadow-inner">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 text-white font-bold flex items-center justify-center text-xs shadow-md shadow-blue-500/30 ring-1 ring-white/20">
              {getInitials(leaderName || user?.name || "P")}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-white truncate">{leaderName || user?.name || "Participant"}</p>
              <p className="text-[11px] text-blue-300/80 font-medium truncate">Team Participant</p>
            </div>
          </div>

          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-2.5 text-slate-400 hover:text-red-400 font-semibold text-sm transition-colors text-left cursor-pointer rounded-xl hover:bg-red-500/10"
          >
            <LogOut className="w-4.5 h-4.5" />
            Logout
          </button>
        </div>
      </aside>

      {/* Main Content (Scrollable Right Panel) */}
      <div className="flex-1 min-w-0 h-screen flex flex-col bg-gradient-to-br from-[#F8FAFC] via-[#EEF2FF]/60 to-[#F1F5F9] overflow-y-auto">

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
                  <h1 className="text-3xl font-extrabold text-[#0F172A] tracking-tight">
                    Welcome back, {(leaderName || user?.name || "Participant").split(" ")[0]}
                  </h1>
                  <div className="flex items-center gap-3 mt-2">
                    <span className="text-xs font-bold text-blue-700 bg-blue-50 px-3 py-1 rounded-full border border-blue-200/80">Team: {teamName}</span>
                    <span className="text-slate-300 font-light">|</span>
                    <span className="text-xs text-slate-500 font-medium flex items-center gap-1.5">
                      Team ID: 
                      <span className="bg-[#0F172A] text-blue-300 font-mono text-xs px-2.5 py-0.5 rounded-md font-bold border border-slate-800">
                        {teamId}
                      </span>
                    </span>
                  </div>
                </div>

                {/* Hackathon Live Badge */}
                <div className="flex items-center gap-2 bg-[#0F172A] border border-slate-800 text-white rounded-full px-4 py-2 shadow-md">
                  <span className="relative flex h-2.5 w-2.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
                  </span>
                  <span className="text-xs font-bold text-slate-100">{eventTitle} — Live</span>
                </div>
              </div>

              {/* Main Content Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                {/* Left Column: Submission Status Card with Event Banner */}
                <div className="lg:col-span-2 bg-white border border-slate-200/90 rounded-3xl shadow-sm hover:shadow-md transition-shadow overflow-hidden flex flex-col">
                  {/* Top: Full-bleed Event Banner */}
                  <div className="relative h-48 sm:h-56 w-full overflow-hidden bg-[#0A1128] flex items-end p-6 sm:p-8">
                    {/* Banner Background Image */}
                    <img
                      src={eventBannerUrl || "/event-banner.png"}
                      alt="Event Banner"
                      className="absolute inset-0 w-full h-full object-cover opacity-85"
                    />
                    {/* Gradient Overlay for text readability & visual depth */}
                    <div className="absolute inset-0 bg-gradient-to-t from-[#0B132B] via-[#0F172A]/50 to-transparent" />

                    {/* Event Banner Overlay Content */}
                    <div className="relative z-10 w-full flex items-end justify-between">
                      <div>
                        <div className="flex items-center gap-2 mb-2">
                          <span className="bg-gradient-to-r from-blue-600 to-indigo-600 backdrop-blur-md text-white text-[11px] font-extrabold uppercase tracking-wider px-3 py-1 rounded-full shadow-md shadow-blue-500/20">
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
                          <span className={`text-xs font-extrabold px-3 py-1 rounded-full ${submissionStatus === "Submitted"
                              ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                              : "bg-amber-50 text-amber-700 border border-amber-200"
                            }`}>
                            {submissionStatus === "Submitted" ? "SUBMITTED" : "DRAFT PHASE"}
                          </span>
                          {submittedAt && (
                            <span className="text-xs text-slate-400 font-medium">
                              Last edited {new Date(submittedAt).toLocaleDateString()} at {new Date(submittedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          )}
                        </div>

                        <span className="text-xs font-extrabold text-blue-700 bg-blue-50 px-3.5 py-1 rounded-full border border-blue-200/70">
                          {submissionProgress}% COMPLETE
                        </span>
                      </div>

                      {/* Title & Description */}
                      <div>
                        <h3 className="text-2xl font-extrabold text-[#0F172A] tracking-tight">
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
                        <div className="flex items-center justify-between text-xs font-bold text-slate-600">
                          <span className="text-[#0F172A] tracking-wider uppercase text-[11px]">Submission Progress</span>
                          <span className="text-blue-600 font-extrabold">{submissionProgress}%</span>
                        </div>
                        <div className="h-3.5 bg-slate-100 rounded-full overflow-hidden p-0.5 border border-slate-200">
                          <div
                            className="h-full bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-500 rounded-full transition-all duration-700 ease-out shadow-xs"
                            style={{ width: `${submissionProgress}%` }}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex items-center gap-3 pt-4 border-t border-slate-100">
                      <button
                        onClick={() => setActiveTab("submission")}
                        className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold text-sm px-6 py-3 rounded-xl shadow-md shadow-blue-600/25 transition-all flex items-center gap-2 cursor-pointer"
                      >
                        {submissionStatus === "Submitted" ? "Update Submission" : "Continue Submission"}
                        <ArrowRight className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setActiveTab("status")}
                        className="bg-white hover:bg-slate-50 text-slate-700 font-bold text-sm px-6 py-3 rounded-xl border border-slate-200 hover:border-slate-300 transition-all cursor-pointer shadow-xs"
                      >
                        Preview Draft
                      </button>
                    </div>
                  </div>
                </div>

                {/* Right Column: Steps + Deadline */}
                <div className="space-y-6">
                  {/* Step 1: Team Review */}
                  <div className="bg-white border border-slate-200/90 border-t-4 border-t-emerald-500 rounded-2xl p-5 shadow-sm space-y-2 hover:shadow-md transition-shadow">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">STEP 1</span>
                      <div className="w-7 h-7 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center">
                        <CircleCheckBig className="w-4.5 h-4.5" />
                      </div>
                    </div>
                    <h3 className="text-base font-extrabold text-[#0F172A]">Team Review</h3>
                    <p className="text-xs text-slate-500 font-medium">All members verified</p>
                    <span className="text-xs font-bold text-emerald-600 block pt-1">Completed</span>
                  </div>

                  {/* Step 2: Project Details */}
                  <div className="bg-white border border-slate-200/90 border-t-4 border-t-blue-600 rounded-2xl p-5 shadow-sm space-y-2 hover:shadow-md transition-shadow">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">STEP 2</span>
                      <div className="w-7 h-7 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center">
                        <FileText className="w-4.5 h-4.5" />
                      </div>
                    </div>
                    <h3 className="text-base font-extrabold text-[#0F172A]">Project Details</h3>
                    <p className="text-xs text-slate-500 font-medium">
                      {submissionStatus === "Submitted" ? "100% Complete" : `${submissionProgress}% Complete`}
                    </p>
                    <button onClick={() => setActiveTab("submission")} className="text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1 cursor-pointer pt-1">
                      Go to page <ExternalLink className="w-3 h-3" />
                    </button>
                  </div>

                  {/* Final Deadline - Dark Blue / Navy Accent with Glowing Elements */}
                  <div className="bg-gradient-to-br from-[#0A1128] via-[#0F172A] to-[#1E1B4B] border border-slate-800 rounded-2xl p-5 shadow-xl shadow-slate-900/10 text-white space-y-4 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-blue-600/10 rounded-full blur-2xl -z-0" />
                    <div className="relative z-10">
                      <div className="flex items-center justify-between mb-1">
                        <h3 className="text-base font-extrabold text-white">Final Deadline</h3>
                        <span className="text-[10px] font-extrabold px-2.5 py-0.5 rounded-full bg-red-500/20 text-red-400 border border-red-500/30">
                          TIME CRITICAL
                        </span>
                      </div>
                      <p className="text-xs text-blue-200/75 font-medium mt-1">Make sure to submit before the timer runs out to be eligible for prizes.</p>
                    </div>
                    <div className="relative z-10">
                      <CountdownTimer />
                    </div>
                  </div>
                </div>
              </div>

              {/* Bottom Grid: Team Progress + Milestones */}
              <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">

                {/* Team Progress Section */}
                <div className="lg:col-span-3 bg-white border border-slate-200/90 rounded-3xl p-6 shadow-sm space-y-5">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-extrabold text-[#0F172A]">Team Progress</h3>
                    <button onClick={() => setActiveTab("review-team")} className="text-xs font-bold text-blue-600 hover:text-blue-700 cursor-pointer">
                      Manage Team
                    </button>
                  </div>

                  {/* Leader Card */}
                  <div className="flex items-center gap-4 py-3 bg-blue-50/40 rounded-2xl px-4 border border-blue-100/60">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-600 to-indigo-600 text-white font-bold flex items-center justify-center text-xs shadow-md shadow-blue-500/20 ring-2 ring-white">
                      {getInitials(leaderName)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-bold text-[#0F172A]">{leaderName}</p>
                        <span className="text-[10px] font-bold text-blue-700 bg-blue-100/70 px-2 py-0.5 rounded-md">Team Lead</span>
                      </div>
                      <div className="mt-2 h-2 bg-slate-200/80 rounded-full overflow-hidden">
                        <div className="h-full bg-gradient-to-r from-blue-600 to-indigo-600 rounded-full" style={{ width: `${submissionProgress}%` }} />
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
                      <div key={i} className="flex items-center gap-4 py-3 border-t border-slate-100">
                        <div className={`w-10 h-10 rounded-full bg-gradient-to-br ${colors[i % colors.length]} text-white font-bold flex items-center justify-center text-xs shadow-sm`}>
                          {getInitials(m.name || "TM")}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <p className="text-sm font-bold text-[#0F172A]">{m.name || "Team Member"}</p>
                            <span className="text-[11px] font-semibold text-slate-500">{m.role || "Developer"}</span>
                          </div>
                          <div className="mt-2 h-2 bg-slate-100 rounded-full overflow-hidden">
                            <div className={`h-full bg-gradient-to-r ${colors[i % colors.length]} rounded-full`} style={{ width: `${30 + Math.random() * 50}%` }} />
                          </div>
                        </div>
                      </div>
                    );
                  }) : (
                    <div className="text-center py-6 text-sm text-slate-400 font-medium border-t border-slate-100">
                      No additional team members registered
                    </div>
                  )}
                </div>

                {/* Upcoming Milestones */}
                <div className="lg:col-span-2 bg-white border border-slate-200/90 rounded-3xl p-6 shadow-sm space-y-5">
                  <h3 className="text-lg font-extrabold text-[#0F172A]">Upcoming Milestones</h3>

                  <div className="space-y-5">
                    {[
                      { color: "bg-emerald-500", title: "Team Review", desc: "Completed", done: true },
                      { color: "bg-blue-600", title: "Project Submission", desc: submissionStatus === "Submitted" ? "Submitted" : "In Progress", done: submissionStatus === "Submitted" },
                      { color: "bg-amber-500", title: "Final Submission Window", desc: "Deadline approaching", done: false },
                      { color: "bg-slate-400", title: "Grand Finale Ceremony", desc: eventTitle, done: false },
                    ].map((milestone, i) => (
                      <div key={i} className="flex items-start gap-3">
                        <div className="flex flex-col items-center">
                          <div className={`w-3 h-3 rounded-full ${milestone.color} ${milestone.done ? "ring-4 ring-blue-500/20" : "opacity-60"} mt-0.5`} />
                          {i < 3 && <div className="w-px h-8 bg-slate-200 mt-1" />}
                        </div>
                        <div>
                          <p className={`text-sm font-bold ${milestone.done ? "text-[#0F172A]" : "text-slate-600"}`}>
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
                <h1 className="text-3xl font-extrabold text-[#0F172A] tracking-tight">Submission Status</h1>
                <p className="text-sm text-slate-500 font-medium mt-1">Track evaluation scores, project links, and feedback from jury panelists.</p>
              </div>

              <div className="bg-white border border-slate-200/90 rounded-3xl p-6 sm:p-8 shadow-sm space-y-6">

                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-100">
                  <div>
                    <h3 className="text-xl font-extrabold text-[#0F172A]">{teamName} Submission Entry</h3>
                    <p className="text-xs text-slate-500 font-medium mt-1">Event Track: <span className="font-semibold text-blue-600">{eventTitle}</span></p>
                  </div>

                  <span className={`self-start sm:self-auto font-bold text-xs px-4 py-1.5 rounded-full ${submissionStatus === "Submitted"
                      ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                      : "bg-amber-50 text-amber-700 border border-amber-200"
                    }`}>
                    {submissionStatus === "Submitted" ? "Submitted & In Queue" : "Draft / Registered"}
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                  <div className="bg-slate-50/80 border border-slate-200/80 rounded-2xl p-5 space-y-3">
                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Project Title</span>
                    <h4 className="text-base font-extrabold text-[#0F172A]">{projectTitle || "Not Submitted Yet"}</h4>
                    {submittedAt && (
                      <div className="flex items-center gap-1.5 text-xs text-slate-500 pt-2 border-t border-slate-200/60">
                        <Clock className="w-3.5 h-3.5 text-slate-400" />
                        <span>Submitted on {new Date(submittedAt).toLocaleDateString()}</span>
                      </div>
                    )}
                  </div>

                  <div className="bg-slate-50/80 border border-slate-200/80 rounded-2xl p-5 space-y-3">
                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Submission Links</span>
                    <div className="space-y-2.5 text-xs">
                      {githubUrl ? (
                        <a href={githubUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-blue-600 hover:text-blue-700 font-bold">
                          <GitFork className="w-4 h-4 text-blue-500" /> View GitHub Repository <ExternalLink className="w-3 h-3" />
                        </a>
                      ) : (
                        <span className="text-slate-400 font-medium">No GitHub link provided</span>
                      )}

                      {demoVideoUrl ? (
                        <a href={demoVideoUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-blue-600 hover:text-blue-700 font-bold">
                          <Video className="w-4 h-4 text-blue-500" /> Watch Demo Video <ExternalLink className="w-3 h-3" />
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
                    className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold text-xs px-6 py-2.5 rounded-xl shadow-md shadow-blue-600/20 transition-all cursor-pointer"
                  >
                    Edit Project Submission
                  </button>
                </div>

              </div>
            </div>
          )}

          {/* TAB 5: ONLINE QUIZ & ASSESSMENTS */}
          {activeTab === "quizzes" && (
            <div className="max-w-4xl w-full mx-auto space-y-6">
              <div className="bg-white border border-slate-200/90 rounded-3xl p-6 sm:p-8 shadow-sm space-y-6">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="bg-blue-50 text-blue-700 border border-blue-200/60 text-[10px] font-extrabold uppercase px-3 py-1 rounded-full">
                      EXAMINATION HUB
                    </span>
                  </div>
                  <h2 className="text-xl sm:text-2xl font-black text-[#0F172A] mt-2 tracking-tight">
                    Online Quizzes & Assessments
                  </h2>
                  <p className="text-xs sm:text-sm text-slate-500 font-medium mt-1">
                    Complete your assigned track quizzes within the allotted time. Your answers are continually autosaved.
                  </p>
                </div>

                {availableQuizzes.length === 0 ? (
                  <div className="bg-slate-50 border border-slate-200 rounded-2xl p-10 text-center space-y-3">
                    <HelpCircle className="w-10 h-10 text-slate-300 mx-auto" />
                    <h3 className="text-sm font-extrabold text-[#0F172A]">No Active Quizzes Scheduled</h3>
                    <p className="text-xs text-slate-400 font-medium">Check back when the event organizers publish the assessment.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {availableQuizzes.map((quiz) => {
                      const now = Date.now();
                      const isLive = Boolean(
                        quiz.status === "active" &&
                        quiz.scheduledStartTime &&
                        quiz.scheduledStartTime <= now &&
                        (!quiz.scheduledEndTime || quiz.scheduledEndTime > now)
                      );
                      const isCompleted = Boolean(
                        quiz.status === "completed" ||
                        (quiz.scheduledEndTime && quiz.scheduledEndTime <= now && quiz.scheduledStartTime)
                      );
                      const isUpcoming = Boolean(quiz.scheduledStartTime && quiz.scheduledStartTime > now);

                      return (
                        <div
                          key={quiz.id}
                          className="bg-slate-50 border border-slate-200 hover:border-blue-300 rounded-2xl p-5 flex flex-col justify-between space-y-4 transition-all"
                        >
                          <div className="space-y-2">
                            <div className="flex items-center justify-between">
                              <span className="text-[10px] font-extrabold text-blue-600 bg-blue-50 px-2.5 py-0.5 rounded-full border border-blue-200/60">
                                {quiz.track || "General"}
                              </span>
                              
                              {isLive ? (
                                <span className="text-[10px] font-extrabold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200 flex items-center gap-1">
                                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> Live Now
                                </span>
                              ) : isCompleted ? (
                                <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-2.5 py-0.5 rounded-full border border-slate-200">
                                  Concluded
                                </span>
                              ) : isUpcoming ? (
                                <span className="text-[10px] font-bold text-indigo-700 bg-indigo-50 px-2.5 py-0.5 rounded-full border border-indigo-200 flex items-center gap-1">
                                  <Clock className="w-3 h-3 text-indigo-500" /> Scheduled
                                </span>
                              ) : (
                                <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-2.5 py-0.5 rounded-full border border-amber-200 flex items-center gap-1">
                                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-ping" /> Waiting for Admin
                                </span>
                              )}
                            </div>

                            <h3 className="text-base font-extrabold text-[#0F172A] leading-tight">{quiz.title}</h3>
                            <p className="text-xs text-slate-500 font-medium line-clamp-2">{quiz.description}</p>
                          </div>

                          <div className="pt-2 flex items-center justify-between border-t border-slate-200/60">
                            <span className="text-xs font-bold text-slate-500">
                              {quiz.questions?.length || quiz.questionsCount || 0} Questions • {quiz.durationMinutes}m
                            </span>

                            <Link
                              to={`/participant/quiz/${quiz.id}/lobby`}
                              className={`text-white font-bold text-xs px-4 py-2 rounded-xl shadow-xs transition-all flex items-center gap-1.5 cursor-pointer ${
                                isLive 
                                  ? "bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700" 
                                  : "bg-[#0F172A] hover:bg-slate-800"
                              }`}
                            >
                              <span>{isLive ? "Enter Exam" : "Enter Lobby"}</span>
                              <ArrowRight className="w-3.5 h-3.5" />
                            </Link>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

              </div>
            </div>
          )}

        </main>
      </div>
    </div>
  );
};

export default ParticipantDashboardPage;
