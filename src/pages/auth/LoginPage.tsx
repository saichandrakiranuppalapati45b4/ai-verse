import React, { useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { useNavigate, Link } from "react-router-dom";
import { Mail, Lock, Eye, EyeOff, Box, Cpu, Network } from "lucide-react";
import Button from "../../components/ui/Button";



import SEO from "../../components/layout/SEO";

const LoginPage: React.FC = () => {
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [keepLoggedIn, setKeepLoggedIn] = useState(false);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const navigate = useNavigate();

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      setError("Please enter your email address.");
      return;
    }

    if (!password) {
      setError("Please enter your password.");
      return;
    }

    const cleanEmail = email.toLowerCase().trim();
    setIsLoading(true);
    setError("");

    try {
      await login(cleanEmail, password);
      
      // Check user session for destination
      const savedUserStr = localStorage.getItem("aether_mock_user");
      let activeRole = "participant";
      let requiresPwChange = false;
      if (savedUserStr) {
        try {
          const parsed = JSON.parse(savedUserStr);
          if (parsed && parsed.role) activeRole = parsed.role;
          if (parsed && parsed.requiresPasswordChange) requiresPwChange = true;
        } catch (e) {}
      }

      const lowerRole = String(activeRole).toLowerCase().trim();

      if (lowerRole === "participant" || lowerRole === "member" || lowerRole.includes("participant") || lowerRole.includes("student member") || lowerRole.includes("volunteer")) {
        if (requiresPwChange) {
          navigate("/participant/set-password");
        } else {
          navigate("/participant/dashboard");
        }
      } else if (lowerRole === "organizer" || lowerRole.includes("organizer")) {
        navigate("/organizer/attendance");
      } else if (lowerRole === "jury" || lowerRole.includes("jury") || lowerRole.includes("evaluator")) {
        navigate("/jury");
      } else if (lowerRole === "faculty" || lowerRole.includes("admin") || lowerRole.includes("faculty")) {
        navigate("/faculty/dashboard");
      } else {
        navigate("/participant/dashboard");
      }
    } catch (err: any) {
      setError(err?.message || "Failed to sign in. Please check your credentials.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="relative min-h-[85vh] flex items-center justify-center px-4 py-16 bg-[#F8FAFC] overflow-hidden">
      <SEO 
        title="Login - Portal Access" 
        description="Sign in to the AI Verse administrative portal to manage events, bulletins, and user memberships." 
        keywords="AI Verse Login, Admin Portal Login, Faculty Login"
      />
      
      {/* Decorative Background Floating Outline Icons */}
      <Box className="w-16 h-16 text-blue-200/50 absolute left-[12%] top-[15%] pointer-events-none select-none hidden lg:block animate-pulse" />
      <Network className="w-14 h-14 text-blue-200/40 absolute left-[8%] top-[55%] pointer-events-none select-none hidden lg:block" />
      <Cpu className="w-16 h-16 text-blue-200/50 absolute right-[12%] bottom-[20%] pointer-events-none select-none hidden lg:block" />

      {/* Main Login Card */}
      <div className="bg-white rounded-[32px] border border-slate-100/60 max-w-[460px] w-full p-8 md:p-10 shadow-[0_24px_50px_rgba(0,0,0,0.03)] relative z-10">
        
        {/* User Icon / Logo Box */}
        <div className="text-center mb-6">
          <div className="w-16 h-16 rounded-2xl bg-blue-50/70 flex items-center justify-center p-2 mx-auto mb-4 border border-blue-100/30 shadow-sm">
            <img src="/ai_verse.png" alt="AI Verse Logo" className="w-full h-full object-contain" />
          </div>
          <h2 className="text-3xl font-bold text-slate-900 tracking-tight">Welcome Back</h2>
          <p className="text-xs sm:text-sm text-slate-400 mt-1.5 font-medium">Enter your credentials to access the AI Verse Portal</p>
        </div>

        {error && (
          <div className="bg-red-50 text-red-600 text-xs p-3.5 rounded-xl mb-5 border border-red-100 text-center font-semibold">
            {error}
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleFormSubmit} className="space-y-4 text-left">
          {/* Email field */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Email Address
            </label>
            <div className="relative flex items-center">
              <Mail className="absolute left-4 h-4 w-4 text-slate-400 pointer-events-none" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@aiverse.in"
                className="w-full pl-11 pr-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-aether-blue-500/20 focus:border-aether-blue-500 transition-all font-sans text-sm text-slate-800 placeholder-slate-400"
                required
              />
            </div>

          </div>

          {/* Password field */}
          <div className="space-y-1.5">
            <div className="flex justify-between items-center">
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Password
              </label>
              <button
                type="button"
                onClick={() => alert("Password reset link has been sent to your email!")}
                className="text-xs font-semibold text-aether-blue-600 hover:text-aether-blue-700 transition-colors"
              >
                Forgot Password?
              </button>
            </div>
            <div className="relative flex items-center">
              <Lock className="absolute left-4 h-4 w-4 text-slate-400 pointer-events-none" />
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-11 pr-11 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-aether-blue-500/20 focus:border-aether-blue-500 transition-all font-sans text-sm text-slate-800 placeholder-slate-400"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 text-slate-400 hover:text-slate-600 transition-colors"
                aria-label="Toggle password visibility"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          {/* Keep logged in checkbox */}
          <div className="flex items-center gap-2.5 pt-1">
            <input
              type="checkbox"
              id="keep-logged-in"
              checked={keepLoggedIn}
              onChange={(e) => setKeepLoggedIn(e.target.checked)}
              className="w-4.5 h-4.5 text-aether-blue-600 border-slate-300 rounded focus:ring-aether-blue-500/20 cursor-pointer"
            />
            <label htmlFor="keep-logged-in" className="text-xs font-semibold text-slate-500 select-none cursor-pointer">
              Keep me logged in
            </label>
          </div>

          {/* Submit Button */}
          <Button
            type="submit"
            disabled={isLoading}
            variant="gradient"
            className="w-full py-3.5 mt-2 rounded-xl font-bold shadow-button hover:shadow-lg transition-all text-sm"
          >
            {isLoading ? "Signing in..." : "Login"}
          </Button>
        </form>



        {/* Sign up Footer text */}
        <div className="text-center text-xs sm:text-sm text-slate-400 mt-8 font-medium">
          Don't have an account?
          <Link to="/events" className="text-aether-blue-600 font-bold hover:underline ml-1">
            Join Club
          </Link>
        </div>



      </div>
    </div>
  );
};

export default LoginPage;
