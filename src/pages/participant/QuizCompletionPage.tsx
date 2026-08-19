import React, { useState, useEffect } from "react";
import { useParams, useLocation, Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { db } from "../../config/firebase";
import { doc, getDoc } from "firebase/firestore";
import type { QuizSubmission } from "../../types/quiz";
import { getDeterministicSessionId } from "../../services/quizService";
import SEO from "../../components/layout/SEO";
import { 
  CheckCircle2, 
  ArrowRight, 
  ShieldCheck, 
  ChevronRight
} from "lucide-react";

export const QuizCompletionPage: React.FC = () => {
  const { quizId } = useParams<{ quizId: string }>();
  const { user } = useAuth();
  const location = useLocation();

  const [submission, setSubmission] = useState<QuizSubmission | null>(
    (location.state as any)?.submission || null
  );

  useEffect(() => {
    if (submission || !quizId || !user) return;

    const fetchSubmission = async () => {
      try {
        const sessionId = getDeterministicSessionId(quizId, user.uid);
        const docSnap = await getDoc(doc(db, "quizSubmissions", sessionId));

        if (docSnap.exists()) {
          setSubmission(docSnap.data() as QuizSubmission);
        }
      } catch (err) {
        console.error("Error fetching quiz submission receipt:", err);
      }
    };

    fetchSubmission();
  }, [quizId, user, submission]);

  const formatSeconds = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs}s`;
  };

  return (
    <div className="min-h-screen bg-[#F4F7FC] flex flex-col font-sans text-slate-800 antialiased selection:bg-blue-500/20 selection:text-blue-600">
      <SEO 
        title="Assessment Completed - AI Verse" 
        description="Official submission receipt and score breakdown for AI Verse quiz assessment."
      />

      {/* Top Navbar */}
      <header className="h-16 px-6 sm:px-10 border-b border-slate-200/80 bg-white flex items-center justify-between sticky top-0 z-20 shadow-xs">
        <Link to="/participant/dashboard" className="flex items-center gap-3">
          <img src="/ai_verse.png" alt="AI Verse Logo" className="w-8 h-8 rounded-xl object-contain" />
          <span className="text-sm font-extrabold text-[#0F172A] tracking-tight">AI Verse Assessment</span>
        </Link>

        <Link
          to="/participant/dashboard"
          className="text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1"
        >
          <span>Dashboard</span>
          <ChevronRight className="w-4 h-4" />
        </Link>
      </header>

      {/* Main Receipt Content */}
      <main className="max-w-2xl w-full mx-auto p-6 sm:p-10 my-auto space-y-6">
        
        {/* Success Card */}
        <div className="bg-white border border-slate-200/90 rounded-3xl p-6 sm:p-10 shadow-sm text-center space-y-6">
          
          {/* Animated Success Badge */}
          <div className="w-16 h-16 rounded-3xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto ring-8 ring-emerald-500/10 animate-in zoom-in-75 duration-300">
            <CheckCircle2 className="w-9 h-9" />
          </div>

          <div className="space-y-2">
            <span className="bg-emerald-50 text-emerald-700 border border-emerald-200/80 text-[10px] font-black uppercase tracking-wider px-3 py-1 rounded-full">
              SUBMISSION RECEIVED & FINALIZED
            </span>
            <h1 className="text-2xl sm:text-3xl font-black text-[#0F172A] tracking-tight">
              Assessment Completed!
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 font-medium max-w-md mx-auto">
              Your examination answers have been securely written to the AI Verse assessment registry and locked.
            </p>
          </div>

          {/* Submission Details Grid */}
          <div className="bg-slate-50/80 border border-slate-200/80 rounded-2xl p-5 text-left space-y-4 text-xs">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200/70">
              <span className="text-slate-400 font-bold uppercase tracking-wider text-[10px]">Quiz Title</span>
              <span className="font-extrabold text-[#0F172A]">{submission?.quizTitle || "AI Verse Quiz"}</span>
            </div>

            <div className="flex items-center justify-between pb-3 border-b border-slate-200/70">
              <span className="text-slate-400 font-bold uppercase tracking-wider text-[10px]">Participant</span>
              <span className="font-bold text-[#0F172A]">{submission?.userName || user?.name || user?.email}</span>
            </div>

            <div className="flex items-center justify-between pb-3 border-b border-slate-200/70">
              <span className="text-slate-400 font-bold uppercase tracking-wider text-[10px]">Submission ID</span>
              <span className="font-mono font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded border border-blue-200/60">
                {submission?.id ? `SUB-${submission.id.substring(0, 8).toUpperCase()}` : "AI-SUB-RECORD"}
              </span>
            </div>

            <div className="grid grid-cols-3 gap-2 pt-1 text-center">
              <div className="bg-white p-2.5 rounded-xl border border-slate-200/60 shadow-2xs">
                <span className="text-[10px] font-bold text-slate-400 block uppercase">Answered</span>
                <span className="text-base font-black text-emerald-600">{submission?.answeredCount ?? "-"}</span>
              </div>
              <div className="bg-white p-2.5 rounded-xl border border-slate-200/60 shadow-2xs">
                <span className="text-[10px] font-bold text-slate-400 block uppercase">Unanswered</span>
                <span className="text-base font-black text-slate-600">{submission?.unansweredCount ?? "-"}</span>
              </div>
              <div className="bg-white p-2.5 rounded-xl border border-slate-200/60 shadow-2xs">
                <span className="text-[10px] font-bold text-slate-400 block uppercase">Time Taken</span>
                <span className="text-base font-black text-blue-600">
                  {submission?.timeSpentSeconds ? formatSeconds(submission.timeSpentSeconds) : "-"}
                </span>
              </div>
            </div>

            {submission?.submittedAt && (
              <div className="flex items-center justify-between pt-2 text-slate-400 text-[11px]">
                <span>Submitted on {new Date(submission.submittedAt).toLocaleDateString()}</span>
                <span>{new Date(submission.submittedAt).toLocaleTimeString()}</span>
              </div>
            )}
          </div>

          {/* Security & Verification Notice */}
          <div className="flex items-center justify-center gap-2 text-xs font-semibold text-slate-400">
            <ShieldCheck className="w-4 h-4 text-emerald-500" />
            <span>Cryptographically sealed & timestamped in AI Verse Cloud</span>
          </div>

          {/* Action Button */}
          <div className="pt-2">
            <Link
              to="/participant/dashboard"
              className="w-full bg-[#0F172A] hover:bg-slate-800 text-white font-bold text-xs py-3.5 rounded-xl transition-all shadow-md flex items-center justify-center gap-2"
            >
              <span>Return to Participant Dashboard</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

        </div>

      </main>
    </div>
  );
};

export default QuizCompletionPage;
