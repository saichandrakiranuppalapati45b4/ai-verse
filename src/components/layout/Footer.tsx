import React from "react";
import { Link } from "react-router-dom";
import { Send, MessageSquare } from "lucide-react";

// Custom SVG Social Icons to bypass missing brand icons in this version of lucide-react
const Twitter = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="M22 4s-.7 2.1-2 3.4c1.6 10-9.4 17.3-18 11.6 2.2.1 4.4-.6 6-2C3 15.5.5 9.6 3 5c2.2 2.6 5.6 4.1 9 4-.9-4.2 4-6.6 7-3.8 1.1 0 3-1.2 3-1.2z" />
  </svg>
);

const Github = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22" />
  </svg>
);

const Linkedin = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z" />
    <rect x="2" y="9" width="4" height="12" />
    <circle cx="4" cy="4" r="2" />
  </svg>
);

export const Footer: React.FC = () => {
  const handleNewsletterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    alert("Thank you for subscribing to our newsletter!");
  };

  return (
    <footer className="bg-[#0A0F1D] text-slate-400 font-sans border-t border-slate-900/60 pt-16 pb-12">
      <div className="max-w-7xl mx-auto px-6 lg:px-8">
        
        {/* Main Columns Grid */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-10 md:gap-8 pb-12 border-b border-slate-900">
          
          {/* Column 1: Logo & description */}
          <div className="md:col-span-4 space-y-5">
            <Link to="/" className="inline-flex items-center gap-1 group font-extrabold text-white text-xl tracking-tight select-none">
              <span className="text-white font-serif text-2xl font-semibold">AI Verse</span>
            </Link>
            <p className="text-sm text-slate-500 leading-relaxed max-w-sm">
              Empowering the next generation of AI pioneers through rigorous research and community-driven innovation.
            </p>
            {/* Social Links under logo */}
            <div className="flex items-center gap-4 text-slate-600 pt-2">
              <a href="#" className="hover:text-white transition-colors" aria-label="Twitter">
                <Twitter className="h-5 w-5" />
              </a>
              <a href="#" className="hover:text-white transition-colors" aria-label="GitHub">
                <Github className="h-5 w-5" />
              </a>
              <a href="#" className="hover:text-white transition-colors" aria-label="Discord">
                <MessageSquare className="h-5 w-5" />
              </a>
              <a href="#" className="hover:text-white transition-colors" aria-label="LinkedIn">
                <Linkedin className="h-5 w-5" />
              </a>
            </div>
          </div>

          {/* Column 2: Community */}
          <div className="md:col-span-2 space-y-4">
            <h3 className="text-sm font-semibold text-white tracking-wide font-sans">Community</h3>
            <ul className="space-y-2 text-sm text-slate-500">
              <li>
                <a href="#" className="hover:text-white transition-colors">Twitter</a>
              </li>
              <li>
                <a href="#" className="hover:text-white transition-colors">GitHub</a>
              </li>
              <li>
                <a href="#" className="hover:text-white transition-colors">Discord</a>
              </li>
              <li>
                <a href="#" className="hover:text-white transition-colors">LinkedIn</a>
              </li>
            </ul>
          </div>

          {/* Column 3: Resources */}
          <div className="md:col-span-2 space-y-4">
            <h3 className="text-sm font-semibold text-white tracking-wide font-sans">Resources</h3>
            <ul className="space-y-2 text-sm text-slate-500">
              <li>
                <a href="#" className="hover:text-white transition-colors">Newsletter</a>
              </li>
              <li>
                <a href="#" className="hover:text-white transition-colors">Privacy Policy</a>
              </li>
              <li>
                <a href="#" className="hover:text-white transition-colors">Code of Conduct</a>
              </li>
              <li>
                <a href="#" className="hover:text-white transition-colors">Contact</a>
              </li>
            </ul>
          </div>

          {/* Column 4: Newsletter Sign-up */}
          <div className="md:col-span-4 space-y-4">
            <h3 className="text-sm font-semibold text-white tracking-wide font-sans">Newsletter</h3>
            <p className="text-sm text-slate-500">Stay updated on the latest news.</p>
            <form onSubmit={handleNewsletterSubmit} className="flex items-center mt-2 max-w-sm">
              <div className="relative flex-grow">
                <input
                  type="email"
                  required
                  placeholder="Email"
                  className="w-full bg-[#141A2E] text-white placeholder-slate-600 text-sm px-4 py-3 rounded-lg border border-slate-800/80 outline-none focus:border-aether-blue-500 transition-colors font-sans"
                />
              </div>
              <button
                type="submit"
                className="ml-2 bg-aether-blue-600 hover:bg-aether-blue-700 text-white p-3 rounded-lg flex items-center justify-center transition-colors shadow-button"
                aria-label="Subscribe"
              >
                <Send className="h-4 w-4" />
              </button>
            </form>
          </div>

        </div>

        {/* Footer Bottom Bar */}
        <div className="pt-8 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-600 gap-4">
          <div>
            © 2026 AI Verse. Precise Innovation.
          </div>
          <div className="flex gap-6">
            <a href="#" className="hover:text-white transition-colors">Terms</a>
            <a href="#" className="hover:text-white transition-colors">Privacy</a>
            <a href="#" className="hover:text-white transition-colors">Cookies</a>
          </div>
        </div>

      </div>
    </footer>
  );
};

export default Footer;
