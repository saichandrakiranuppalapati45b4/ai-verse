import React, { useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import Button from "../../components/ui/Button";

// Import local assets
import galleryLab from "../../assets/images/gallery_lab.png";
import gallerySymposium from "../../assets/images/gallery_symposium.png";
import galleryVr from "../../assets/images/gallery_vr.png";
import galleryCoding from "../../assets/images/gallery_coding.png";
import galleryCoworking from "../../assets/images/gallery_coworking.png";
import galleryCollab from "../../assets/images/gallery_collab.png";

import SEO from "../../components/layout/SEO";

interface GalleryItem {
  id: string;
  category: "Workshops" | "Hackathons" | "Symposiums" | "Socials";
  image: string;
  alt: string;
}

const GalleryPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<"All" | "Workshops" | "Hackathons" | "Symposiums" | "Socials">("All");

  const galleryItems: GalleryItem[] = [
    {
      id: "1",
      category: "Workshops",
      image: galleryLab,
      alt: "Students working on laptops in a high-tech AI research lab"
    },
    {
      id: "2",
      category: "Symposiums",
      image: gallerySymposium,
      alt: "Presenter presenting slides to a group of student audience"
    },
    {
      id: "3",
      category: "Workshops",
      image: galleryVr,
      alt: "Student experimenting on human-computer interaction using VR headset"
    },
    {
      id: "4",
      category: "Hackathons",
      image: galleryCoding,
      alt: "Student team sitting together coding late night at computer stations"
    },
    {
      id: "5",
      category: "Socials",
      image: galleryCoworking,
      alt: "Co-workers laughing and reviewing software design at a cafe table"
    },
    {
      id: "6",
      category: "Hackathons",
      image: galleryCollab,
      alt: "Hands outlining interface mockups and system blueprints on a desk"
    }
  ];

  // Filter gallery items based on selected tab
  const filteredItems = galleryItems.filter(item => {
    if (activeTab === "All") return true;
    return item.category === activeTab;
  });

  const tabOptions: Array<"All" | "Workshops" | "Hackathons" | "Symposiums" | "Socials"> = [
    "All",
    "Workshops",
    "Hackathons",
    "Symposiums",
    "Socials"
  ];

  return (
    <div className="overflow-hidden bg-[#FAFBFC] pb-16 min-h-screen font-sans">
      <SEO 
        title="Gallery - Our Visual Legacy" 
        description="Take a visual journey through AI Verse workshops, seminars, hackathons, and collaborative student research projects." 
        keywords="AI Verse Gallery, Student Projects, AI Workshops, Hackathons Gallery"
      />
      
      {/* ================= HERO / HEADER SECTION ================= */}
      <section className="relative pt-24 pb-12 px-6 lg:px-8 text-center bg-[#FAFBFC]">
        {/* Subtle background glow */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none -z-10">
          <div className="absolute top-[15%] left-[50%] -translate-x-1/2 w-[600px] h-[600px] rounded-full bg-blue-50/50 blur-[100px]"></div>
        </div>

        <div className="max-w-3xl mx-auto space-y-4 py-8">
          <motion.h1 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-5xl md:text-6xl font-serif font-semibold text-slate-900 tracking-tight"
          >
            Our Visual Legacy
          </motion.h1>
          <motion.p 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="text-slate-500 text-sm sm:text-base leading-relaxed max-w-2xl mx-auto font-normal"
          >
            Capturing moments of groundbreaking innovation, collaborative excellence, and the vibrant community driving the future of artificial intelligence.
          </motion.p>
        </div>
      </section>

      {/* ================= TAB CONTROLS ================= */}
      <section className="max-w-7xl mx-auto px-6 lg:px-8 mb-12">
        <div className="flex flex-wrap items-center justify-center gap-3">
          {tabOptions.map((tab) => {
            const isActive = activeTab === tab;
            return (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-6 py-2.5 rounded-full text-xs font-semibold tracking-wide border transition-all duration-200 select-none
                  ${isActive
                    ? "bg-aether-blue-600 text-white border-aether-blue-600 shadow-sm"
                    : "bg-white text-slate-600 border-slate-200 hover:border-slate-300 hover:bg-slate-50"
                  }`}
              >
                {tab}
              </button>
            );
          })}
        </div>
      </section>

      {/* ================= GALLERY IMAGES GRID ================= */}
      <section className="max-w-7xl mx-auto px-6 lg:px-8 mb-20">
        <motion.div 
          layout
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8"
        >
          {filteredItems.map((item) => (
            <motion.div
              layout
              key={item.id}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.4 }}
              className="group bg-white rounded-[20px] overflow-hidden shadow-[0_4px_25px_rgba(0,0,0,0.02)] border border-slate-100 hover:shadow-card hover:-translate-y-1 transition-all duration-300"
            >
              <div className="relative overflow-hidden aspect-[4/3] bg-slate-50">
                <img
                  src={item.image}
                  alt={item.alt}
                  className="w-full h-full object-cover group-hover:scale-103 transition-transform duration-500"
                />
                {/* Clean hover overlay showing category label */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end p-6">
                  <span className="bg-white/90 backdrop-blur-sm px-3 py-1 rounded-md text-[10px] font-bold text-aether-blue-600 uppercase tracking-wider shadow-sm">
                    {item.category}
                  </span>
                </div>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </section>

      {/* ================= CALL TO ACTION SECTION ================= */}
      <section className="max-w-6xl mx-auto px-6 lg:px-8 mb-12">
        <div className="bg-gradient-to-r from-aether-blue-600 to-blue-600 rounded-[24px] p-10 md:p-16 text-center text-white border border-blue-700 shadow-xl relative overflow-hidden">
          {/* Subtle decoration elements */}
          <div className="absolute -top-32 -left-32 w-64 h-64 bg-white/5 rounded-full blur-3xl pointer-events-none"></div>
          <div className="absolute -bottom-32 -right-32 w-64 h-64 bg-white/10 rounded-full blur-3xl pointer-events-none"></div>
          
          <div className="max-w-xl mx-auto space-y-6 relative z-10">
            <h2 className="text-3xl md:text-4xl font-serif font-semibold leading-tight tracking-tight">
              Be Part of the Next Frame
            </h2>
            <p className="text-blue-100 text-sm md:text-base font-normal leading-relaxed">
              Join our upcoming events and help us build the future of AI innovation together.
            </p>
            
            <div className="flex flex-wrap items-center justify-center gap-4 pt-4">
              <Link to="/events">
                <Button variant="secondary" className="rounded-full px-7 py-3 font-bold text-aether-blue-600 bg-white hover:bg-slate-50 transition-all text-sm shadow-md">
                  View Upcoming Events
                </Button>
              </Link>
              <Link to="/contact">
                <button className="rounded-full px-7 py-3 font-bold border border-white/30 bg-white/10 hover:bg-white/20 text-white transition-all text-sm">
                  Submit Your Project
                </button>
              </Link>
            </div>
          </div>
        </div>
      </section>

    </div>
  );
};

export default GalleryPage;
