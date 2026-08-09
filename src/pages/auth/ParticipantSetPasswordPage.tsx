import React, { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { Eye, EyeOff, CheckCircle2, Circle, ArrowRight, Network, Check } from "lucide-react";
import SEO from "../../components/layout/SEO";

export const ParticipantSetPasswordPage: React.FC = () => {
  const { updateUserPassword } = useAuth();
  const navigate = useNavigate();

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  // Criteria validation
  const hasMinLength = newPassword.length >= 8;
  const hasUppercase = /[A-Z]/.test(newPassword);
  const hasLowercase = /[a-z]/.test(newPassword);
  const hasNumber = /[0-9]/.test(newPassword);
  const hasSpecialChar = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(newPassword);

  const satisfiedCount = useMemo(() => {
    let count = 0;
    if (hasMinLength) count++;
    if (hasUppercase) count++;
    if (hasLowercase) count++;
    if (hasNumber) count++;
    if (hasSpecialChar) count++;
    return count;
  }, [hasMinLength, hasUppercase, hasLowercase, hasNumber, hasSpecialChar]);

  const strengthLabel = useMemo(() => {
    if (newPassword.length === 0) return "Weak";
    if (satisfiedCount <= 2) return "Weak";
    if (satisfiedCount === 3 || satisfiedCount === 4) return "Fair";
    return "Strong";
  }, [newPassword, satisfiedCount]);

  const strengthColor = useMemo(() => {
    if (newPassword.length === 0) return "text-slate-400 bg-slate-200";
    if (satisfiedCount <= 2) return "text-red-600 bg-red-500";
    if (satisfiedCount === 3 || satisfiedCount === 4) return "text-amber-600 bg-amber-500";
    return "text-emerald-600 bg-emerald-500";
  }, [newPassword, satisfiedCount]);

  const isFormValid = satisfiedCount === 5 && newPassword === confirmPassword && confirmPassword.length > 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (satisfiedCount < 5) {
      setError("Please satisfy all password security requirements.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setIsSubmitting(true);
    try {
      if (updateUserPassword) {
        await updateUserPassword(newPassword);
      }
      setIsSuccess(true);
      setTimeout(() => {
        navigate("/participant/review-team", { replace: true });
      }, 500);
    } catch (err: any) {
      setError(err?.message || "Failed to update password. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12 bg-[#F8FAFC]">
      <SEO 
        title="Set New Password - AI Verse Participant Portal"
        description="Create a secure password to access your AI Verse participant portal."
      />

      <div className="bg-white rounded-[32px] border border-slate-100/70 max-w-[460px] w-full p-8 sm:p-10 shadow-[0_24px_50px_rgba(0,0,0,0.03)] text-center relative z-10">
        
        {/* Brand Icon Squircle */}
        <div className="w-14 h-14 rounded-2xl bg-[#0266C8] text-white flex items-center justify-center mx-auto mb-3 shadow-md shadow-blue-500/20 border border-blue-400/20">
          <Network className="h-7 w-7 stroke-[2.2]" />
        </div>

        {/* Brand Title */}
        <h1 className="text-xl font-bold text-slate-900 tracking-tight font-sans mb-6">
          AI Verse
        </h1>

        {/* Form Heading */}
        <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight mb-2">
          Set your new password
        </h2>
        <p className="text-xs sm:text-sm text-slate-400 font-medium max-w-xs mx-auto mb-8 leading-relaxed">
          Create a secure password to access your participant portal.
        </p>

        {error && (
          <div className="bg-red-50 text-red-600 text-xs p-3.5 rounded-xl mb-5 border border-red-100 text-center font-semibold animate-shake">
            {error}
          </div>
        )}

        {isSuccess && (
          <div className="bg-emerald-50 text-emerald-700 text-xs p-3.5 rounded-xl mb-5 border border-emerald-200 text-center font-bold flex items-center justify-center gap-2">
            <Check className="w-4 h-4" /> Password updated! Redirecting to Portal...
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5 text-left">
          
          {/* New Password Input */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-700 tracking-wide">
              New Password
            </label>
            <div className="relative flex items-center">
              <input
                type={showNewPassword ? "text" : "password"}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Enter at least 8 characters"
                className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-sans text-sm text-slate-800 placeholder-slate-400 pr-11"
                required
              />
              <button
                type="button"
                onClick={() => setShowNewPassword(!showNewPassword)}
                className="absolute right-3.5 text-slate-400 hover:text-slate-600 transition-colors p-1"
                aria-label="Toggle password visibility"
              >
                {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          {/* Password Strength Section */}
          <div className="space-y-2 pt-1">
            <div className="flex justify-between items-center text-xs">
              <span className="font-bold text-slate-500">Password Strength</span>
              <span className={`font-bold transition-colors ${
                strengthLabel === "Weak" ? "text-slate-400" :
                strengthLabel === "Fair" ? "text-amber-600" : "text-emerald-600"
              }`}>
                {strengthLabel}
              </span>
            </div>
            
            {/* Progress Bar Segments */}
            <div className="grid grid-cols-4 gap-1.5 h-1.5 w-full">
              {[1, 2, 3, 4].map((step) => {
                const filled = (satisfiedCount >= step * 1.25) || (satisfiedCount === 5 && step === 4);
                return (
                  <div
                    key={step}
                    className={`h-full rounded-full transition-all duration-300 ${
                      filled ? strengthColor.split(" ")[1] : "bg-slate-100"
                    }`}
                  />
                );
              })}
            </div>
          </div>

          {/* Requirements Checklist Box */}
          <div className="bg-slate-50/70 border border-slate-100/90 rounded-2xl p-4 space-y-2.5 text-xs">
            
            <div className="flex items-center gap-2.5">
              {hasMinLength ? (
                <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
              ) : (
                <Circle className="h-4 w-4 text-slate-300 shrink-0" />
              )}
              <span className={hasMinLength ? "text-slate-800 font-semibold" : "text-slate-500 font-medium"}>
                At least 8 characters
              </span>
            </div>

            <div className="flex items-center gap-2.5">
              {hasUppercase ? (
                <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
              ) : (
                <Circle className="h-4 w-4 text-slate-300 shrink-0" />
              )}
              <span className={hasUppercase ? "text-slate-800 font-semibold" : "text-slate-500 font-medium"}>
                One uppercase letter
              </span>
            </div>

            <div className="flex items-center gap-2.5">
              {hasLowercase ? (
                <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
              ) : (
                <Circle className="h-4 w-4 text-slate-300 shrink-0" />
              )}
              <span className={hasLowercase ? "text-slate-800 font-semibold" : "text-slate-500 font-medium"}>
                One lowercase letter
              </span>
            </div>

            <div className="flex items-center gap-2.5">
              {hasNumber ? (
                <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
              ) : (
                <Circle className="h-4 w-4 text-slate-300 shrink-0" />
              )}
              <span className={hasNumber ? "text-slate-800 font-semibold" : "text-slate-500 font-medium"}>
                One number
              </span>
            </div>

            <div className="flex items-center gap-2.5">
              {hasSpecialChar ? (
                <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
              ) : (
                <Circle className="h-4 w-4 text-slate-300 shrink-0" />
              )}
              <span className={hasSpecialChar ? "text-slate-800 font-semibold" : "text-slate-500 font-medium"}>
                One special character
              </span>
            </div>

          </div>

          {/* Confirm Password Input */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-700 tracking-wide">
              Confirm Password
            </label>
            <div className="relative flex items-center">
              <input
                type={showConfirmPassword ? "text" : "password"}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Re-enter your new password"
                className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-sans text-sm text-slate-800 placeholder-slate-400 pr-11"
                required
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3.5 text-slate-400 hover:text-slate-600 transition-colors p-1"
                aria-label="Toggle confirm password visibility"
              >
                {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {confirmPassword.length > 0 && confirmPassword !== newPassword && (
              <p className="text-[11px] text-red-500 font-semibold pt-0.5">Passwords do not match</p>
            )}
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isSubmitting || !isFormValid}
            className={`w-full py-3.5 mt-4 rounded-xl font-bold text-white transition-all duration-200 text-sm flex items-center justify-center gap-2 cursor-pointer shadow-md ${
              isFormValid
                ? "bg-[#3B82F6] hover:bg-blue-600 active:bg-blue-700 shadow-blue-500/25"
                : "bg-blue-400/80 cursor-not-allowed opacity-90"
            }`}
          >
            {isSubmitting ? (
              <span>Saving...</span>
            ) : (
              <>
                <span>Set Password & Continue</span>
                <ArrowRight className="h-4 w-4 stroke-[2.5]" />
              </>
            )}
          </button>

        </form>
      </div>
    </div>
  );
};

export default ParticipantSetPasswordPage;
