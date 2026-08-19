import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { 
  getQuizById, 
  getOrCreateQuizSession, 
  submitQuizFinal 
} from "../../services/quizService";
import type { Quiz, QuizSession, QuizQuestion } from "../../types/quiz";
import { useQuizTimer } from "../../hooks/useQuizTimer";
import { useQuizSession } from "../../hooks/useQuizSession";
import SEO from "../../components/layout/SEO";
import { 
  Clock, 
  Flag, 
  Check, 
  ArrowLeft, 
  ArrowRight, 
  RotateCcw, 
  Send, 
  AlertCircle, 
  WifiOff, 
  Loader2, 
  ShieldAlert,
  Code
} from "lucide-react";

export const QuizTakingPage: React.FC = () => {
  const { quizId } = useParams<{ quizId: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [session, setSession] = useState<QuizSession | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Submitting state
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [showSubmitModal, setShowSubmitModal] = useState<boolean>(false);
  const [showTimeoutModal, setShowTimeoutModal] = useState<boolean>(false);

  // 1. Initial Load: Quiz & Authoritative Session
  useEffect(() => {
    if (!quizId || !user) return;

    let isMounted = true;
    const initExam = async () => {
      try {
        setLoading(true);
        setError(null);

        const quizData = await getQuizById(quizId);
        if (!quizData || !quizData.questions || quizData.questions.length === 0) {
          throw new Error("Quiz questions are not available for this session.");
        }

        const userSession = await getOrCreateQuizSession(quizData, {
          uid: user.uid,
          email: user.email,
          displayName: user.name || user.email
        }, {
          name: user.teamName
        });

        // If session was already finalized, redirect to completion receipt
        if (userSession.status === "submitted") {
          navigate(`/participant/quiz/${quizId}/completed`, { replace: true });
          return;
        }

        if (isMounted) {
          setQuiz(quizData);
          setSession(userSession);
        }
      } catch (err: any) {
        console.error("Error initializing exam session:", err);
        if (isMounted) {
          setError(err.message || "Failed to load examination environment.");
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    initExam();
    return () => { isMounted = false; };
  }, [quizId, user, navigate]);

  // Fallback safe objects for hooks
  const safeQuiz: Quiz = quiz || {
    id: quizId || "",
    title: "",
    description: "",
    durationMinutes: 30,
    totalMarks: 50,
    instructions: [],
    status: "active",
    questionsCount: 0,
    questions: [],
    createdAt: 0,
    updatedAt: 0
  };

  const safeSession: QuizSession = session || {
    id: "",
    quizId: quizId || "",
    quizTitle: "",
    userId: user?.uid || "",
    userEmail: user?.email || "",
    userName: user?.name || "Participant",
    startTime: Date.now(),
    endTime: Date.now() + 30 * 60 * 1000,
    durationMinutes: 30,
    status: "in_progress",
    lastAutosavedAt: Date.now(),
    createdAt: Date.now(),
    updatedAt: Date.now()
  };

  // 2. Client Session & Autosave State Hook
  const {
    answers,
    flaggedQuestions,
    currentQuestionIndex,
    saveStatus,
    selectOption,
    clearOption,
    toggleFlag,
    goToQuestion,
    forceSave
  } = useQuizSession({
    quiz: safeQuiz,
    session: safeSession
  });

  // 3. Final Submission Handler
  const handleFinalSubmit = useCallback(async (isAuto = false) => {
    if (!quiz || !session || isSubmitting) return;

    try {
      setIsSubmitting(true);
      // Synchronize latest draft state immediately before submit
      await forceSave();

      const result = await submitQuizFinal(
        session,
        answers,
        quiz.questions?.length || 0,
        isAuto
      );

      // Navigate to confirmation receipt
      navigate(`/participant/quiz/${quiz.id}/completed`, { 
        replace: true,
        state: { submission: result } 
      });
    } catch (err: any) {
      console.error("Final submission failed:", err);
      setIsSubmitting(false);
      alert("Submission error: " + (err.message || "Please check connection and retry."));
    }
  }, [quiz, session, isSubmitting, answers, forceSave, navigate]);

  // 4. Authoritative Server Timer Hook
  const handleTimeExpired = useCallback(() => {
    setShowTimeoutModal(true);
    handleFinalSubmit(true);
  }, [handleFinalSubmit]);

  const { formattedTime, isUrgent } = useQuizTimer({
    endTime: session?.endTime || 0,
    onTimeExpired: handleTimeExpired
  });

  // Calculate quick stats
  const questionsList = useMemo(() => quiz?.questions || [], [quiz]);
  const currentQuestion: QuizQuestion | undefined = questionsList[currentQuestionIndex];
  const totalQuestions = questionsList.length;
  const answeredCount = useMemo(() => Object.keys(answers).filter(k => !!answers[k]).length, [answers]);
  const flaggedCount = flaggedQuestions.length;
  const unansweredCount = Math.max(0, totalQuestions - answeredCount);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0B132B] flex flex-col items-center justify-center p-6 text-white">
        <Loader2 className="w-12 h-12 text-blue-500 animate-spin mb-4" />
        <h2 className="text-xl font-bold">Securing Exam Session...</h2>
        <p className="text-xs text-slate-400 mt-1">Fetching questions and syncing authoritative timer</p>
      </div>
    );
  }

  if (error || !quiz || !session || !currentQuestion) {
    return (
      <div className="min-h-screen bg-[#F4F7FC] flex items-center justify-center p-6">
        <div className="bg-white border border-slate-200 rounded-3xl p-8 max-w-md w-full text-center space-y-4 shadow-sm">
          <ShieldAlert className="w-12 h-12 text-red-500 mx-auto" />
          <h2 className="text-xl font-extrabold text-[#0F172A]">Exam Session Error</h2>
          <p className="text-xs text-slate-500">{error || "Could not load quiz questions."}</p>
          <button
            onClick={() => navigate("/participant/dashboard")}
            className="bg-[#0F172A] text-white font-bold text-xs px-6 py-2.5 rounded-xl cursor-pointer"
          >
            Return to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F4F7FC] flex flex-col font-sans text-slate-800 antialiased select-none">
      <SEO 
        title={`Assessment: ${quiz.title} - AI Verse`}
        description="Active examination environment with autosave and authoritative countdown timer." 
      />

      {/* ================= TOP NAV BAR / TIMER & AUTOSAVE STATUS ================= */}
      <header className="h-16 px-4 sm:px-8 border-b border-slate-200/90 bg-white flex items-center justify-between sticky top-0 z-30 shadow-xs">
        
        {/* Left Brand & Quiz Info */}
        <div className="flex items-center gap-3 min-w-0">
          <img src="/ai_verse.png" alt="AI Verse Logo" className="w-8 h-8 rounded-xl object-contain shrink-0" />
          <div className="min-w-0 hidden md:block">
            <h1 className="text-sm font-black text-[#0F172A] truncate tracking-tight">{quiz.title}</h1>
            <p className="text-[10px] text-slate-400 font-semibold truncate">
              {user?.name} {user?.teamName ? `• ${user.teamName}` : ""}
            </p>
          </div>
        </div>

        {/* Center: Authoritative Countdown Timer */}
        <div className={`flex items-center gap-2 px-4 py-1.5 rounded-2xl transition-all ${
          isUrgent 
            ? "bg-red-50 text-red-600 border border-red-200 animate-pulse font-black" 
            : "bg-[#0A1128] text-white border border-slate-800 font-extrabold shadow-inner"
        }`}>
          <Clock className={`w-4 h-4 ${isUrgent ? "text-red-500" : "text-blue-400"}`} />
          <span className="text-sm font-mono tracking-wider tabular-nums">
            {formattedTime}
          </span>
          <span className="text-[10px] uppercase font-bold opacity-75 hidden sm:inline">Remaining</span>
        </div>

        {/* Right: Autosave Pill & Quick Submit Button */}
        <div className="flex items-center gap-3">
          
          {/* Autosave Status Pill */}
          <div className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1 rounded-full border bg-slate-50 border-slate-200">
            {saveStatus === "saving" && (
              <>
                <Loader2 className="w-3 h-3 text-blue-600 animate-spin" />
                <span className="text-blue-600 text-[11px] hidden sm:inline">Saving...</span>
              </>
            )}
            {saveStatus === "saved" && (
              <>
                <Check className="w-3 h-3 text-emerald-600" />
                <span className="text-emerald-700 text-[11px] hidden sm:inline">Saved</span>
              </>
            )}
            {saveStatus === "retrying" && (
              <>
                <Loader2 className="w-3 h-3 text-amber-600 animate-spin" />
                <span className="text-amber-700 text-[11px] hidden sm:inline">Retrying...</span>
              </>
            )}
            {saveStatus === "offline" && (
              <>
                <WifiOff className="w-3 h-3 text-slate-400" />
                <span className="text-slate-500 text-[11px] hidden sm:inline">Offline (Saved Locally)</span>
              </>
            )}
            {saveStatus === "error" && (
              <>
                <AlertCircle className="w-3 h-3 text-red-500" />
                <span className="text-red-600 text-[11px] hidden sm:inline">Save Error</span>
              </>
            )}
          </div>

          <button
            onClick={() => setShowSubmitModal(true)}
            className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold text-xs px-4 py-2 rounded-xl shadow-md shadow-blue-500/20 transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <Send className="w-3.5 h-3.5" />
            <span>Finish & Submit</span>
          </button>
        </div>
      </header>

      {/* ================= MAIN EXAMINATION GRID ================= */}
      <main className="max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 flex-1 grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* ================= LEFT COLUMN: QUESTION CONTENT (8 COLS) ================= */}
        <div className="lg:col-span-8 space-y-5">
          
          {/* Question Card */}
          <div className="bg-white border border-slate-200/90 rounded-3xl p-6 sm:p-8 shadow-sm space-y-6">
            
            {/* Question Top Header */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <span className="bg-blue-50 text-blue-700 font-extrabold text-xs px-3 py-1 rounded-full border border-blue-200/70">
                  Question {currentQuestionIndex + 1} of {totalQuestions}
                </span>
              </div>

              {/* Mark for Review Button */}
              <button
                onClick={() => toggleFlag(currentQuestion.id)}
                className={`flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-xl transition-all cursor-pointer ${
                  flaggedQuestions.includes(currentQuestion.id)
                    ? "bg-amber-100 text-amber-800 border border-amber-300"
                    : "bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-200"
                }`}
              >
                <Flag className={`w-3.5 h-3.5 ${flaggedQuestions.includes(currentQuestion.id) ? "fill-amber-500 text-amber-600" : ""}`} />
                <span>{flaggedQuestions.includes(currentQuestion.id) ? "Flagged for Review" : "Flag for Review"}</span>
              </button>
            </div>

            {/* Question Text */}
            <div className="space-y-4">
              <p className="text-base sm:text-lg font-bold text-[#0F172A] leading-relaxed">
                {currentQuestion.text}
              </p>

              {/* Code Snippet Block (if question has code) */}
              {currentQuestion.codeSnippet && (
                <div className="bg-[#0B132B] text-blue-200 rounded-2xl p-4 font-mono text-xs overflow-x-auto border border-slate-800 shadow-inner">
                  <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-800 text-[10px] text-slate-400 uppercase font-bold">
                    <span className="flex items-center gap-1"><Code className="w-3 h-3 text-blue-400" /> {currentQuestion.codeLanguage || "Code"}</span>
                  </div>
                  <pre className="whitespace-pre">{currentQuestion.codeSnippet}</pre>
                </div>
              )}
            </div>

            {/* Options List */}
            <div className="space-y-3 pt-2">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                SELECT ONE OPTION:
              </span>

              {currentQuestion.options.map((option, idx) => {
                const isSelected = answers[currentQuestion.id] === option.id;
                const optionLetters = ["A", "B", "C", "D", "E", "F"];
                const letter = optionLetters[idx] || `${idx + 1}`;

                return (
                  <button
                    key={option.id}
                    type="button"
                    onClick={() => selectOption(currentQuestion.id, option.id)}
                    className={`w-full text-left p-4 rounded-2xl border transition-all flex items-start gap-4 cursor-pointer ${
                      isSelected
                        ? "bg-blue-50/70 border-blue-600 shadow-sm ring-2 ring-blue-500/20"
                        : "bg-white border-slate-200 hover:border-blue-300 hover:bg-slate-50/50"
                    }`}
                  >
                    {/* Option Letter Circle */}
                    <div className={`w-8 h-8 rounded-xl font-black text-xs flex items-center justify-center shrink-0 transition-colors ${
                      isSelected
                        ? "bg-blue-600 text-white shadow-xs"
                        : "bg-slate-100 text-slate-700"
                    }`}>
                      {letter}
                    </div>

                    {/* Option Text */}
                    <span className={`text-sm font-medium mt-1 leading-relaxed ${
                      isSelected ? "text-blue-950 font-bold" : "text-slate-700"
                    }`}>
                      {option.text}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Question Navigation Controls */}
            <div className="flex items-center justify-between pt-6 border-t border-slate-100 gap-3">
              <div>
                {answers[currentQuestion.id] && (
                  <button
                    onClick={() => clearOption(currentQuestion.id)}
                    className="flex items-center gap-1.5 text-xs font-bold text-slate-400 hover:text-red-500 transition-colors cursor-pointer"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Clear selection</span>
                  </button>
                )}
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => goToQuestion(currentQuestionIndex - 1)}
                  disabled={currentQuestionIndex === 0}
                  className="bg-slate-100 hover:bg-slate-200 text-slate-700 disabled:opacity-30 disabled:cursor-not-allowed font-bold text-xs px-4 py-2.5 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Previous</span>
                </button>

                <button
                  onClick={() => goToQuestion(currentQuestionIndex + 1)}
                  disabled={currentQuestionIndex === totalQuestions - 1}
                  className="bg-[#0F172A] hover:bg-slate-800 text-white disabled:opacity-30 disabled:cursor-not-allowed font-bold text-xs px-5 py-2.5 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer shadow-xs"
                >
                  <span>Next</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>

          </div>
        </div>

        {/* ================= RIGHT COLUMN: PALETTE & METRICS (4 COLS) ================= */}
        <div className="lg:col-span-4 space-y-5">
          
          {/* Question Palette Card */}
          <div className="bg-white border border-slate-200/90 rounded-3xl p-6 shadow-sm space-y-5">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-extrabold text-[#0F172A] uppercase tracking-wider">
                Question Palette
              </h3>
              <span className="text-xs font-bold text-blue-600">
                {answeredCount}/{totalQuestions} Answered
              </span>
            </div>

            {/* Quick Status Legend */}
            <div className="grid grid-cols-3 gap-2 text-[10px] font-bold">
              <div className="flex items-center gap-1.5 bg-blue-50 text-blue-700 px-2 py-1.5 rounded-lg border border-blue-100">
                <span className="w-2.5 h-2.5 rounded-full bg-blue-600" />
                <span>Answered ({answeredCount})</span>
              </div>
              <div className="flex items-center gap-1.5 bg-amber-50 text-amber-800 px-2 py-1.5 rounded-lg border border-amber-200">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                <span>Flagged ({flaggedCount})</span>
              </div>
              <div className="flex items-center gap-1.5 bg-slate-50 text-slate-600 px-2 py-1.5 rounded-lg border border-slate-200">
                <span className="w-2.5 h-2.5 rounded-full bg-slate-300" />
                <span>Pending ({unansweredCount})</span>
              </div>
            </div>

            {/* Question Buttons Matrix */}
            <div className="grid grid-cols-5 gap-2 max-h-[320px] overflow-y-auto p-1">
              {questionsList.map((q, idx) => {
                const isAnswered = !!answers[q.id];
                const isFlagged = flaggedQuestions.includes(q.id);
                const isCurrent = currentQuestionIndex === idx;

                let btnStyle = "bg-slate-100 text-slate-600 hover:bg-slate-200";
                if (isAnswered) {
                  btnStyle = "bg-blue-600 text-white font-black shadow-xs shadow-blue-500/20";
                }
                if (isFlagged) {
                  btnStyle = isAnswered 
                    ? "bg-gradient-to-br from-blue-600 to-amber-500 text-white font-black ring-2 ring-amber-400"
                    : "bg-amber-400 text-amber-950 font-black shadow-xs";
                }
                if (isCurrent) {
                  btnStyle += " ring-3 ring-blue-500 ring-offset-2";
                }

                return (
                  <button
                    key={q.id}
                    type="button"
                    onClick={() => goToQuestion(idx)}
                    className={`h-10 rounded-xl text-xs font-bold transition-all flex items-center justify-center relative cursor-pointer ${btnStyle}`}
                  >
                    <span>{idx + 1}</span>
                    {isFlagged && (
                      <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-amber-400 rounded-full border-2 border-white" />
                    )}
                  </button>
                );
              })}
            </div>

            {/* Finish & Submit Action Card */}
            <div className="pt-3 border-t border-slate-100 space-y-3">
              <button
                type="button"
                onClick={() => setShowSubmitModal(true)}
                className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-black text-sm py-3.5 rounded-2xl shadow-lg shadow-blue-600/25 transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <Send className="w-4 h-4" />
                <span>Submit Assessment</span>
              </button>
              <p className="text-[11px] text-center text-slate-400 font-medium">
                Autosaving continually • Safe to refresh
              </p>
            </div>

          </div>

        </div>

      </main>

      {/* ================= FINAL SUBMISSION CONFIRMATION MODAL ================= */}
      {showSubmitModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-3xl max-w-md w-full p-6 sm:p-8 space-y-6 shadow-2xl animate-in fade-in zoom-in-95 duration-200 text-left">
            <div className="text-center space-y-2">
              <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mx-auto">
                <Send className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-extrabold text-[#0F172A]">Submit Examination?</h3>
              <p className="text-xs text-slate-500 font-medium">
                Please confirm your answers below before finalizing your submission.
              </p>
            </div>

            {/* Summary Statistics */}
            <div className="grid grid-cols-3 gap-2 bg-slate-50 p-3 rounded-2xl border border-slate-200/80 text-center">
              <div>
                <span className="text-xs font-bold text-slate-400 block">Answered</span>
                <span className="text-lg font-black text-emerald-600">{answeredCount}</span>
              </div>
              <div>
                <span className="text-xs font-bold text-slate-400 block">Unanswered</span>
                <span className={`text-lg font-black ${unansweredCount > 0 ? "text-amber-600" : "text-slate-700"}`}>
                  {unansweredCount}
                </span>
              </div>
              <div>
                <span className="text-xs font-bold text-slate-400 block">Flagged</span>
                <span className="text-lg font-black text-indigo-600">{flaggedCount}</span>
              </div>
            </div>

            {unansweredCount > 0 && (
              <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-2.5 text-xs text-amber-800 font-medium">
                <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <span>You have <strong>{unansweredCount} unanswered questions</strong>. You can still return to complete them.</span>
              </div>
            )}

            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowSubmitModal(false)}
                disabled={isSubmitting}
                className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs py-3 rounded-xl transition-all cursor-pointer"
              >
                Back to Exam
              </button>

              <button
                type="button"
                onClick={() => handleFinalSubmit(false)}
                disabled={isSubmitting}
                className="flex-1 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold text-xs py-3 rounded-xl shadow-md shadow-blue-500/25 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Submitting...</span>
                  </>
                ) : (
                  <>
                    <span>Confirm Submit</span>
                    <Check className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= TIME EXPIRED AUTO-SUBMIT MODAL ================= */}
      {showTimeoutModal && (
        <div className="fixed inset-0 z-50 bg-[#0B132B]/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-3xl max-w-md w-full p-8 text-center space-y-4 shadow-2xl">
            <div className="w-14 h-14 rounded-2xl bg-red-50 text-red-600 flex items-center justify-center mx-auto animate-bounce">
              <Clock className="w-7 h-7" />
            </div>
            <h3 className="text-2xl font-black text-[#0F172A]">Time Has Expired!</h3>
            <p className="text-xs text-slate-500 font-medium leading-relaxed">
              Your allotted examination time has ended. Your answers have been automatically collected and finalized.
            </p>
            <div className="pt-2 flex justify-center">
              <div className="flex items-center gap-2 text-xs font-bold text-blue-600 bg-blue-50 px-4 py-2 rounded-xl">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Redirecting to submission receipt...</span>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default QuizTakingPage;
