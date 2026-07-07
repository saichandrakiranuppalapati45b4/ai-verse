import React from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Sparkles,
  ArrowRight,
  BarChart3,
  Calendar,
  Beaker,
  TrendingUp,
  Rocket,
  Eye,
  BookOpen,
  Search,
  Lightbulb,
  Globe,
  Network
} from "lucide-react";
import Button from "../../components/ui/Button";
import SEO from "../../components/layout/SEO";

const HomePage: React.FC = () => {
  // Animation variants
  const fadeInUp = {
    hidden: { opacity: 0, y: 30 },
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
        title="Home - Innovating the Future" 
        description="Discover the AI Verse portal - where developers, researchers, and AI enthusiasts collaborate on cutting-edge machine learning and cognitive computing projects." 
        keywords="AI, Artificial Intelligence, ML, Cognitive Computing, Student Research Group, AI Verse"
      />
      {/* ================= HERO SECTION ================= */}
      <section className="relative min-h-[90vh] flex items-center pt-8 pb-16 lg:py-24">
        {/* Animated Background Gradients */}
        <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
          <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-blue-100/35 blur-3xl"></div>
          <div className="absolute top-1/3 right-10 w-[400px] h-[400px] rounded-full bg-sky-100/40 blur-3xl"></div>
          {/* Subtle grid lines */}
          <div className="absolute inset-0 opacity-[0.03] bg-[linear-gradient(to_right,#808080_1px,transparent_1px),linear-gradient(to_bottom,#808080_1px,transparent_1px)] bg-[size:24px_24px]"></div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center">

            {/* Left Copy Column */}
            <motion.div
              className="lg:col-span-7 space-y-6 text-left"
              initial="hidden"
              animate="visible"
              variants={staggerContainer}
            >
              {/* Badge */}
              <motion.div variants={fadeInUp} className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-aether-blue-50 border border-aether-blue-100/50">
                <Sparkles className="h-3.5 w-3.5 text-aether-blue-600" />
                <span className="text-[10px] font-bold text-aether-blue-700 tracking-wider uppercase">
                  Welcome to AI Verse
                </span>
              </motion.div>

              {/* Headings */}
              <motion.div variants={fadeInUp} className="space-y-3">
                <h1 className="text-5xl sm:text-6xl lg:text-7xl font-extrabold leading-[1.08] text-aether-dark font-sans tracking-tight">
                  Empowering the <br />
                  <span className="bg-gradient-to-r from-aether-blue-600 via-aether-blue-500 to-aether-blue-400 bg-clip-text text-transparent">
                    Future of AI
                  </span>
                </h1>
              </motion.div>

              {/* Subtitle */}
              <motion.p
                variants={fadeInUp}
                className="text-base sm:text-lg text-slate-500 max-w-xl font-normal leading-relaxed"
              >
                Join an elite community of innovators, researchers, and creators shaping the aetheric landscape of artificial intelligence. Discover, collaborate, and transcend.
              </motion.p>

              {/* Buttons */}
              <motion.div variants={fadeInUp} className="flex flex-wrap items-center gap-4 pt-2">
                <Link to="/events">
                  <Button variant="gradient" className="rounded-full px-6 py-3 font-bold group shadow-button hover:shadow-lg hover:scale-102 transition-all">
                    Register Now
                    <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
                  </Button>
                </Link>
                <Link to="/about">
                  <Button variant="secondary" className="rounded-full px-6 py-3 font-bold hover:bg-slate-50 transition-all">
                    Explore Projects
                  </Button>
                </Link>
              </motion.div>
            </motion.div>

            {/* Right Stat Cards Column */}
            <motion.div
              className="lg:col-span-5 relative min-h-[380px] flex items-center justify-center"
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8, ease: "easeOut" as const }}
            >
              {/* Stats card container - matching user request for square grids over a wide card with organic floating effects */}
              <div className="space-y-4 max-w-[360px] w-full mx-auto relative lg:mr-0">
                {/* Top Row: Two Square Cards */}
                <div className="grid grid-cols-2 gap-4">
                  {/* Card 1: Active Members */}
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{
                      opacity: 1,
                      y: [0, -10, 0],
                    }}
                    transition={{
                      y: {
                        duration: 5.5,
                        repeat: Infinity,
                        ease: "easeInOut" as const
                      },
                      opacity: { duration: 0.5, delay: 0.1 }
                    }}
                    whileHover={{ scale: 1.03, transition: { duration: 0.2 } }}
                    className="bg-white/80 backdrop-blur-md rounded-card border border-white/60 shadow-card p-6 flex flex-col justify-between aspect-square text-left transition-all duration-200"
                  >
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-blue-50 text-blue-600 shadow-inner">
                      <BarChart3 className="h-5 w-5" />
                    </div>
                    <div>
                      <div className="text-3xl font-extrabold text-aether-dark tracking-tight">2.5k+</div>
                      <div className="text-[11px] sm:text-xs text-slate-500 font-semibold tracking-wide mt-1">Active Members</div>
                    </div>
                  </motion.div>

                  {/* Card 2: Yearly Events */}
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{
                      opacity: 1,
                      y: [-6, 4, -6],
                    }}
                    transition={{
                      y: {
                        duration: 5,
                        repeat: Infinity,
                        ease: "easeInOut" as const
                      },
                      opacity: { duration: 0.5, delay: 0.2 }
                    }}
                    whileHover={{ scale: 1.03, transition: { duration: 0.2 } }}
                    className="bg-white/80 backdrop-blur-md rounded-card border border-white/60 shadow-card p-6 flex flex-col justify-between aspect-square text-left transition-all duration-200"
                  >
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-sky-50 text-sky-600 shadow-inner">
                      <Calendar className="h-5 w-5" />
                    </div>
                    <div>
                      <div className="text-3xl font-extrabold text-aether-dark tracking-tight">150+</div>
                      <div className="text-[11px] sm:text-xs text-slate-500 font-semibold tracking-wide mt-1">Yearly Events</div>
                    </div>
                  </motion.div>
                </div>

                {/* Bottom Row: Wide Card */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{
                    opacity: 1,
                    y: [4, -6, 4],
                  }}
                  transition={{
                    y: {
                      duration: 6.5,
                      repeat: Infinity,
                      ease: "easeInOut" as const
                    },
                    opacity: { duration: 0.5, delay: 0.3 }
                  }}
                  whileHover={{ scale: 1.02, transition: { duration: 0.2 } }}
                  className="bg-white/80 backdrop-blur-md rounded-card border border-white/60 shadow-card p-6 flex items-center justify-between text-left transition-all duration-200 w-full"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-emerald-50 text-emerald-600 shadow-inner">
                      <Beaker className="h-6 w-6" />
                    </div>
                    <div>
                      <div className="text-2xl sm:text-3xl font-extrabold text-aether-dark tracking-tight">500+</div>
                      <div className="text-[11px] sm:text-xs text-slate-500 font-semibold tracking-wide mt-0.5">Innovative Projects Delivered</div>
                    </div>
                  </div>
                  <div className="p-1.5 bg-emerald-50 text-emerald-600 rounded-lg shrink-0">
                    <TrendingUp className="h-4 w-4" />
                  </div>
                </motion.div>
              </div>
            </motion.div>

          </div>
        </div>
      </section>

      {/* ================= OUR PURPOSE SECTION ================= */}
      <section className="py-20 border-t border-slate-100 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-16 space-y-3">
            <h2 className="text-3xl sm:text-4xl font-extrabold text-aether-dark">
              Our Purpose
            </h2>
            <p className="text-slate-500 font-medium text-sm sm:text-base leading-relaxed">
              Driving the future of technology through collaborative learning and groundbreaking research.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-5xl mx-auto">
            {/* The Mission Card */}
            <motion.div
              whileHover={{ y: -6, boxShadow: "0 20px 40px rgba(37,99,235,0.08)" }}
              className="bg-white rounded-card shadow-card border border-slate-100 p-8 text-left space-y-5 transition-all duration-300"
            >
              <div className="w-12 h-12 rounded-xl bg-aether-blue-50 text-aether-blue-600 flex items-center justify-center shadow-inner">
                <Rocket className="h-6 w-6" />
              </div>
              <h3 className="text-xl font-bold text-aether-dark">The Mission</h3>
              <p className="text-sm text-slate-500 leading-relaxed">
                Democratizing AI education by providing accessible resources, hands-on workshops, and collaborative project environments. We strive to empower students and professionals alike to harness the power of artificial intelligence ethically and effectively.
              </p>
            </motion.div>

            {/* The Vision Card */}
            <motion.div
              whileHover={{ y: -6, boxShadow: "0 20px 40px rgba(37,99,235,0.08)" }}
              className="bg-white rounded-card shadow-card border border-slate-100 p-8 text-left space-y-5 transition-all duration-300"
            >
              <div className="w-12 h-12 rounded-xl bg-aether-blue-50 text-aether-blue-600 flex items-center justify-center shadow-inner">
                <Eye className="h-6 w-6" />
              </div>
              <h3 className="text-xl font-bold text-aether-dark">The Vision</h3>
              <p className="text-sm text-slate-500 leading-relaxed">
                To become a global nexus for AI innovation where visionary minds converge to solve complex challenges. We envision a future where our community leads the development of aetheric AI technologies that positively transform society.
              </p>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ================= CORE PILLARS / FEATURED INITIATIVES ================= */}
      <section className="py-20 bg-slate-50 border-t border-b border-slate-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

          <div className="text-center mb-16">
            <span className="text-xs uppercase font-bold text-aether-blue-600 tracking-widest bg-aether-blue-50 px-3.5 py-1.5 rounded-full">
              Core Pillars
            </span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-aether-dark mt-4">
              Featured Initiatives
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Pillar 1: Education */}
            <motion.div
              whileHover={{ y: -8, borderBottomColor: "#3b82f6" }}
              className="bg-white rounded-card shadow-card border border-slate-100 p-8 text-left space-y-6 flex flex-col justify-between transition-all duration-300 border-b-2"
            >
              <div className="space-y-4">
                <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                  <BookOpen className="h-5 w-5" />
                </div>
                <h3 className="text-lg font-bold text-aether-dark">Education</h3>
                <p className="text-xs sm:text-sm text-slate-500 leading-relaxed">
                  Comprehensive curriculums and bootcamps covering machine learning, neural networks, and prompt engineering for all skill levels.
                </p>
              </div>
              <Link to="/events" className="inline-flex items-center gap-1.5 text-xs font-bold text-aether-blue-600 hover:text-aether-blue-700 mt-4 group">
                Learn More
                <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" />
              </Link>
            </motion.div>

            {/* Pillar 2: Research */}
            <motion.div
              whileHover={{ y: -8, borderBottomColor: "#3b82f6" }}
              className="bg-white rounded-card shadow-card border border-slate-100 p-8 text-left space-y-6 flex flex-col justify-between transition-all duration-300 border-b-2"
            >
              <div className="space-y-4">
                <div className="w-10 h-10 rounded-lg bg-sky-50 text-sky-600 flex items-center justify-center">
                  <Search className="h-5 w-5" />
                </div>
                <h3 className="text-lg font-bold text-aether-dark">Research</h3>
                <p className="text-xs sm:text-sm text-slate-500 leading-relaxed">
                  Cutting-edge academic research groups exploring AGI, ethics in AI, and advanced generative models in collaboration with leading universities.
                </p>
              </div>
              <Link to="/about" className="inline-flex items-center gap-1.5 text-xs font-bold text-aether-blue-600 hover:text-aether-blue-700 mt-4 group">
                Explore Papers
                <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" />
              </Link>
            </motion.div>

            {/* Pillar 3: Innovation */}
            <motion.div
              whileHover={{ y: -8, borderBottomColor: "#3b82f6" }}
              className="bg-white rounded-card shadow-card border border-slate-100 p-8 text-left space-y-6 flex flex-col justify-between transition-all duration-300 border-b-2"
            >
              <div className="space-y-4">
                <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                  <Lightbulb className="h-5 w-5" />
                </div>
                <h3 className="text-lg font-bold text-aether-dark">Innovation</h3>
                <p className="text-xs sm:text-sm text-slate-500 leading-relaxed">
                  Incubator programs supporting student-led AI startups. Turn your aetheric concepts into market-ready products with our mentorship.
                </p>
              </div>
              <Link to="/about" className="inline-flex items-center gap-1.5 text-xs font-bold text-aether-blue-600 hover:text-aether-blue-700 mt-4 group">
                View Projects
                <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" />
              </Link>
            </motion.div>
          </div>

        </div>
      </section>

      {/* ================= UPCOMING HIGHLIGHTS SECTION ================= */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

          {/* Header Row */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-16">
            <div className="text-left space-y-2">
              <h2 className="text-3xl font-extrabold text-aether-dark">
                Upcoming Highlights
              </h2>
              <p className="text-slate-500 text-sm sm:text-base font-medium">
                Don't miss out on our premier events and workshops.
              </p>
            </div>
            <Link to="/events">
              <Button variant="outline" className="rounded-full px-5 py-2.5 font-bold hover:bg-slate-50 transition-all text-xs">
                View All Events
              </Button>
            </Link>
          </div>

          {/* Highlights Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

            {/* Event Card 1: Global AI Summit */}
            <motion.div
              whileHover={{ y: -4, boxShadow: "0 15px 35px rgba(37,99,235,0.06)" }}
              className="bg-white rounded-card border border-slate-100 p-6 flex flex-col sm:flex-row gap-6 text-left shadow-sm transition-all duration-300"
            >
              {/* Event Date/Image Area */}
              <div className="w-full sm:w-40 h-40 bg-aether-blue-50/70 rounded-xl relative flex items-center justify-center shrink-0 shadow-inner">
                <span className="absolute top-3 left-3 text-[10px] font-extrabold bg-aether-blue-600 text-white px-2 py-1 rounded-full uppercase tracking-wider">
                  Oct 15
                </span>
                <Globe className="h-16 w-16 text-aether-blue-500/80 animate-pulse" />
              </div>

              {/* Event Copy Area */}
              <div className="flex flex-col justify-between py-1 space-y-4">
                <div className="space-y-2">
                  <span className="text-[10px] font-bold text-aether-blue-600 uppercase tracking-widest bg-aether-blue-50 px-2.5 py-1 rounded-md inline-block">
                    Conference
                  </span>
                  <h3 className="text-lg font-bold text-aether-dark tracking-tight">
                    Global AI Summit 2024
                  </h3>
                  <p className="text-xs sm:text-sm text-slate-500 leading-relaxed">
                    Join industry leaders for a two-day symposium on the future of autonomous agents and LLMs.
                  </p>
                </div>
                <Link to="/events/mock-summit-2024" className="inline-flex items-center gap-1.5 text-xs font-bold text-aether-blue-600 hover:text-aether-blue-700 group">
                  View Details
                  <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" />
                </Link>
              </div>
            </motion.div>

            {/* Event Card 2: Neural Networks Masterclass */}
            <motion.div
              whileHover={{ y: -4, boxShadow: "0 15px 35px rgba(37,99,235,0.06)" }}
              className="bg-white rounded-card border border-slate-100 p-6 flex flex-col sm:flex-row gap-6 text-left shadow-sm transition-all duration-300"
            >
              {/* Event Date/Image Area */}
              <div className="w-full sm:w-40 h-40 bg-sky-50/70 rounded-xl relative flex items-center justify-center shrink-0 shadow-inner">
                <span className="absolute top-3 left-3 text-[10px] font-extrabold bg-aether-blue-600 text-white px-2 py-1 rounded-full uppercase tracking-wider">
                  Nov 05
                </span>
                <Network className="h-16 w-16 text-sky-500/80" />
              </div>

              {/* Event Copy Area */}
              <div className="flex flex-col justify-between py-1 space-y-4">
                <div className="space-y-2">
                  <span className="text-[10px] font-bold text-sky-600 uppercase tracking-widest bg-sky-50 px-2.5 py-1 rounded-md inline-block">
                    Workshop
                  </span>
                  <h3 className="text-lg font-bold text-aether-dark tracking-tight">
                    Neural Networks Masterclass
                  </h3>
                  <p className="text-xs sm:text-sm text-slate-500 leading-relaxed">
                    Hands-on session building custom architectures using PyTorch and exploring modern optimization.
                  </p>
                </div>
                <Link to="/events/mock-masterclass-2024" className="inline-flex items-center gap-1.5 text-xs font-bold text-aether-blue-600 hover:text-aether-blue-700 group">
                  View Details
                  <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" />
                </Link>
              </div>
            </motion.div>

          </div>
        </div>
      </section>

    </div>
  );
};

export default HomePage;
