import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { 
  CheckCircle2 
} from "lucide-react";
import Button from "../../components/ui/Button";
import SEO from "../../components/layout/SEO";
import { db } from "../../config/firebase";
import { collection, getDocs } from "firebase/firestore";

// Import local assets
import heroImg from "../../assets/images/aether_hero.png";
import sarahImg from "../../assets/images/sarah.png";
import davidImg from "../../assets/images/david.png";
import elenaImg from "../../assets/images/elena.png";
import marcusImg from "../../assets/images/marcus.png";
import aminaImg from "../../assets/images/amina.png";
import satoshiImg from "../../assets/images/satoshi.png";
import riyaImg from "../../assets/images/riya.png";
import liamImg from "../../assets/images/liam.png";
import sophieImg from "../../assets/images/sophie.png";
import kenjiImg from "../../assets/images/kenji.png";

interface Leader {
  name: string;
  role: string;
  image: string;
  bio: string;
  github?: string;
  linkedin?: string;
  twitter?: string;
}

interface Member {
  name: string;
  role: string;
  image: string;
  pills: string[];
}

const TeamPage: React.FC = () => {
  const [dbMembers, setDbMembers] = useState<any[]>([]);

  useEffect(() => {
    const fetchTeam = async () => {
      try {
        const querySnapshot = await getDocs(collection(db, "team"));
        const list: any[] = [];
        querySnapshot.forEach((docSnap) => {
          list.push({ id: docSnap.id, ...docSnap.data() });
        });
        setDbMembers(list);
      } catch (err) {
        console.error("Error fetching team members:", err);
      }
    };
    fetchTeam();
  }, []);

  const leaders: Leader[] = [
    {
      name: "Sarah Jenkins",
      role: "President & Founder",
      image: sarahImg,
      bio: "A former lead at OpenAI's cognitive division, Sarah envisions a world where AI doesn't just process information, but resonates with human intuition.",
      github: "https://github.com",
      linkedin: "https://linkedin.com",
      twitter: "https://twitter.com"
    },
    {
      name: "David Chen",
      role: "Head of Research",
      image: davidImg,
      bio: "David leads our fundamental research initiatives, focusing on emergent neural architectures and self-correcting semantic frameworks.",
      github: "https://github.com",
      linkedin: "https://linkedin.com",
      twitter: "https://twitter.com"
    },
    ...dbMembers.filter(m => m.roleType === "Faculty Coordinator" || m.roleType === "Student Lead").map(m => ({
      name: m.name,
      role: m.position || m.roleType,
      image: m.image || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=256&h=256&q=80",
      bio: m.bio || "Active contributor helping drive AIVerse excellence.",
      github: m.github || "",
      linkedin: m.linkedin || "",
      twitter: ""
    }))
  ];

  const rndTeam: Member[] = [
    {
      name: "Dr. Elena Vos",
      role: "LLM Architect",
      image: elenaImg,
      pills: ["LLMS", "TRANSFORMER-XL"]
    },
    {
      name: "Marcus Thorne",
      role: "Neural Theorist",
      image: marcusImg,
      pills: ["PYTORCH", "DIFFUSION"]
    },
    {
      name: "Amina Al-Fayed",
      role: "NLP Specialist",
      image: aminaImg,
      pills: ["SEMANTICS", "BERT"]
    },
    {
      name: "Julian Kent",
      role: "Agentic Systems",
      image: liamImg,
      pills: ["AUTO-GPT", "RLHF"]
    },
    ...dbMembers.filter(m => m.roleType === "Organizer" && m.department === "Robotics & Vision").map(m => ({
      name: m.name,
      role: m.position || "Organizer",
      image: m.image || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=256&h=256&q=80",
      pills: ["ROBOTICS", "VISION"]
    }))
  ];

  const engineeringTeam: Member[] = [
    {
      name: "Satoshi Nakamoto",
      role: "Core Systems",
      image: satoshiImg,
      pills: ["RUST", "CUDA", "DISTRIBUTED SYSTEMS"]
    },
    {
      name: "Riya Sharma",
      role: "MLOps Lead",
      image: riyaImg,
      pills: ["KUBERNETES", "NVIDIA-DOCKER"]
    },
    {
      name: "Liam O'Connell",
      role: "Storage Architect",
      image: liamImg,
      pills: ["POSTGRESQL", "REDIS"]
    },
    ...dbMembers.filter(m => m.roleType === "Organizer" && (m.department === "Computer Science" || m.department === "Data Science")).map(m => ({
      name: m.name,
      role: m.position || "Organizer",
      image: m.image || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=256&h=256&q=80",
      pills: [m.department ? m.department.toUpperCase() : "COMPUTER SCIENCE"]
    }))
  ];

  const creativeTeam: Member[] = [
    {
      name: "Sophie Dubois",
      role: "Design Director",
      image: sophieImg,
      pills: ["UI/UX", "HUMAN FACTORS"]
    },
    {
      name: "Kenji Tanaka",
      role: "Motion Engineer",
      image: kenjiImg,
      pills: ["THREE.JS", "WEBGL"]
    },
    ...dbMembers.filter(m => m.roleType === "Organizer" && m.department === "Ethics & AI").map(m => ({
      name: m.name,
      role: m.position || "Organizer",
      image: m.image || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=256&h=256&q=80",
      pills: ["ETHICS", "AI POLICY"]
    }))
  ];

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
        title="Team - The Minds Behind the Aether" 
        description="Meet the dedicated leaders, researchers, and developers driving cognitive computing at AI Verse."
        keywords="AI Verse Team, AI Researchers, Student Developers"
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
          <motion.h1 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight leading-tight text-white"
          >
            The Minds Behind <br />
            <span className="bg-gradient-to-r from-aether-blue-400 to-sky-300 bg-clip-text text-transparent">the Aether</span>
          </motion.h1>

          {/* Description text card box */}
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="max-w-2xl mx-auto bg-white/10 backdrop-blur-md border border-white/10 p-6 rounded-2xl shadow-sm text-slate-200 text-xs sm:text-sm md:text-base font-normal leading-relaxed"
          >
            Our collective is composed of pioneers in large-scale machine learning, cognitive sciences, and digital architecture, dedicated to sculpting the next era of Aetheric Intelligence.
          </motion.div>
        </div>
      </section>

      {/* ================= LEADERSHIP SECTION ================= */}
      <section className="py-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-left mb-12">
          <span className="text-xs uppercase font-extrabold tracking-widest text-aether-blue-600">
            Leadership
          </span>
          <h2 className="text-3xl font-extrabold text-aether-dark mt-1">
            Visionary Guidance
          </h2>
        </div>

        {/* Leadership Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {leaders.map((leader, idx) => (
            <motion.div
              key={idx}
              variants={fadeInUp}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: "-50px" }}
              className="bg-white rounded-card shadow-sm border border-slate-100 p-5 sm:p-6 flex flex-col sm:flex-row gap-6 items-center text-left hover:shadow-card transition-all duration-300"
            >
              {/* Leader Photo */}
              <div className="w-full sm:w-36 aspect-[4/5] rounded-xl overflow-hidden shrink-0 bg-slate-50 relative">
                <img 
                  src={leader.image} 
                  alt={leader.name} 
                  className="w-full h-full object-cover object-top"
                />
              </div>

              {/* Leader Bio Details */}
              <div className="flex flex-col justify-between py-1 h-full space-y-4">
                <div className="space-y-2">
                  <div>
                    <h3 className="text-lg font-bold text-aether-dark leading-tight">
                      {leader.name}
                    </h3>
                    <span className="text-xs font-bold text-aether-blue-600 block mt-0.5">
                      {leader.role}
                    </span>
                  </div>
                  <p className="text-slate-500 text-xs sm:text-sm font-normal leading-relaxed">
                    {leader.bio}
                  </p>
                </div>

                {/* Social Links */}
                <div className="flex items-center gap-3 text-slate-400">
                  {leader.github && (
                    <a href={leader.github} target="_blank" rel="noreferrer" className="hover:text-aether-blue-600 transition-colors" title="GitHub">
                      <svg className="h-4 w-4 fill-current" viewBox="0 0 24 24">
                        <path d="M12 2C6.477 2 2 6.477 2 12c0 4.42 2.865 8.167 6.839 9.49.5.092.682-.217.682-.482 0-.237-.008-.866-.013-1.7-2.782.603-3.369-1.34-3.369-1.34-.454-1.156-1.11-1.464-1.11-1.464-.908-.62.069-.008.069-.008 1.003.07 1.531 1.03 1.531 1.03.892 1.529 2.341 1.087 2.91.831.092-.646.35-1.086.636-1.336-2.22-.253-4.555-1.11-4.555-4.943 0-1.091.39-1.984 1.029-2.683-.103-.253-.446-1.27.098-2.647 0 0 .84-.269 2.75 1.025A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.294 2.747-1.025 2.747-1.025.546 1.377.203 2.394.1 2.647.64.699 1.028 1.592 1.028 2.683 0 3.842-2.339 4.687-4.566 4.935.359.309.678.919.678 1.852 0 1.336-.012 2.415-.012 2.743 0 .267.18.579.688.481C19.137 20.164 22 16.418 22 12c0-5.523-4.477-10-10-10z"/>
                      </svg>
                    </a>
                  )}
                  {leader.linkedin && (
                    <a href={leader.linkedin} target="_blank" rel="noreferrer" className="hover:text-aether-blue-600 transition-colors" title="LinkedIn">
                      <svg className="h-4 w-4 fill-current" viewBox="0 0 24 24">
                        <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z"/>
                      </svg>
                    </a>
                  )}
                  {leader.twitter && (
                    <a href={leader.twitter} target="_blank" rel="noreferrer" className="hover:text-aether-blue-600 transition-colors" title="Twitter / X">
                      <svg className="h-4 w-4 fill-current" viewBox="0 0 24 24">
                        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                      </svg>
                    </a>
                  )}
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ================= RESEARCH & DEVELOPMENT ================= */}
      <section className="py-12 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 border-t border-slate-100">
        <div className="flex items-center gap-4 mb-10 text-left">
          <h2 className="text-2xl font-extrabold text-aether-dark shrink-0">
            Research & Development
          </h2>
          <div className="h-[2px] bg-slate-100 flex-grow" />
        </div>

        <motion.div 
          variants={staggerContainer}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-50px" }}
          className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6"
        >
          {rndTeam.map((member, idx) => (
            <motion.div
              key={idx}
              variants={fadeInUp}
              className="bg-white rounded-card shadow-sm border border-slate-100 p-5 text-center flex flex-col items-center justify-between hover:shadow-card hover:-translate-y-1 transition-all duration-300"
            >
              <div className="space-y-4">
                {/* Round Avatar */}
                <div className="w-16 h-16 rounded-full overflow-hidden border border-slate-100 shadow-inner bg-slate-50 mx-auto">
                  <img src={member.image} alt={member.name} className="w-full h-full object-cover" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-aether-dark">{member.name}</h3>
                  <p className="text-[11px] text-slate-500 font-semibold mt-0.5">{member.role}</p>
                </div>
              </div>

              {/* Tag Pills */}
              <div className="flex flex-wrap items-center justify-center gap-1.5 pt-4 mt-auto">
                {member.pills.map((pill, pIdx) => (
                  <span key={pIdx} className="text-[9px] font-extrabold text-aether-blue-600 bg-aether-blue-50/50 border border-aether-blue-100/30 px-2 py-0.5 rounded-md uppercase tracking-wider">
                    {pill}
                  </span>
                ))}
              </div>
            </motion.div>
          ))}
        </motion.div>
      </section>

      {/* ================= ENGINEERING & INFRASTRUCTURE ================= */}
      <section className="py-12 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 border-t border-slate-100">
        <div className="flex items-center gap-4 mb-10 text-left">
          <h2 className="text-2xl font-extrabold text-aether-dark shrink-0">
            Engineering & Infrastructure
          </h2>
          <div className="h-[2px] bg-slate-100 flex-grow" />
        </div>

        <motion.div 
          variants={staggerContainer}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-50px" }}
          className="grid grid-cols-1 sm:grid-cols-3 gap-6"
        >
          {engineeringTeam.map((member, idx) => (
            <motion.div
              key={idx}
              variants={fadeInUp}
              className="bg-white rounded-card shadow-sm border border-slate-100 p-5 text-center flex flex-col items-center justify-between hover:shadow-card hover:-translate-y-1 transition-all duration-300"
            >
              <div className="space-y-4">
                {/* Round Avatar */}
                <div className="w-16 h-16 rounded-full overflow-hidden border border-slate-100 shadow-inner bg-slate-50 mx-auto">
                  <img src={member.image} alt={member.name} className="w-full h-full object-cover" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-aether-dark">{member.name}</h3>
                  <p className="text-[11px] text-slate-500 font-semibold mt-0.5">{member.role}</p>
                </div>
              </div>

              {/* Tag Pills */}
              <div className="flex flex-wrap items-center justify-center gap-1.5 pt-4 mt-auto">
                {member.pills.map((pill, pIdx) => (
                  <span key={pIdx} className="text-[9px] font-extrabold text-aether-blue-600 bg-aether-blue-50/50 border border-aether-blue-100/30 px-2 py-0.5 rounded-md uppercase tracking-wider">
                    {pill}
                  </span>
                ))}
              </div>
            </motion.div>
          ))}
        </motion.div>
      </section>

      {/* ================= CREATIVE & DESIGN ================= */}
      <section className="py-12 pb-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 border-t border-slate-100">
        <div className="flex items-center gap-4 mb-10 text-left">
          <h2 className="text-2xl font-extrabold text-aether-dark shrink-0">
            Creative & Design
          </h2>
          <div className="h-[2px] bg-slate-100 flex-grow" />
        </div>

        <motion.div 
          variants={staggerContainer}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-50px" }}
          className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6"
        >
          {creativeTeam.map((member, idx) => (
            <motion.div
              key={idx}
              variants={fadeInUp}
              className="bg-white rounded-card shadow-sm border border-slate-100 p-5 text-center flex flex-col items-center justify-between hover:shadow-card hover:-translate-y-1 transition-all duration-300"
            >
              <div className="space-y-4">
                {/* Round Avatar */}
                <div className="w-16 h-16 rounded-full overflow-hidden border border-slate-100 shadow-inner bg-slate-50 mx-auto">
                  <img src={member.image} alt={member.name} className="w-full h-full object-cover" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-aether-dark">{member.name}</h3>
                  <p className="text-[11px] text-slate-500 font-semibold mt-0.5">{member.role}</p>
                </div>
              </div>

              {/* Tag Pills */}
              <div className="flex flex-wrap items-center justify-center gap-1.5 pt-4 mt-auto">
                {member.pills.map((pill, pIdx) => (
                  <span key={pIdx} className="text-[9px] font-extrabold text-aether-blue-600 bg-aether-blue-50/50 border border-aether-blue-100/30 px-2 py-0.5 rounded-md uppercase tracking-wider">
                    {pill}
                  </span>
                ))}
              </div>
            </motion.div>
          ))}
        </motion.div>
      </section>

      {/* ================= VOLUNTEERS & CONTRIBUTORS ================= */}
      {dbMembers.some(m => m.roleType === "Volunteer") && (
        <section className="py-12 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 border-t border-slate-100">
          <div className="flex items-center gap-4 mb-10 text-left">
            <h2 className="text-2xl font-extrabold text-aether-dark shrink-0">
              Club Volunteers & Contributors
            </h2>
            <div className="flex-grow h-[2px] bg-slate-100" />
          </div>

          <motion.div 
            variants={staggerContainer}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-50px" }}
            className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6"
          >
            {dbMembers.filter(m => m.roleType === "Volunteer").map((member, idx) => (
              <motion.div
                key={idx}
                variants={fadeInUp}
                className="bg-white rounded-card shadow-sm border border-slate-100 p-5 text-center flex flex-col items-center justify-between hover:shadow-card hover:-translate-y-1 transition-all duration-300"
              >
                <div className="space-y-4">
                  {/* Round Avatar */}
                  <div className="w-16 h-16 rounded-full overflow-hidden border border-slate-100 shadow-inner bg-slate-50 mx-auto">
                    <img 
                      src={member.image || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=256&h=256&q=80"} 
                      alt={member.name} 
                      className="w-full h-full object-cover" 
                    />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-aether-dark">{member.name}</h3>
                    <p className="text-[11px] text-slate-500 font-semibold mt-0.5">{member.position || "Volunteer"}</p>
                  </div>
                </div>

                {/* Tag Pills */}
                <div className="flex flex-wrap items-center justify-center gap-1.5 pt-4 mt-auto">
                  <span className="text-[9px] font-extrabold text-aether-blue-600 bg-aether-blue-50/50 border border-aether-blue-100/30 px-2 py-0.5 rounded-md uppercase tracking-wider">
                    {member.department ? member.department.toUpperCase() : "VOLUNTEER"}
                  </span>
                </div>
              </motion.div>
            ))}
          </motion.div>
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
              We are always looking for brilliance. If you are passionate about the intersection of humanity and aetheric intelligence, your journey begins here.
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
                Fully Remote
              </span>
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="h-4 w-4 text-aether-blue-600" />
                Token Equity
              </span>
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="h-4 w-4 text-aether-blue-600" />
                Research Grants
              </span>
            </div>
          </motion.div>
        </div>
      </section>

    </div>
  );
};

export default TeamPage;
