import React, { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { getQuizById, getOrCreateQuizSession, getDeterministicSessionId } from "../../services/quizService";
import type { Quiz } from "../../types/quiz";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../../config/firebase";
import SEO from "../../components/layout/SEO";
import { 
  Clock, 
  HelpCircle, 
  Award, 
  AlertTriangle, 
  CheckCircle2, 
  ArrowRight, 
  ShieldCheck, 
  Wifi, 
  FileText, 
  Loader2,
  ChevronLeft
} from "lucide-react";

export const QuizLobbyPage: React.FC = () => {
  const { quizId } = useParams<{ quizId: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [starting, setStarting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [acknowledged, setAcknowledged] = useState<boolean>(false);

  useEffect(() => {
    if (!quizId) return;

    const loadQuizDetails = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await getQuizById(quizId);
        if (!data) {
          setError("The requested quiz could not be found or has not been published.");
          return;
        }

        setQuiz(data);

        // Check if user already submitted this quiz
        if (user?.uid) {
          const sessionId = getDeterministicSessionId(quizId, user.uid);
          const subSnap = await getDoc(doc(db, "quizSubmissions", sessionId));
          if (subSnap.exists()) {
            navigate(`/participant/quiz/${quizId}/completed`, { replace: true });
            return;
          }
        }
      } catch (err: any) {
        console.error("Error loading quiz lobby:", err);
        setError("Failed to load quiz details. Please check your internet connection.");
      } finally {
        setLoading(false);
      }
    };

    loadQuizDetails();
  }, [quizId, user, navigate]);

  const handleStartQuiz = async () => {
    if (!quiz || !user || starting || !acknowledged) return;

    try {
      setStarting(true);
      setError(null);

      // Initialize or restore session
      await getOrCreateQuizSession(quiz, {
        uid: user.uid,
        email: user.email,
        displayName: user.name || user.email
      }, {
        name: user.teamName
      });

      // Navigate to examination environment
      navigate(`/participant/quiz/${quiz.id}/take`);
    } catch (err: any) {
      console.error("Failed to start quiz session:", err);
      setError(err.message || "Failed to start quiz session. Please try again.");
      setStarting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F4F7FC] flex items-center justify-center p-6">
        <div className="text-center space-y-4">
          <Loader2 className="w-10 h-10 text-blue-600 animate-spin mx-auto" />
          <p className="text-sm font-bold text-slate-700">Loading quiz environment...</p>
        </div>
      </div>
    );
  }

  if (error || !quiz) {
    return (
      <div className="min-h-screen bg-[#F4F7FC] flex items-center justify-center p-6">
        <div className="bg-white border border-slate-200 rounded-3xl p-8 max-w-md w-full text-center space-y-5 shadow-sm">
          <div className="w-12 h-12 rounded-2xl bg-red-50 text-red-600 flex items-center justify-center mx-auto">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-extrabold text-[#0F172A]">Quiz Unavailable</h2>
            <p className="text-xs text-slate-500 font-medium mt-2">{error || "Quiz not found"}</p>
          </div>
          <Link
            to="/participant/dashboard"
            className="inline-flex items-center gap-2 bg-[#0F172A] hover:bg-slate-800 text-white font-bold text-xs px-6 py-3 rounded-xl transition-all"
          >
            <ChevronLeft className="w-4 h-4" /> Back to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F4F7FC] flex flex-col font-sans text-slate-800 antialiased selection:bg-blue-500/20 selection:text-blue-600">
      <SEO title={`${quiz.title} - AI Verse Quiz`} description={quiz.description} />

      {/* Top Bar */}
      <header className="h-16 px-6 sm:px-10 border-b border-slate-200/80 bg-white flex items-center justify-between sticky top-0 z-20 shadow-xs">
        <Link to="/participant/dashboard" className="flex items-center gap-3 group">
          <img src="/ai_verse.png" alt="AI Verse Logo" className="w-8 h-8 rounded-xl object-contain shadow-sm" />
          <div className="leading-tight">
            <span className="text-sm font-extrabold text-[#0F172A] block tracking-tight">AI Verse</span>
            <span className="text-[10px] text-slate-400 font-semibold block">Quiz Assessment Portal</span>
          </div>
        </Link>

        <div className="flex items-center gap-3">
          <span className="text-xs font-bold text-blue-700 bg-blue-50 border border-blue-200/70 px-3 py-1 rounded-full">
            {quiz.track || "General Track"}
          </span>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl w-full mx-auto p-6 sm:p-10 space-y-8 flex-1">
        
        {/* Hero Card */}
        <div className="bg-white border border-slate-200/90 rounded-3xl p-6 sm:p-8 shadow-sm space-y-6">
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <span className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-[10px] font-extrabold uppercase tracking-wider px-3 py-1 rounded-full shadow-xs">
                OFFICIAL ASSESSMENT
              </span>
              {quiz.eventTitle && (
                <span className="text-xs font-semibold text-slate-500">
                  Part of: <strong className="text-[#0F172A]">{quiz.eventTitle}</strong>
                </span>
              )}
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-[#0F172A] tracking-tight">{quiz.title}</h1>
            <p className="text-sm text-slate-500 font-medium leading-relaxed">{quiz.description || "Official examination for AI Verse participants."}</p>
          </div>

          {/* Quick Metrics Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-2">
            <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 text-center">
              <Clock className="w-5 h-5 text-blue-600 mx-auto mb-1.5" />
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Duration</span>
              <span className="text-lg font-black text-[#0F172A]">{quiz.durationMinutes} Mins</span>
            </div>

            <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 text-center">
              <HelpCircle className="w-5 h-5 text-indigo-600 mx-auto mb-1.5" />
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Questions</span>
              <span className="text-lg font-black text-[#0F172A]">{quiz.questions?.length || quiz.questionsCount || 0} MCQs</span>
            </div>

            <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 text-center">
              <Award className="w-5 h-5 text-amber-600 mx-auto mb-1.5" />
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Total Marks</span>
              <span className="text-lg font-black text-[#0F172A]">{quiz.totalMarks} Pts</span>
            </div>

            <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 text-center">
              <Wifi className="w-5 h-5 text-emerald-600 mx-auto mb-1.5" />
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Autosave</span>
              <span className="text-lg font-black text-[#0F172A]">Real-Time</span>
            </div>
          </div>
        </div>

        {/* Instructions & Guidelines */}
        <div className="bg-white border border-slate-200/90 rounded-3xl p-6 sm:p-8 shadow-sm space-y-5">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
              <FileText className="w-4 h-4" />
            </div>
            <h2 className="text-lg font-extrabold text-[#0F172A]">Instructions & Code of Conduct</h2>
          </div>

          <ul className="space-y-3">
            {quiz.instructions.map((inst, i) => (
              <li key={i} className="flex items-start gap-3 text-xs sm:text-sm text-slate-600 font-medium">
                <CheckCircle2 className="w-4.5 h-4.5 text-blue-600 shrink-0 mt-0.5" />
                <span>{inst}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Readiness Verification & Start Button */}
        <div className="bg-white border border-slate-200/90 rounded-3xl p-6 sm:p-8 shadow-sm space-y-6">
          <div className="flex items-center gap-3">
            <ShieldCheck className="w-6 h-6 text-emerald-600 shrink-0" />
            <div>
              <h3 className="text-base font-extrabold text-[#0F172A]">Participant Verification</h3>
              <p className="text-xs text-slate-500 font-medium">
                Logged in as <strong className="text-[#0F172A]">{user?.name || user?.email}</strong>
                {user?.teamName && <> (Team: <strong className="text-blue-600">{user.teamName}</strong>)</>}
              </p>
            </div>
          </div>

          <label className="flex items-start gap-3 p-4 bg-blue-50/50 border border-blue-100 rounded-2xl cursor-pointer hover:bg-blue-50 transition-colors">
            <input
              type="checkbox"
              checked={acknowledged}
              onChange={(e) => setAcknowledged(e.target.checked)}
              className="mt-0.5 w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-slate-300 cursor-pointer"
            />
            <span className="text-xs font-semibold text-slate-700 leading-relaxed">
              I confirm that I am ready to begin the exam. I understand that once started, the timer will count down continuously and my answers will automatically submit when time expires.
            </span>
          </label>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-2">
            <Link
              to="/participant/dashboard"
              className="text-xs font-bold text-slate-500 hover:text-slate-800 text-center sm:text-left"
            >
              Cancel and return to dashboard
            </Link>

            <button
              onClick={handleStartQuiz}
              disabled={!acknowledged || starting}
              className={`bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold text-sm px-8 py-3.5 rounded-xl shadow-lg shadow-blue-600/30 transition-all flex items-center justify-center gap-2 cursor-pointer ${
                !acknowledged || starting ? "opacity-50 cursor-not-allowed" : ""
              }`}
            >
              {starting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Initializing Exam Session...</span>
                </>
              ) : (
                <>
                  <span>Start Examination</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        </div>

      </main>
    </div>
  );
};

export default QuizLobbyPage;
