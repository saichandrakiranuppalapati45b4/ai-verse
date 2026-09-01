import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { 
  CheckCircle2,
  Mail,
  Users,
  Sparkles,
  Award
} from "lucide-react";
import Button from "../../components/ui/Button";
import SEO from "../../components/layout/SEO";
import { db } from "../../config/firebase";
import { collection, getDocs } from "firebase/firestore";
import { userService } from "../../services/userService";
import { formatRoleLabel } from "../faculty/UserManagementPage";

// Import local assets
import heroImg from "../../assets/images/aether_hero.png";

const GithubIcon: React.FC<{ className?: string }> = ({ className = "h-4 w-4" }) => (
  <svg className={`${className} fill-current`} viewBox="0 0 24 24">
    <path d="M12 2C6.477 2 2 6.477 2 12c0 4.42 2.865 8.167 6.839 9.49.5.092.682-.217.682-.482 0-.237-.008-.866-.013-1.7-2.782.603-3.369-1.34-3.369-1.34-.454-1.156-1.11-1.464-1.11-1.464-.908-.62.069-.008.069-.008 1.003.07 1.531 1.03 1.531 1.03.892 1.529 2.341 1.087 2.91.831.092-.646.35-1.086.636-1.336-2.22-.253-4.555-1.11-4.555-4.943 0-1.091.39-1.984 1.029-2.683-.103-.253-.446-1.27.098-2.647 0 0 .84-.269 2.75 1.025A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.294 2.747-1.025 2.747-1.025.546 1.377.203 2.394.1 2.647.64.699 1.028 1.592 1.028 2.683 0 3.842-2.339 4.687-4.566 4.935.359.309.678.919.678 1.852 0 1.336-.012 2.415-.012 2.743 0 .267.18.579.688.481C19.137 20.164 22 16.418 22 12c0-5.523-4.477-10-10-10z"/>
  </svg>
);

const LinkedinIcon: React.FC<{ className?: string }> = ({ className = "h-4 w-4" }) => (
  <svg className={`${className} fill-current`} viewBox="0 0 24 24">
    <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z"/>
  </svg>
);

interface Leader {
  id?: string;
  name: string;
  role: string;
  image: string;
  bio: string;
  github?: string;
  linkedin?: string;
  twitter?: string;
  email?: string;
}

interface Member {
  id?: string;
  name: string;
  role: string;
  image: string;
  pills: string[];
  bio?: string;
  github?: string;
  linkedin?: string;
  email?: string;
}

// System administrative / staff accounts to exclude from public Team display
const EXCLUDED_SYSTEM_EMAILS = [
  "admin@aiverse.in",
  "facultycoordinator@aiverse.in",
  "studentorganizer@aiverse.in",
  "jurry@aiverse.in",
  "jury@aiverse.in",
  "participant@aiverse.in"
];

const BLANK_AVATAR = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%23CBD5E1'%3E%3Cpath d='M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z'/%3E%3C/svg%3E";

const TeamPage: React.FC = () => {
  const [dbMembers, setDbMembers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTeam = async () => {
      try {
        setLoading(true);
        const combinedList: any[] = [];
        const seenEmails = new Set<string>();

        // 1. Fetch all members from Supabase users table
        try {
          const supabaseUsers = await userService.getUsers();
          if (supabaseUsers && supabaseUsers.length > 0) {
            supabaseUsers.forEach((u) => {
              const email = (u.email || "").toLowerCase().trim();
              if (email) seenEmails.add(email);
              combinedList.push({
                id: u.id,
                name: u.name || u.display_name || "Unnamed Member",
                email: u.email || "",
                role: u.role || "Student Member",
                position: u.position || u.role || "",
                roleType: u.role || "Organizer",
                status: u.status || "Active",
                image: u.image || "",
                bio: u.bio || "",
                linkedin: u.linkedin || "",
                github: u.github || "",
                phone: u.phone || ""
              });
            });
          }
        } catch (supaErr) {
          console.warn("[TeamPage] Notice fetching team from Supabase:", supaErr);
        }

        // 2. Fetch from Firestore users collection
        try {
          const usersSnap = await getDocs(collection(db, "users"));
          usersSnap.forEach((docSnap) => {
            const data = docSnap.data();
            const email = (data.email || "").toLowerCase().trim();
            if (email && seenEmails.has(email)) {
              // Merge/enrich missing metadata
              const idx = combinedList.findIndex(item => (item.email || "").toLowerCase().trim() === email);
              if (idx >= 0) {
                combinedList[idx] = {
                  ...combinedList[idx],
                  image: combinedList[idx].image || data.image || "",
                  bio: combinedList[idx].bio || data.bio || "",
                  linkedin: combinedList[idx].linkedin || data.linkedin || "",
                  github: combinedList[idx].github || data.github || "",
                  position: combinedList[idx].position || data.position || data.role || "",
                };
              }
            } else if (email) {
              seenEmails.add(email);
              combinedList.push({
                id: docSnap.id,
                name: data.name || data.displayName || data.teamLeadName || "Unnamed Member",
                email: data.email || "",
                role: data.role || "Student Member",
                position: data.position || data.role || "",
                roleType: data.roleType || data.role || "Organizer",
                status: data.status || "Active",
                image: data.image || "",
                bio: data.bio || "",
                linkedin: data.linkedin || "",
                github: data.github || "",
                phone: data.phone || ""
              });
            }
          });
        } catch (fsErr) {
          console.warn("[TeamPage] Notice fetching users from Firestore:", fsErr);
        }

        // 3. Fetch from Firestore organizers collection
        try {
          const organizersSnap = await getDocs(collection(db, "organizers"));
          organizersSnap.forEach((docSnap) => {
            const data = docSnap.data();
            const email = (data.email || "").toLowerCase().trim();
            if (email && seenEmails.has(email)) {
              const idx = combinedList.findIndex(item => (item.email || "").toLowerCase().trim() === email);
              if (idx >= 0) {
                combinedList[idx] = {
                  ...combinedList[idx],
                  image: combinedList[idx].image || data.image || "",
                  bio: combinedList[idx].bio || data.bio || "",
                  linkedin: combinedList[idx].linkedin || data.linkedin || "",
                  github: combinedList[idx].github || data.github || "",
                  position: combinedList[idx].position || data.position || data.roleType || "",
                };
              }
            } else if (email) {
              seenEmails.add(email);
              combinedList.push({
                id: docSnap.id,
                name: data.name || data.displayName || "Unnamed Member",
                email: data.email || "",
                role: data.role || data.roleType || "Organizer",
                position: data.position || data.roleType || "",
                roleType: data.roleType || data.role || "Organizer",
                status: data.status || "Active",
                image: data.image || "",
                bio: data.bio || "",
                linkedin: data.linkedin || "",
                github: data.github || "",
                phone: data.phone || ""
              });
            }
          });
        } catch (orgErr) {
          console.warn("[TeamPage] Notice fetching organizers from Firestore:", orgErr);
        }

        // 4. FILTER OUT EXCLUDED SYSTEM SERVICE ACCOUNTS (Red Box in Admin)
        const validMembers = combinedList.filter((m) => {
          const email = (m.email || "").toLowerCase().trim();
          const name = (m.name || "").toLowerCase().trim();
          const role = (m.role || "").toLowerCase().trim();
          const status = (m.status || "Active").toLowerCase().trim();

          // Exclude system administrative service accounts
          if (EXCLUDED_SYSTEM_EMAILS.includes(email)) return false;
          if (name === "system admin" || name === "jury evaluator" || name === "jury panelist") return false;
          if (role === "system admin" || role === "jury evaluator") return false;
          if (status === "deactivated") return false;

          return true;
        });

        setDbMembers(validMembers);
      } catch (err) {
        console.error("Error fetching team members:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchTeam();
  }, []);

  // Helper to categorize roles
  const isLeaderRole = (m: any) => {
    const roleStr = `${m.role || ""} ${m.position || ""} ${m.roleType || ""}`.toLowerCase();
    return (
      roleStr.includes("faculty") ||
      roleStr.includes("lead") ||
      roleStr.includes("convener") ||
      roleStr.includes("conviner") ||
      roleStr.includes("president") ||
      roleStr.includes("head") ||
      roleStr.includes("advisor") ||
      roleStr.includes("director")
    );
  };

  const isOrganizerRole = (m: any) => {
    if (isLeaderRole(m)) return false;
    const roleStr = `${m.role || ""} ${m.position || ""} ${m.roleType || ""}`.toLowerCase();
    return (
      roleStr.includes("organizer") ||
      roleStr.includes("developer") ||
      roleStr.includes("designer") ||
      roleStr.includes("manager") ||
      roleStr.includes("media") ||
      roleStr.includes("marketing") ||
      roleStr.includes("photography") ||
      roleStr.includes("pr") ||
      roleStr.includes("tech")
    );
  };

  // Categorize members
  const leaders: Leader[] = dbMembers
    .filter(isLeaderRole)
    .map((m) => ({
      id: m.id,
      name: m.name,
      role: formatRoleLabel(m.position || m.role || m.roleType || "Faculty Coordinator"),
      image: m.image || BLANK_AVATAR,
      bio: m.bio || "Leading AI & Data Science initiatives and student excellence at VIT Bhimavaram.",
      github: m.github || "",
      linkedin: m.linkedin || "",
      email: m.email || ""
    }));

  const organizers: Member[] = dbMembers
    .filter((m) => isOrganizerRole(m) || (!isLeaderRole(m) && dbMembers.filter(isLeaderRole).length === 0))
    .map((m) => ({
      id: m.id,
      name: m.name,
      role: formatRoleLabel(m.position || m.role || m.roleType || "Student Organizer"),
      image: m.image || BLANK_AVATAR,
      pills: [formatRoleLabel(m.position || m.role || m.roleType || "Organizer").toUpperCase()],
      bio: m.bio || "",
      github: m.github || "",
      linkedin: m.linkedin || "",
      email: m.email || ""
    }));

  const volunteers: Member[] = dbMembers
    .filter((m) => !isLeaderRole(m) && !isOrganizerRole(m))
    .map((m) => ({
      id: m.id,
      name: m.name,
      role: formatRoleLabel(m.position || m.role || m.roleType || "Student Member"),
      image: m.image || BLANK_AVATAR,
      pills: [formatRoleLabel(m.position || m.role || m.roleType || "Member").toUpperCase()],
      bio: m.bio || "",
      github: m.github || "",
      linkedin: m.linkedin || "",
      email: m.email || ""
    }));

  const fadeInUp = {
    hidden: { opacity: 0, y: 25 },
    visible: { 
      opacity: 1, 
      y: 0,
      transition: { duration: 0.5, ease: "easeOut" as const }
    }
  };

  const staggerContainer = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  return (
    <div className="overflow-hidden bg-[#F8FAFC]">
      <SEO 
        title="Team - The Minds Behind AI Verse | VIT Bhimavaram" 
        description="Meet the student leaders, data scientists, and developers powering AI Verse VITB at Vishnu Institute of Technology, Bhimavaram (VIT Bhimavaram)."
        keywords="AI Verse Team, aiversevitb, AI Verse VITB, VIT Bhimavaram, Vishnu Institute of Technology, Student Developers, Data Science"
      />
      
      {/* ================= HERO SECTION ================= */}
      <section className="relative py-20 px-4 sm:px-6 lg:px-8 bg-slate-950 text-white rounded-b-[40px] shadow-lg">
        {/* Floating tech background graph */}
        <div className="absolute inset-0 overflow-hidden rounded-b-[40px] -z-10">
          <img 
            src={heroImg} 
            alt="Team Background" 
            className="w-full h-full object-cover opacity-20 object-center"
          />
          <div className="absolute inset-0 bg-slate-950/70"></div>
        </div>

        <div className="max-w-4xl mx-auto text-center space-y-6 relative z-10 py-6">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5 }}
            className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-500/10 border border-blue-400/20 text-blue-300 text-xs font-bold tracking-wide uppercase"
          >
            <Sparkles className="h-3.5 w-3.5 text-blue-400" />
            <span>AI Verse Club • VIT Bhimavaram</span>
          </motion.div>

          <motion.h1 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight leading-tight text-white"
          >
            The Minds Behind <br />
            <span className="bg-gradient-to-r from-aether-blue-400 to-sky-300 bg-clip-text text-transparent">AI Verse</span>
          </motion.h1>

          {/* Description text card box */}
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="max-w-2xl mx-auto bg-white/10 backdrop-blur-md border border-white/10 p-6 rounded-2xl shadow-sm text-slate-200 text-xs sm:text-sm md:text-base font-normal leading-relaxed"
          >
            Our collective is composed of pioneers in large-scale artificial intelligence, data science, cognitive computing, and digital architecture at Vishnu Institute of Technology, Bhimavaram (VIT Bhimavaram).
          </motion.div>
        </div>
      </section>

      {/* Loading state indicator */}
      {loading && (
        <div className="py-20 text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-4 border-slate-200 border-t-aether-blue-600 mx-auto mb-4" />
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Loading AI Verse Team...</p>
        </div>
      )}

      {/* ================= LEADERSHIP SECTION ================= */}
      {!loading && leaders.length > 0 && (
        <section className="py-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-left mb-12 flex items-center justify-between">
            <div>
              <span className="text-xs uppercase font-extrabold tracking-widest text-aether-blue-600 flex items-center gap-1.5">
                <Award className="h-3.5 w-3.5" />
                Leadership
              </span>
              <h2 className="text-3xl font-extrabold text-aether-dark mt-1">
                Visionary Guidance
              </h2>
            </div>
          </div>

          {/* Leadership Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-8">
            {leaders.map((leader, idx) => (
              <motion.div
                key={leader.id || idx}
                variants={fadeInUp}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, margin: "-50px" }}
                className="bg-white rounded-[28px] shadow-sm border border-slate-100 p-6 sm:p-7 flex flex-col sm:flex-row gap-6 items-center sm:items-start text-left hover:shadow-card transition-all duration-300 group"
              >
                {/* Leader Photo */}
                <div className="w-28 sm:w-36 aspect-[4/5] rounded-2xl overflow-hidden shrink-0 bg-slate-50 relative border border-slate-100 shadow-sm">
                  <img 
                    src={leader.image} 
                    alt={leader.name} 
                    className="w-full h-full object-cover object-top group-hover:scale-105 transition-transform duration-300"
                  />
                </div>

                {/* Leader Bio Details */}
                <div className="flex flex-col justify-between py-1 h-full space-y-4 flex-1">
                  <div className="space-y-2">
                    <div>
                      <h3 className="text-xl font-extrabold text-aether-dark leading-tight">
                        {leader.name}
                      </h3>
                      <span className="inline-block text-xs font-bold text-aether-blue-600 bg-blue-50 px-2.5 py-0.5 rounded-full mt-1.5 border border-blue-100/50">
                        {leader.role}
                      </span>
                    </div>
                    <p className="text-slate-500 text-xs sm:text-sm font-normal leading-relaxed pt-1">
                      {leader.bio}
                    </p>
                  </div>

                  {/* Social & Contact Links */}
                  <div className="flex items-center gap-3 pt-2 text-slate-400">
                    {leader.github && (
                      <a href={leader.github} target="_blank" rel="noreferrer" className="p-2 rounded-xl bg-slate-50 hover:bg-slate-100 hover:text-slate-900 transition-colors" title="GitHub">
                        <GithubIcon className="h-4 w-4" />
                      </a>
                    )}
                    {leader.linkedin && (
                      <a href={leader.linkedin} target="_blank" rel="noreferrer" className="p-2 rounded-xl bg-slate-50 hover:bg-blue-50 hover:text-blue-600 transition-colors" title="LinkedIn">
                        <LinkedinIcon className="h-4 w-4" />
                      </a>
                    )}
                    {leader.email && (
                      <a href={`mailto:${leader.email}`} className="p-2 rounded-xl bg-slate-50 hover:bg-sky-50 hover:text-sky-600 transition-colors" title="Email">
                        <Mail className="h-4 w-4" />
                      </a>
                    )}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </section>
      )}

      {/* ================= CLUB ORGANIZERS & CORE TEAM ================= */}
      {!loading && organizers.length > 0 && (
        <section className="py-12 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 border-t border-slate-100">
          <div className="flex items-center gap-4 mb-10 text-left">
            <div>
              <span className="text-xs uppercase font-extrabold tracking-widest text-aether-blue-600 flex items-center gap-1.5">
                <Users className="h-3.5 w-3.5" />
                Core Team
              </span>
              <h2 className="text-2xl font-extrabold text-aether-dark mt-0.5">
                Club Organizers
              </h2>
            </div>
            <div className="h-[2px] bg-slate-100 flex-grow ml-4 mt-4" />
          </div>

          <motion.div 
            variants={staggerContainer}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-50px" }}
            className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6"
          >
            {organizers.map((member, idx) => (
              <motion.div
                key={member.id || idx}
                variants={fadeInUp}
                className="bg-white rounded-[24px] shadow-sm border border-slate-100 p-6 text-center flex flex-col items-center justify-between hover:shadow-card hover:-translate-y-1 transition-all duration-300 group"
              >
                <div className="space-y-4 w-full">
                  {/* Round Avatar */}
                  <div className="w-20 h-20 rounded-2xl overflow-hidden border-2 border-white shadow-md bg-slate-50 mx-auto group-hover:scale-105 transition-transform duration-300">
                    <img 
                      src={member.image || BLANK_AVATAR} 
                      alt={member.name} 
                      className="w-full h-full object-cover" 
                    />
                  </div>
                  <div>
                    <h3 className="text-base font-extrabold text-aether-dark">{member.name}</h3>
                    <p className="text-xs text-slate-500 font-semibold mt-0.5">{member.role}</p>
                    {member.bio && (
                      <p className="text-[11px] text-slate-400 mt-2 line-clamp-2 leading-relaxed font-normal">
                        {member.bio}
                      </p>
                    )}
                  </div>
                </div>

                {/* Tag Pills & Socials */}
                <div className="w-full pt-4 mt-auto space-y-3">
                  <div className="flex flex-wrap items-center justify-center gap-1.5">
                    {member.pills.map((pill, pIdx) => (
                      <span key={pIdx} className="text-[9px] font-extrabold text-aether-blue-600 bg-aether-blue-50/70 border border-aether-blue-100/40 px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                        {pill}
                      </span>
                    ))}
                  </div>

                  {(member.github || member.linkedin || member.email) && (
                    <div className="flex items-center justify-center gap-2 pt-2 border-t border-slate-50 text-slate-400">
                      {member.github && (
                        <a href={member.github} target="_blank" rel="noreferrer" className="p-1 hover:text-slate-900 transition-colors" title="GitHub">
                          <GithubIcon className="h-3.5 w-3.5" />
                        </a>
                      )}
                      {member.linkedin && (
                        <a href={member.linkedin} target="_blank" rel="noreferrer" className="p-1 hover:text-blue-600 transition-colors" title="LinkedIn">
                          <LinkedinIcon className="h-3.5 w-3.5" />
                        </a>
                      )}
                      {member.email && (
                        <a href={`mailto:${member.email}`} className="p-1 hover:text-sky-600 transition-colors" title="Email">
                          <Mail className="h-3.5 w-3.5" />
                        </a>
                      )}
                    </div>
                  )}
                </div>
              </motion.div>
            ))}
          </motion.div>
        </section>
      )}

      {/* ================= VOLUNTEERS & CONTRIBUTORS ================= */}
      {!loading && volunteers.length > 0 && (
        <section className="py-12 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 border-t border-slate-100">
          <div className="flex items-center gap-4 mb-10 text-left">
            <div>
              <span className="text-xs uppercase font-extrabold tracking-widest text-aether-blue-600">
                Community
              </span>
              <h2 className="text-2xl font-extrabold text-aether-dark mt-0.5">
                Club Volunteers & Contributors
              </h2>
            </div>
            <div className="flex-grow h-[2px] bg-slate-100 ml-4 mt-4" />
          </div>

          <motion.div 
            variants={staggerContainer}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-50px" }}
            className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6"
          >
            {volunteers.map((member, idx) => (
              <motion.div
                key={member.id || idx}
                variants={fadeInUp}
                className="bg-white rounded-[24px] shadow-sm border border-slate-100 p-5 text-center flex flex-col items-center justify-between hover:shadow-card hover:-translate-y-1 transition-all duration-300"
              >
                <div className="space-y-4 w-full">
                  {/* Round Avatar */}
                  <div className="w-16 h-16 rounded-2xl overflow-hidden border border-slate-100 shadow-sm bg-slate-50 mx-auto">
                    <img 
                      src={member.image || BLANK_AVATAR} 
                      alt={member.name} 
                      className="w-full h-full object-cover" 
                    />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-aether-dark">{member.name}</h3>
                    <p className="text-[11px] text-slate-500 font-semibold mt-0.5">{member.role}</p>
                  </div>
                </div>

                {/* Tag Pills */}
                <div className="flex flex-wrap items-center justify-center gap-1.5 pt-4 mt-auto">
                  {member.pills.map((pill, pIdx) => (
                    <span key={pIdx} className="text-[9px] font-extrabold text-aether-blue-600 bg-aether-blue-50/50 border border-aether-blue-100/30 px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                      {pill}
                    </span>
                  ))}
                </div>
              </motion.div>
            ))}
          </motion.div>
        </section>
      )}

      {/* Empty State Fallback if no non-system members found */}
      {!loading && dbMembers.length === 0 && (
        <section className="py-20 text-center max-w-xl mx-auto px-4">
          <div className="w-16 h-16 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mx-auto mb-4 border border-blue-100">
            <Users className="h-8 w-8" />
          </div>
          <h3 className="text-xl font-bold text-slate-800">Team Announcement Coming Soon</h3>
          <p className="text-xs text-slate-400 mt-2 leading-relaxed">
            The active organizers, faculty coordinators, and student leaders for this academic year will be showcased here.
          </p>
        </section>
      )}

      {/* ================= WANT TO SHAPE THE FUTURE? SECTION ================= */}
      <section className="py-12 bg-white pb-20 border-t border-slate-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div 
            whileHover={{ scale: 1.005 }}
            className="bg-gradient-to-tr from-aether-blue-50/50 via-sky-50/30 to-blue-50/20 border border-aether-blue-100/40 rounded-[28px] p-10 sm:p-14 text-center max-w-5xl mx-auto space-y-5 relative overflow-hidden shadow-sm"
          >
            <h2 className="text-2xl sm:text-3xl font-extrabold text-aether-dark tracking-tight">
              Want to Shape the Future?
            </h2>
            <p className="text-slate-500 font-medium text-xs sm:text-sm leading-relaxed max-w-2xl mx-auto font-normal">
              We are always looking for brilliance. If you are passionate about the intersection of humanity and artificial intelligence, your journey begins here.
            </p>
            <div className="pt-2">
              <Link to="/contact">
                <Button variant="gradient" className="rounded-xl px-8 py-3.5 font-bold shadow-button hover:shadow-lg hover:scale-102 transition-all text-xs">
                  Join Us
                </Button>
              </Link>
            </div>

            {/* Bottom check badges */}
            <div className="flex flex-wrap items-center justify-center gap-x-8 gap-y-3 pt-6 text-xs text-slate-500 font-semibold border-t border-slate-200/50 max-w-xl mx-auto mt-4">
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="h-4 w-4 text-aether-blue-600" />
                Technical Workshops
              </span>
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="h-4 w-4 text-aether-blue-600" />
                Hackathon Projects
              </span>
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="h-4 w-4 text-aether-blue-600" />
                Research Mentorship
              </span>
            </div>
          </motion.div>
        </div>
      </section>

    </div>
  );
};

export default TeamPage;
