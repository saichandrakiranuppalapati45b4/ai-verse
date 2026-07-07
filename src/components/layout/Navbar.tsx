import React, { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { Menu, X, Shield } from "lucide-react";
import Button from "../ui/Button";

export const Navbar: React.FC = () => {
  const { user } = useAuth();
  const location = useLocation();
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Monitor page scroll to add background blur/shadow
  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 20) {
        setIsScrolled(true);
      } else {
        setIsScrolled(false);
      }
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Close mobile menu on route change
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [location.pathname]);

  const navLinks = [
    { path: "/", label: "Home" },
    { path: "/about", label: "About" },
    { path: "/events", label: "Events" },
    { path: "/gallery", label: "Gallery" },
    { path: "/team", label: "Team" },
  ];



  return (
    <header
      className={`fixed top-0 left-0 right-0 z-40 transition-all duration-300 flex items-center w-full h-20 border-b border-slate-100/80
        ${isScrolled 
          ? "bg-white/95 backdrop-blur-md shadow-md" 
          : "bg-white/80 backdrop-blur-md"
        }`}
    >
      <div className="max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between h-full">
        {/* Brand Logo */}
        <Link to="/" className="flex items-center gap-1.5 group font-extrabold text-aether-dark text-xl tracking-tight select-none">
          <span className="text-aether-blue-600 font-sans text-2xl font-black">AI</span>
          <span className="text-slate-900 font-sans text-2xl font-black">Verse</span>
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center gap-7">
          {navLinks.map((link) => {
            const isActive = location.pathname === link.path;
            return (
              <Link
                key={link.path}
                to={link.path}
                className={`text-sm font-semibold tracking-wide transition-colors relative py-1.5
                  ${isActive 
                    ? "text-aether-blue-600" 
                    : "text-slate-600 hover:text-aether-blue-600"
                  }`}
              >
                {link.label}
                {isActive && (
                  <span className="absolute bottom-0 left-0 w-full h-0.5 bg-aether-blue-600 rounded-full"></span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* Action Button Area */}
        <div className="hidden md:flex items-center gap-4">
          {user ? (
            <Link
              to={user.role === "faculty" ? "/faculty/dashboard" : "/organizer/dashboard"}
              className="flex items-center gap-2 text-sm font-semibold text-slate-700 hover:text-aether-blue-600 transition-colors py-2 px-3 hover:bg-slate-50 rounded-lg"
            >
              <Shield className="h-4 w-4" />
              Portal
            </Link>
          ) : (
            <Link
              to="/login"
              className="text-sm font-semibold text-slate-600 hover:text-aether-blue-600 transition-colors px-3 py-2"
            >
              Login
            </Link>
          )}

          <Link to="/events">
            <Button variant="gradient" size="sm" className="rounded-full font-bold shadow-button px-5 py-2">
              Join Club
            </Button>
          </Link>
        </div>

        {/* Mobile Toggle Button */}
        <button
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className="md:hidden p-2 hover:bg-slate-100 rounded-lg text-slate-600 transition-colors"
        >
          {isMobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </div>

      {/* Mobile Navigation Drawer */}
      {isMobileMenuOpen && (
        <div className="md:hidden absolute top-full left-0 w-full bg-white border border-slate-200/50 shadow-lg px-6 py-6 space-y-4 flex flex-col font-sans animate-fade-in mt-2 rounded-2xl"
        >
          {navLinks.map((link) => {
            const isActive = location.pathname === link.path;
            return (
              <Link
                key={link.path}
                to={link.path}
                className={`text-base font-bold py-1.5 transition-colors
                  ${isActive ? "text-aether-blue-600" : "text-slate-700 hover:text-aether-blue-600"}`}
              >
                {link.label}
              </Link>
            );
          })}
          
          <div className="border-t border-slate-100 pt-4 flex flex-col gap-3">
            {user ? (
              <Link
                to={user.role === "faculty" ? "/faculty/dashboard" : "/organizer/dashboard"}
                className="w-full text-center py-2.5 bg-slate-50 font-bold rounded-xl text-slate-700 hover:bg-slate-100 transition-all text-sm flex items-center justify-center gap-1.5"
              >
                <Shield className="h-4 w-4" />
                Go to Portal
              </Link>
            ) : (
              <Link
                to="/login"
                className="w-full text-center py-2.5 bg-slate-50 font-bold rounded-xl text-slate-700 hover:bg-slate-100 transition-all text-sm"
              >
                Login
              </Link>
            )}

            <Link to="/events" className="w-full">
              <Button variant="gradient" className="w-full py-3 rounded-xl font-bold shadow-button text-sm">
                Join Club
              </Button>
            </Link>
          </div>
        </div>
      )}
    </header>
  );
};

export default Navbar;
