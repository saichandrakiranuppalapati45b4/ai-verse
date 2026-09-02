import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { 
  Lightbulb, 
  Scale, 
  Users, 
  ArrowRight 
} from "lucide-react";
import Button from "../../components/ui/Button";
import SEO from "../../components/layout/SEO";
import { db } from "../../config/firebase";
import { collection, getDocs } from "firebase/firestore";
import { userService } from "../../services/userService";

// Import local assets
import aetherHero from "../../assets/images/aether_hero.png";
import sparkImg from "../../assets/images/spark.png";
import sarahImg from "../../assets/images/sarah.png";
import davidImg from "../../assets/images/david.png";
import riyaImg from "../../assets/images/riya.png";

interface LeaderItem {
  id?: string;
  name: string;
  role: string;
  image: string;
  bio?: string;
}

const defaultLeaders: LeaderItem[] = [
  {
    name: "Dr. Sarah Chen",
    role: "Faculty Advisor",
    image: riyaImg,
  },
  {
    name: "Sarah Jenkins",
    role: "President & Founder",
    image: sarahImg,
  },
  {
    name: "David Chen",
    role: "Head of Research",
    image: davidImg,
  }
];

const AboutPage: React.FC = () => {
  const [leaders, setLeaders] = useState<LeaderItem[]>([]);
  const [loadingTeam, setLoadingTeam] = useState(true);

  useEffect(() => {
    const loadTeam = async () => {
      try {
        const EXCLUDED_SYSTEM_EMAILS = [
          "admin@aiverse.in",
          "facultycoordinator@aiverse.in",
          "studentorganizer@aiverse.in",
          "jurry@aiverse.in",
          "jury@aiverse.in",
          "participant@aiverse.in"
        ];

        // 1. Try Supabase first
        const supaTeam = await userService.getAboutTeamMembers();
        const validSupaTeam = (supaTeam || []).filter(
          m => !EXCLUDED_SYSTEM_EMAILS.includes((m.email || "").toLowerCase().trim())
        );

        if (validSupaTeam && validSupaTeam.length > 0) {
          const mapped = validSupaTeam.map(m => ({
            id: m.id,
            name: m.name || m.display_name || "Unnamed Member",
            role: m.position || m.role || "Faculty Coordinator",
            image: m.image || riyaImg,
            bio: m.bio || ""
          }));
          setLeaders(mapped);
          setLoadingTeam(false);
          return;
        }

        // 2. Fallback to Firestore
        const usersSnap = await getDocs(collection(db, "users"));
        const organizersSnap = await getDocs(collection(db, "organizers"));
        
        const list: any[] = [];
        // First add users collection docs (authoritative source from User Management)
        usersSnap.forEach((docSnap) => {
          list.push({ id: docSnap.id, ...docSnap.data() });
        });
        
        // Merge organizers collection docs for any additional details
        organizersSnap.forEach((docSnap) => {
          const data = docSnap.data();
          const existingIndex = list.findIndex(
            item => item.email && data.email && item.email.toLowerCase().trim() === data.email.toLowerCase().trim()
          );
          if (existingIndex >= 0) {
            const userItem = list[existingIndex];
            list[existingIndex] = {
              ...data,
              ...userItem,
              showInAbout: userItem.showInAbout !== undefined ? userItem.showInAbout : data.showInAbout,
              showInAboutPage: userItem.showInAboutPage !== undefined ? userItem.showInAboutPage : data.showInAboutPage
            };
          } else {
            list.push({ id: docSnap.id, ...data });
          }
        });
        
        // ONLY filter for members explicitly selected with "Show in About Page" option and exclude system staff accounts
        const filtered = list.filter(
          m => (m.showInAbout === true || m.showInAbout === "Yes" || m.showInAboutPage === true || m.showInAboutPage === "Yes") &&
               !EXCLUDED_SYSTEM_EMAILS.includes((m.email || "").toLowerCase().trim()) &&
               (m.name || "").toLowerCase() !== "system admin" &&
               (m.name || "").toLowerCase() !== "jury evaluator"
        );
        
        if (filtered.length > 0) {
          const getRank = (m: any): number => {
            const pos = (m.position || "").toLowerCase().trim();
            const role = (m.roleType || m.role || "").toLowerCase().trim();
            const combined = `${pos} ${role}`.toLowerCase().trim();
            if (combined.includes("faculty") || combined.includes("convener")) return 0;
            if (pos === "lead" || pos === "head" || combined.includes("lead organizer") || (combined.includes("lead") && !combined.includes("co-lead") && !combined.includes("co lead"))) return 1;
            if (pos === "co-lead" || pos === "co lead" || pos === "colead" || combined.includes("co-lead") || combined.includes("co lead") || combined.includes("co-organizer")) return 2;
            if (pos === "associate" || pos === "assoc" || combined.includes("associate") || combined.includes("assoc")) return 3;
            return 4;
          };

          filtered.sort((a, b) => {
            const rankA = getRank(a);
            const rankB = getRank(b);
            if (rankA !== rankB) return rankA - rankB;
            return (a.name || "").localeCompare(b.name || "");
          });
          
          const mapped = filtered.map(m => ({
            id: m.id,
            name: m.name || m.displayName || "Unnamed Member",
            role: m.position || m.roleType || m.role || "Faculty Coordinator",
            image: m.image || riyaImg,
            bio: m.bio || ""
          }));
          setLeaders(mapped);
        } else {
          setLeaders(defaultLeaders);
        }
      } catch (err) {
        console.error("Error loading team in AboutPage:", err);
        setLeaders(defaultLeaders);
      } finally {
        setLoadingTeam(false);
      }
    };
    loadTeam();
  }, []);

  // Animation variants
  const fadeInUp = {
    hidden: { opacity: 0, y: 35 },
    visible: { 
      opacity: 1, 
      y: 0,
      transition: { duration: 0.6, ease: "easeOut" as const }
    }
  };

  const staggerContainer = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.15
      }
    }
  };

  return (
    <div className="overflow-hidden bg-[#F8FAFC]">
      <SEO 
        title="About AI Verse VITB | Our Mission & Story - VIT Bhimavaram" 
        description="Discover the mission, values, and community of AI Verse VITB — the official Artificial Intelligence & Data Science student club at Vishnu Institute of Technology, Bhimavaram (VIT Bhimavaram)."
        keywords="About AI Verse, aiversevitb, AI Verse VITB, VIT Bhimavaram, Vishnu Institute of Technology, AI & Data Science"
      />
      
      {/* ================= HERO SECTION ================= */}
      <section className="relative py-16 lg:py-24 flex items-center">
        {/* Abstract Background Gradients */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden -z-10">
          <div className="absolute top-1/4 left-1/4 w-[400px] h-[400px] rounded-full bg-[radial-gradient(circle,rgba(219,234,254,0.6)_0%,transparent_70%)] transform-gpu" />
          <div className="absolute top-1/3 right-1/4 w-[500px] h-[500px] rounded-full bg-[radial-gradient(circle,rgba(224,242,254,0.6)_0%,transparent_70%)] transform-gpu" />
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center">
            
            {/* Left Column (Copy) */}
            <motion.div 
              className="lg:col-span-7 space-y-6 text-left"
              initial="hidden"
              animate="visible"
              variants={staggerContainer}
            >
              <motion.div variants={fadeInUp} className="space-y-4">
                <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold leading-[1.1] text-aether-dark tracking-tight">
                  Our Journey into <br />
                  the <span className="bg-gradient-to-r from-aether-blue-600 via-aether-blue-500 to-aether-blue-400 bg-clip-text text-transparent">Aether</span>
                </h1>
              </motion.div>

              <motion.p 
                variants={fadeInUp}
                className="text-base sm:text-lg text-slate-500 max-w-xl font-normal leading-relaxed"
              >
                We are a collective of student innovators, researchers, and builders pioneering the next frontier of artificial intelligence through collaboration and open discourse.
              </motion.p>

              <motion.div variants={fadeInUp} className="pt-2">
                <a href="#mission-section">
                  <Button variant="outline" className="rounded-full px-6 py-3 font-bold hover:bg-slate-50 transition-all text-xs">
                    Discover Our Mission
                  </Button>
                </a>
              </motion.div>
            </motion.div>

            {/* Right Column (Floating Premium Card) */}
            <motion.div 
              className="lg:col-span-5 relative"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.8, ease: "easeOut" as const }}
            >
              <div className="relative max-w-md mx-auto lg:mr-0 rounded-image overflow-hidden shadow-card border border-white/60 aspect-[4/3] bg-slate-900 group">
                <img 
                  src={aetherHero} 
                  alt="Aether digital abstract visual" 
                  className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950/40 via-transparent to-transparent"></div>
              </div>
            </motion.div>

          </div>
        </div>
      </section>

      {/* ================= THE SPARK OF INNOVATION SECTION ================= */}
      <section id="mission-section" className="py-20 bg-white border-t border-slate-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-center">
            
            {/* Left Column (Collaboration Image) */}
            <motion.div 
              className="lg:col-span-5 relative"
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, margin: "-100px" }}
              transition={{ duration: 0.7 }}
            >
              <div className="relative max-w-md mx-auto lg:ml-0 rounded-image overflow-hidden shadow-card border border-slate-100 aspect-[4/3] group bg-slate-100">
                <img 
                  src={sparkImg} 
                  alt="Students collaborating" 
                  className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                />
              </div>
            </motion.div>

            {/* Right Column (Copy) */}
            <motion.div 
              className="lg:col-span-7 text-left space-y-6"
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-100px" }}
              transition={{ duration: 0.7 }}
            >
              <h2 className="text-3xl sm:text-4xl font-extrabold text-aether-dark tracking-tight">
                The Spark of Innovation
              </h2>
              
              <div className="space-y-4 text-sm sm:text-base text-slate-500 leading-relaxed font-normal">
                <p>
                  Founded in 2022, Aetheric AI began as a small reading group of five students fascinated by generative models. Recognizing the rapid acceleration of AI and the need for a dedicated space for hands-on experimentation, we formally established the club to bridge the gap between theoretical coursework and real-world application.
                </p>
                <p>
                  Today, we host weekly workshops, hackathons, and guest lectures from industry leaders, fostering an environment where ideas crystallize into functional prototypes.
                </p>
              </div>
            </motion.div>

          </div>
        </div>
      </section>

      {/* ================= OUR CORE PILLARS SECTION ================= */}
      <section className="py-20 bg-slate-50 border-t border-b border-slate-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          <div className="text-center max-w-2xl mx-auto mb-16 space-y-3">
            <h2 className="text-3xl sm:text-4xl font-extrabold text-aether-dark">
              Our Core Pillars
            </h2>
            <p className="text-slate-500 font-medium text-sm sm:text-base leading-relaxed">
              The principles that guide our research, our community, and our vision for the future of technology.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Pillar 1: Innovation */}
            <motion.div
              whileHover={{ y: -6, boxShadow: "0 20px 40px rgba(37,99,235,0.08)" }}
              className="bg-white rounded-card shadow-card border border-slate-100 p-8 text-left space-y-5 transition-all duration-300"
            >
              <div className="w-10 h-10 rounded-xl bg-aether-blue-50 text-aether-blue-600 flex items-center justify-center shadow-inner">
                <Lightbulb className="h-5 w-5" />
              </div>
              <h3 className="text-lg font-bold text-aether-dark">Innovation</h3>
              <p className="text-xs sm:text-sm text-slate-500 leading-relaxed font-normal">
                We push the boundaries of what's possible, encouraging members to explore unconventional architectures and novel applications of AI and data science.
              </p>
            </motion.div>

            {/* Pillar 2: Ethics */}
            <motion.div
              whileHover={{ y: -6, boxShadow: "0 20px 40px rgba(37,99,235,0.08)" }}
              className="bg-white rounded-card shadow-card border border-slate-100 p-8 text-left space-y-5 transition-all duration-300"
            >
              <div className="w-10 h-10 rounded-xl bg-aether-blue-50 text-aether-blue-600 flex items-center justify-center shadow-inner">
                <Scale className="h-5 w-5" />
              </div>
              <h3 className="text-lg font-bold text-aether-dark">Ethics</h3>
              <p className="text-xs sm:text-sm text-slate-500 leading-relaxed font-normal">
                We prioritize responsible AI development, maintaining rigorous discussions on bias, alignment, and the societal impact of the systems we build.
              </p>
            </motion.div>

            {/* Pillar 3: Collaboration */}
            <motion.div
              whileHover={{ y: -6, boxShadow: "0 20px 40px rgba(37,99,235,0.08)" }}
              className="bg-white rounded-card shadow-card border border-slate-100 p-8 text-left space-y-5 transition-all duration-300"
            >
              <div className="w-10 h-10 rounded-xl bg-aether-blue-50 text-aether-blue-600 flex items-center justify-center shadow-inner">
                <Users className="h-5 w-5" />
              </div>
              <h3 className="text-lg font-bold text-aether-dark">Collaboration</h3>
              <p className="text-xs sm:text-sm text-slate-500 leading-relaxed font-normal">
                We believe that the most profound breakthroughs occur at the intersection of diverse disciplines, fostering an inclusive environment for all majors.
              </p>
            </motion.div>
          </div>

        </div>
      </section>

      {/* ================= CLUB LEADERSHIP SECTION ================= */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          {/* Header Row */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-16">
            <div className="text-left space-y-2">
              <h2 className="text-3xl font-extrabold text-aether-dark">
                Club Leadership
              </h2>
              <p className="text-slate-500 text-sm sm:text-base font-medium">
                Meet the minds driving our vision forward.
              </p>
            </div>
            <Link 
              to="/team" 
              className="inline-flex items-center gap-1.5 text-xs font-bold text-aether-blue-600 hover:text-aether-blue-700 transition-colors group"
            >
              View Full Team
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </Link>
          </div>

          {/* Leaders Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {loadingTeam ? (
              Array.from({ length: 3 }).map((_, idx) => (
                <div key={idx} className="bg-white rounded-card border border-slate-100 overflow-hidden shadow-sm h-[320px] animate-pulse flex flex-col text-left">
                  <div className="aspect-[4/3] w-full bg-slate-100" />
                  <div className="p-6 space-y-3">
                    <div className="h-4 bg-slate-200 rounded w-2/3" />
                    <div className="h-2.5 bg-slate-100 rounded w-1/3" />
                  </div>
                </div>
              ))
            ) : (
              leaders.map((leader, index) => (
                <motion.div
                  key={leader.id || index}
                  whileHover={{ y: -4, boxShadow: "0 15px 35px rgba(37,99,235,0.06)" }}
                  className="bg-white rounded-card border border-slate-100 overflow-hidden shadow-sm transition-all duration-300 flex flex-col text-left group"
                >
                  {/* Leader Photo */}
                  <div className="aspect-[4/3] w-full bg-slate-50 overflow-hidden relative">
                    <img 
                      src={leader.image} 
                      alt={`${leader.name} Headshot`} 
                      className="w-full h-full object-cover object-top transition-transform duration-700 group-hover:scale-105"
                    />
                  </div>
                  {/* Leader Info */}
                  <div className="p-6">
                    <h3 className="text-lg font-bold text-aether-dark tracking-tight">{leader.name}</h3>
                    <span className="text-[10px] font-extrabold tracking-wider text-aether-blue-600 uppercase block mt-1">
                      {leader.role}
                    </span>
                  </div>
                </motion.div>
              ))
            )}
          </div>

        </div>
      </section>

      {/* ================= READY TO SHAPE THE FUTURE? SECTION ================= */}
      <section className="py-12 bg-white pb-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div 
            whileHover={{ scale: 1.005 }}
            className="bg-gradient-to-tr from-aether-blue-50/50 via-sky-50/30 to-blue-50/20 border border-aether-blue-100/40 rounded-[28px] p-10 sm:p-16 text-center max-w-5xl mx-auto space-y-6 relative overflow-hidden shadow-sm"
          >
            {/* Decorative background glow circles */}
            <div className="absolute -top-32 -left-32 w-64 h-64 rounded-full bg-[radial-gradient(circle,rgba(96,165,250,0.12)_0%,transparent_70%)] pointer-events-none transform-gpu" />
            <div className="absolute -bottom-32 -right-32 w-64 h-64 rounded-full bg-[radial-gradient(circle,rgba(56,189,248,0.12)_0%,transparent_70%)] pointer-events-none transform-gpu" />

            <h2 className="text-3xl sm:text-4xl font-extrabold text-aether-dark tracking-tight">
              Ready to Shape the Future?
            </h2>
            <p className="text-slate-500 font-medium text-sm sm:text-base leading-relaxed max-w-2xl mx-auto font-normal">
              Whether you're a seasoned ML engineer or just starting your journey into artificial intelligence, there's a place for you in the Aether.
            </p>
            <div className="pt-2">
              <Link to="/contact">
                <Button variant="gradient" className="rounded-xl px-8 py-3.5 font-bold shadow-button hover:shadow-lg hover:scale-102 transition-all text-xs">
                  Join the Innovation
                </Button>
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

    </div>
  );
};

export default AboutPage;
