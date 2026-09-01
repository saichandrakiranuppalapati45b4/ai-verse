import React, { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import { 
  Mail,
  Users,
  Sparkles,
  ArrowRight
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

interface MemberData {
  id?: string;
  name: string;
  email?: string;
  personal_email?: string;
  role: string;
  position?: string;
  roleType?: string;
  image: string;
  bio?: string;
  github?: string;
  linkedin?: string;
  phone?: string;
}

interface RoleCategoryDefinition {
  id: string;
  title: string;
  order: number;
  match: (roleStr: string) => boolean;
}

// System administrative accounts to exclude
const EXCLUDED_SYSTEM_EMAILS = [
  "admin@aiverse.in",
  "facultycoordinator@aiverse.in",
  "studentorganizer@aiverse.in",
  "jurry@aiverse.in",
  "jury@aiverse.in",
  "participant@aiverse.in"
];

const BLANK_AVATAR = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%2394A3B8'%3E%3Cpath d='M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z'/%3E%3C/svg%3E";

const ROLE_CATEGORIES: RoleCategoryDefinition[] = [
  {
    id: "leadership",
    title: "Faculty Coordinators",
    order: 1,
    match: (r: string) => (
      r.includes("faculty") ||
      r.includes("convener") ||
      r.includes("conviner") ||
      r.includes("advisor") ||
      r.includes("director") ||
      r.includes("president") ||
      r.includes("lead coordinator")
    )
  },
  {
    id: "technical",
    title: "Technical",
    order: 2,
    match: (r: string) => (
      r.includes("tech") ||
      r.includes("developer") ||
      r.includes("software") ||
      r.includes("ai") ||
      r.includes("ml") ||
      r.includes("web") ||
      r.includes("mobile") ||
      r.includes("coding") ||
      r.includes("data")
    )
  },
  {
    id: "organizers",
    title: "Student Organizers",
    order: 3,
    match: (r: string) => (
      r.includes("student organizer") ||
      r.includes("co-organizer") ||
      r.includes("organizer") ||
      r.includes("student lead") ||
      r.includes("core")
    )
  },
  {
    id: "design",
    title: "Design & Media",
    order: 4,
    match: (r: string) => (
      r.includes("design") ||
      r.includes("ui") ||
      r.includes("ux") ||
      r.includes("media") ||
      r.includes("photo") ||
      r.includes("video") ||
      r.includes("creative") ||
      r.includes("content") ||
      r.includes("graphic")
    )
  },
  {
    id: "operations",
    title: "Event Management",
    order: 5,
    match: (r: string) => (
      r.includes("event manager") ||
      r.includes("operation") ||
      r.includes("logistics") ||
      r.includes("management") ||
      r.includes("manager")
    )
  },
  {
    id: "marketing",
    title: "PR & Marketing",
    order: 6,
    match: (r: string) => (
      r.includes("pr") ||
      r.includes("marketing") ||
      r.includes("public relations") ||
      r.includes("sponsorship") ||
      r.includes("outreach") ||
      r.includes("communication")
    )
  },
  {
    id: "volunteers",
    title: "Volunteers",
    order: 7,
    match: (r: string) => (
      r.includes("volunteer") ||
      r.includes("student member") ||
      r.includes("member") ||
      r.includes("contributor") ||
      r.includes("guest")
    )
  }
];

const TeamPage: React.FC = () => {
  const [dbMembers, setDbMembers] = useState<MemberData[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<string>("all");

  useEffect(() => {
    const fetchTeam = async () => {
      try {
        setLoading(true);
        const combinedList: any[] = [];
        const seenEmails = new Set<string>();

        // 1. Fetch from Supabase
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
                personal_email: u.personal_email || "",
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

        // 2. Fetch from Firestore users
        try {
          const usersSnap = await getDocs(collection(db, "users"));
          usersSnap.forEach((docSnap) => {
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
                  position: combinedList[idx].position || data.position || data.role || "",
                };
              }
            } else if (email) {
              seenEmails.add(email);
              combinedList.push({
                id: docSnap.id,
                name: data.name || data.displayName || data.teamLeadName || "Unnamed Member",
                email: data.email || "",
                personal_email: data.personal_email || data.personalEmail || "",
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

        // 3. Fetch from Firestore organizers
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
                personal_email: data.personal_email || data.personalEmail || "",
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

        // 4. Filter out excluded system accounts
        const validMembers = combinedList.filter((m) => {
          const email = (m.email || "").toLowerCase().trim();
          const name = (m.name || "").toLowerCase().trim();
          const role = (m.role || "").toLowerCase().trim();
          const status = (m.status || "Active").toLowerCase().trim();

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

  const getMemberCategory = (m: MemberData): string => {
    const roleStr = `${m.position || ""} ${m.role || ""} ${m.roleType || ""}`.toLowerCase();
    for (const cat of ROLE_CATEGORIES) {
      if (cat.match(roleStr)) {
        return cat.id;
      }
    }
    return "other";
  };

  // Group members by role
  const groupedSections = useMemo(() => {
    const map = new Map<string, { definition: RoleCategoryDefinition; members: MemberData[] }>();

    ROLE_CATEGORIES.forEach(cat => {
      map.set(cat.id, { definition: cat, members: [] });
    });

    const otherMembers: MemberData[] = [];

    dbMembers.forEach(member => {
      const catId = getMemberCategory(member);
      if (map.has(catId)) {
        map.get(catId)!.members.push(member);
      } else {
        otherMembers.push(member);
      }
    });

    const activeSections: Array<{ definition: RoleCategoryDefinition; members: MemberData[] }> = [];

    ROLE_CATEGORIES.forEach(cat => {
      const data = map.get(cat.id);
      if (data && data.members.length > 0) {
        activeSections.push(data);
      }
    });

    if (otherMembers.length > 0) {
      activeSections.push({
        definition: {
          id: "other",
          title: "Other Members",
          order: 99,
          match: () => true
        },
        members: otherMembers
      });
    }

    return activeSections;
  }, [dbMembers]);

  // Tab list
  const filterTabs = useMemo(() => {
    const tabs = [{ id: "all", label: "All Members", count: dbMembers.length }];
    groupedSections.forEach(sec => {
      tabs.push({
        id: sec.definition.id,
        label: sec.definition.title,
        count: sec.members.length
      });
    });
    return tabs;
  }, [groupedSections, dbMembers]);

  const displayedSections = useMemo(() => {
    if (activeTab === "all") {
      return groupedSections;
    }
    return groupedSections.filter(sec => sec.definition.id === activeTab);
  }, [groupedSections, activeTab]);

  return (
    <div className="bg-[#F8FAFC] min-h-screen text-slate-800">
      <SEO 
        title="Team - The Minds Behind AI Verse | VIT Bhimavaram" 
        description="Meet the student leaders, technical developers, designers, and organizers powering AI Verse at Vishnu Institute of Technology, Bhimavaram."
      />
      
      {/* ================= HERO SECTION ================= */}
      <section className="relative py-20 px-4 sm:px-6 lg:px-8 bg-slate-950 text-white rounded-b-[36px] shadow-lg border-b border-slate-800/80">
        <div className="absolute inset-0 overflow-hidden rounded-b-[36px] -z-10">
          <img 
            src={heroImg} 
            alt="Background" 
            className="w-full h-full object-cover opacity-20 object-center"
          />
          <div className="absolute inset-0 bg-slate-950/85"></div>
        </div>

        <div className="max-w-4xl mx-auto text-center space-y-4 relative z-10">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-500/10 border border-blue-400/20 text-blue-300 text-xs font-bold uppercase tracking-widest">
            <Sparkles className="h-3.5 w-3.5 text-blue-400" />
            <span>AI Verse Club • VIT Bhimavaram</span>
          </div>

          <h1 className="text-3xl sm:text-5xl font-black text-white tracking-tight">
            Our Team
          </h1>

          <p className="max-w-xl mx-auto text-slate-300 text-sm sm:text-base font-normal leading-relaxed">
            The builders, developers, designers, and organizers powering AI Verse.
          </p>
        </div>
      </section>

      {/* ================= ROLE FILTER TABS ================= */}
      {!loading && dbMembers.length > 0 && filterTabs.length > 2 && (
        <div className="py-4 border-b border-slate-200/80 bg-white/90 backdrop-blur-md sticky top-20 z-20 shadow-2xs">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-0.5">
              {filterTabs.map(tab => {
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
                      isActive
                        ? "bg-slate-900 text-white shadow-sm scale-102"
                        : "bg-slate-100/90 text-slate-600 hover:bg-slate-200 hover:text-slate-900"
                    }`}
                  >
                    <span>{tab.label}</span>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-md font-extrabold ${
                      isActive ? "bg-white/20 text-white" : "bg-slate-200 text-slate-600"
                    }`}>
                      {tab.count}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Loading state indicator */}
      {loading && (
        <div className="py-24 text-center">
          <div className="w-10 h-10 rounded-full border-3 border-slate-200 border-t-blue-600 animate-spin mx-auto mb-3"></div>
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Loading team members...</p>
        </div>
      )}

      {/* ================= ROLE-WISE SECTIONS ================= */}
      {!loading && displayedSections.length > 0 && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-16">
          {displayedSections.map((section) => {
            const { definition, members } = section;

            return (
              <section key={definition.id} id={definition.id} className="text-left">
                {/* Clean, Simple Role Header */}
                <div className="flex items-center gap-3 mb-8 pb-3 border-b border-slate-200/80">
                  <h2 className="text-2xl font-black text-slate-900 tracking-tight">
                    {definition.title}
                  </h2>
                  <span className="text-xs font-bold text-blue-600 bg-blue-50 border border-blue-100 px-2.5 py-0.5 rounded-full">
                    {members.length}
                  </span>
                </div>

                {/* Large Profile Image Team Cards Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-7">
                  {members.map((member, idx) => {
                    const formattedRole = formatRoleLabel(member.position || member.role || member.roleType || "Member");

                    return (
                      <div
                        key={member.id || idx}
                        className="bg-white rounded-3xl border border-slate-200/90 p-4 sm:p-5 flex flex-col justify-between shadow-xs hover:shadow-xl hover:border-blue-200 hover:-translate-y-1.5 transition-all duration-300 group"
                      >
                        <div>
                          {/* Large Profile Image Frame */}
                          <div className="w-full aspect-[4/4.2] rounded-2xl overflow-hidden bg-slate-100 border border-slate-100/80 shadow-2xs relative mb-4">
                            <img 
                              src={member.image || BLANK_AVATAR} 
                              alt={member.name} 
                              className={`w-full h-full ${
                                member.image ? 'object-cover object-top group-hover:scale-105' : 'object-contain p-8'
                              } transition-transform duration-500`} 
                            />
                          </div>

                          {/* Member Details */}
                          <div className="space-y-1.5 px-1">
                            <h3 className="text-base sm:text-lg font-black text-slate-900 leading-tight group-hover:text-blue-600 transition-colors">
                              {member.name}
                            </h3>
                            
                            <div>
                              <span className="inline-block text-xs font-bold text-blue-600 bg-blue-50/80 border border-blue-100/70 px-2.5 py-0.5 rounded-full">
                                {formattedRole}
                              </span>
                            </div>

                            {member.bio && (
                              <p className="text-xs text-slate-500 pt-1 line-clamp-2 leading-relaxed font-normal">
                                {member.bio}
                              </p>
                            )}
                          </div>
                        </div>

                        {/* Social & Contact Buttons */}
                        <div className="pt-4 mt-4 border-t border-slate-100 flex items-center justify-between px-1">
                          <span className="text-[11px] font-semibold text-slate-400">Connect</span>
                          
                          <div className="flex items-center gap-1.5 text-slate-400">
                            {member.github && (
                              <a 
                                href={member.github} 
                                target="_blank" 
                                rel="noreferrer" 
                                className="p-2 rounded-xl bg-slate-50 hover:bg-slate-900 hover:text-white transition-all shadow-2xs" 
                                title="GitHub"
                              >
                                <GithubIcon className="h-3.5 w-3.5" />
                              </a>
                            )}
                            {member.linkedin && (
                              <a 
                                href={member.linkedin} 
                                target="_blank" 
                                rel="noreferrer" 
                                className="p-2 rounded-xl bg-slate-50 hover:bg-blue-600 hover:text-white transition-all shadow-2xs" 
                                title="LinkedIn"
                              >
                                <LinkedinIcon className="h-3.5 w-3.5" />
                              </a>
                            )}
                            {member.email && (
                              <a 
                                href={`mailto:${member.email}`} 
                                className="p-2 rounded-xl bg-slate-50 hover:bg-sky-500 hover:text-white transition-all shadow-2xs" 
                                title="Email"
                              >
                                <Mail className="h-3.5 w-3.5" />
                              </a>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            );
          })}
        </div>
      )}

      {/* Empty State */}
      {!loading && dbMembers.length === 0 && (
        <div className="py-24 text-center max-w-sm mx-auto px-4">
          <div className="w-14 h-14 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-3 shadow-xs">
            <Users className="h-7 w-7" />
          </div>
          <h3 className="text-lg font-bold text-slate-800">No Members Added Yet</h3>
          <p className="text-xs text-slate-400 mt-1 leading-relaxed">
            Active team members will appear here grouped by their role.
          </p>
        </div>
      )}

      {/* ================= BOTTOM CTA ================= */}
      <section className="py-16 bg-white border-t border-slate-200">
        <div className="max-w-4xl mx-auto px-4 text-center space-y-4">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 text-blue-600 text-xs font-bold uppercase tracking-wider">
            <Sparkles className="h-3.5 w-3.5 text-blue-500" />
            Join AI Verse
          </div>
          
          <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
            Want to Shape the Future with Us?
          </h2>
          
          <p className="text-slate-500 text-xs sm:text-sm max-w-lg mx-auto leading-relaxed">
            If you are passionate about Artificial Intelligence, workshops, and hackathons, join our active community.
          </p>
          
          <div className="pt-2">
            <Link to="/contact">
              <Button variant="gradient" className="rounded-2xl px-7 py-3 font-bold text-xs inline-flex items-center gap-2">
                <span>Contact Our Team</span>
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

    </div>
  );
};

export default TeamPage;
