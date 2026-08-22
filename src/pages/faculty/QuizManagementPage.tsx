import React, { useState, useEffect } from "react";
import { useNavigate, Link, useSearchParams } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { db } from "../../config/firebase";
import {
  collection,
  getDocs,
  doc,
  setDoc,
  updateDoc,
  onSnapshot,
  query,
  where
} from "firebase/firestore";
import type { Quiz, QuizQuestion, QuizSubmission, QuizSession } from "../../types/quiz";
import { resetParticipantQuizSession, resetAllQuizSubmissions, deleteQuizCascading } from "../../services/quizService";
import SEO from "../../components/layout/SEO";
import {
  HelpCircle,
  Plus,
  Edit3,
  Trash2,
  Award,
  CheckCircle2,
  Users,
  FileText,
  Download,
  ExternalLink,
  X,
  Loader2,
  ArrowLeft,
  Calendar,
  Save,
  Check,
  ArrowRight,
  AlertCircle,
  Play,
  Square,
  RotateCcw
} from "lucide-react";

interface EventOption {
  id: string;
  title: string;
  category?: string;
}

export const QuizManagementPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const eventIdParam = searchParams.get("eventId") || searchParams.get("accessEventId");
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [events, setEvents] = useState<EventOption[]>([]);
  const [submissions, setSubmissions] = useState<QuizSubmission[]>([]);
  const [activeSessions, setActiveSessions] = useState<QuizSession[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedQuizId, setSelectedQuizId] = useState<string>("");
  const [selectedEventFilter, setSelectedEventFilter] = useState<string>(eventIdParam || "all");

  // Keep selectedEventFilter in sync if URL eventIdParam changes
  useEffect(() => {
    if (eventIdParam) {
      setSelectedEventFilter(eventIdParam);
    }
  }, [eventIdParam]);

  // Compute currently active scoped event if filtered
  const activeEvent = React.useMemo(() => {
    if (selectedEventFilter === "all") return null;
    return events.find((e) => e.id === selectedEventFilter) || null;
  }, [events, selectedEventFilter]);

  // Filter quizzes strictly by active scoped event
  const filteredQuizzes = React.useMemo(() => {
    if (selectedEventFilter === "all") return quizzes;
    return quizzes.filter((q) => {
      if (q.eventId && q.eventId === selectedEventFilter) return true;
      if (activeEvent && q.eventTitle && q.eventTitle.toLowerCase().trim() === activeEvent.title.toLowerCase().trim()) return true;
      return false;
    });
  }, [quizzes, selectedEventFilter, activeEvent]);

  // Automatically update selectedQuizId when filteredQuizzes list changes
  useEffect(() => {
    if (filteredQuizzes.length > 0) {
      if (!selectedQuizId || !filteredQuizzes.some((q) => q.id === selectedQuizId)) {
        setSelectedQuizId(filteredQuizzes[0].id);
      }
    } else {
      setSelectedQuizId("");
    }
  }, [filteredQuizzes, selectedQuizId]);

  // View state: "list" or "editor" (Full-page editor mode)
  const [isEditorMode, setIsEditorMode] = useState<boolean>(false);
  const [editingQuiz, setEditingQuiz] = useState<Partial<Quiz> | null>(null);
  const [customCategories, setCustomCategories] = useState<string[]>([]);
  const [saving, setSaving] = useState<boolean>(false);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState<number>(0);
  const [showSettingsModal, setShowSettingsModal] = useState<boolean>(false);
  const [showCategoryModal, setShowCategoryModal] = useState<boolean>(false);
  const [newCategoryName, setNewCategoryName] = useState<string>("");
  const [selectedCategoryView, setSelectedCategoryView] = useState<string>("");

  // Active Tab for list mode
  const [activeTab, setActiveTab] = useState<"quizzes" | "live_monitor" | "submissions">("quizzes");

  // Load Quizzes & Events
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);

        // 1. Fetch Quizzes
        const quizSnap = await getDocs(collection(db, "quizzes"));
        const qList: Quiz[] = [];
        quizSnap.forEach((d) => {
          qList.push({ id: d.id, ...d.data() } as Quiz);
        });
        setQuizzes(qList);

        // 2. Fetch Events for dropdown selection
        const eventSnap = await getDocs(collection(db, "events"));
        const evList: EventOption[] = [];
        eventSnap.forEach((d) => {
          const data = d.data();
          evList.push({
            id: d.id,
            title: data.title || "Untitled Event",
            category: data.category || "General"
          });
        });
        setEvents(evList);
      } catch (err) {
        console.error("Error fetching quizzes or events:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Listen to live sessions & submissions for the selected quiz
  useEffect(() => {
    if (!selectedQuizId) {
      setSubmissions([]);
      setActiveSessions([]);
      return;
    }

    // Listen to submissions
    const unsubSubmissions = onSnapshot(
      query(collection(db, "quizSubmissions"), where("quizId", "==", selectedQuizId)),
      (snap) => {
        const subs: QuizSubmission[] = [];
        snap.forEach((d) => subs.push({ id: d.id, ...d.data() } as QuizSubmission));
        setSubmissions(subs);
      },
      (err) => console.warn("Submissions listener error:", err)
    );

    // Listen to sessions
    const unsubSessions = onSnapshot(
      query(collection(db, "quizSessions"), where("quizId", "==", selectedQuizId)),
      (snap) => {
        const sess: QuizSession[] = [];
        snap.forEach((d) => sess.push({ id: d.id, ...d.data() } as QuizSession));
        setActiveSessions(sess);
      },
      (err) => console.warn("Sessions listener error:", err)
    );

    return () => {
      unsubSubmissions();
      unsubSessions();
    };
  }, [selectedQuizId]);

  // Open Full-Page Create Mode
  const handleOpenCreateModal = () => {
    setCustomCategories([]);
    setSelectedCategoryView("");
    setCurrentQuestionIndex(-1);
    const targetEvent = activeEvent || (events.length > 0 ? events[0] : null);
    setEditingQuiz({
      title: "",
      description: "",
      eventId: targetEvent ? targetEvent.id : "",
      eventTitle: targetEvent ? targetEvent.title : "",
      track: targetEvent?.category ? `${targetEvent.category} Track` : "General Track",
      durationMinutes: 30,
      totalMarks: 50,
      passingMarks: 20,
      status: "active",
      instructions: [
        "Each question has 4 options with single correct answer.",
        "Your answers are automatically saved periodically in the background.",
        "You can navigate freely between questions using the Question Palette.",
        "Once submitted or when the timer expires, no further modifications are allowed."
      ],
      questions: []
    });
    setIsEditorMode(true);
  };

  const handleOpenEditModal = (quiz: Quiz) => {
    setEditingQuiz(JSON.parse(JSON.stringify(quiz)));
    const cats = Array.from(new Set(quiz.questions?.map(q => q.category).filter(Boolean) as string[]));
    setCustomCategories(cats);
    
    const initialCat = cats.length > 0 ? cats[0] : "";
    setSelectedCategoryView(initialCat);
    if (initialCat && quiz.questions && quiz.questions.length > 0) {
      const firstIdx = quiz.questions.findIndex(q => q.category === initialCat);
      setCurrentQuestionIndex(firstIdx !== -1 ? firstIdx : -1);
    } else {
      setCurrentQuestionIndex(-1);
    }
    
    setIsEditorMode(true);
  };

  // Save Quiz to Firestore
  const handleSaveQuiz = async () => {
    if (!editingQuiz || !editingQuiz.title?.trim() || saving) return;

    const incompleteQuestions = editingQuiz.questions?.filter(q => {
      const hasValidAnswer = !!q.correctOptionId && q.options.some(opt => opt.id === q.correctOptionId && opt.text.trim().length > 0);
      const hasText = q.text.trim().length > 0;
      const hasCategory = !!q.category && q.category.trim().length > 0;
      return !(hasValidAnswer && hasText && hasCategory);
    });

    if (incompleteQuestions && incompleteQuestions.length > 0) {
      alert(`Please complete all questions before saving. Missing fields in Question(s): ${incompleteQuestions.map(q => q.questionNumber).join(', ')} (Ensure Category, Question Text, and Correct Answer are set).`);
      return;
    }

    try {
      setSaving(true);
      const quizId = editingQuiz.id || `quiz_${Date.now()}`;

      const payload: Quiz = {
        id: quizId,
        title: editingQuiz.title.trim(),
        description: editingQuiz.description || "",
        eventId: editingQuiz.eventId || "",
        eventTitle: editingQuiz.eventTitle || "",
        track: editingQuiz.track || "General Track",
        durationMinutes: Number(editingQuiz.durationMinutes) || 30,
        totalMarks: Number(editingQuiz.totalMarks) || (editingQuiz.questions?.length ? editingQuiz.questions.length * 2 : 50),
        passingMarks: Number(editingQuiz.passingMarks) || 20,
        instructions: editingQuiz.instructions || [],
        status: editingQuiz.status || "active",
        questionsCount: editingQuiz.questions?.length || 0,
        questions: editingQuiz.questions || [],
        createdAt: editingQuiz.createdAt || Date.now(),
        updatedAt: Date.now()
      };

      await setDoc(doc(db, "quizzes", quizId), payload);

      setQuizzes((prev) => {
        const existingIdx = prev.findIndex((q) => q.id === quizId);
        if (existingIdx >= 0) {
          const next = [...prev];
          next[existingIdx] = payload;
          return next;
        }
        return [payload, ...prev];
      });

      setSelectedQuizId(quizId);
      setIsEditorMode(false);
      setEditingQuiz(null);
    } catch (err: any) {
      console.error("Error saving quiz:", err);
      alert("Failed to save quiz: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteQuiz = async (quizId: string) => {
    if (!confirm("Are you sure you want to delete this quiz? All related submissions and session data will also be permanently deleted.")) return;

    try {
      await deleteQuizCascading(quizId);
      setQuizzes((prev) => prev.filter((q) => q.id !== quizId));
      if (selectedQuizId === quizId) {
        const remaining = filteredQuizzes.filter((q) => q.id !== quizId);
        setSelectedQuizId(remaining[0]?.id || "");
      }
    } catch (err: any) {
      console.error("Error deleting quiz:", err);
      alert("Error deleting quiz: " + err.message);
    }
  };

  const handleStartQuiz = async (quiz: Quiz) => {
    if (!confirm(`Start "${quiz.title}"?\nThis will set the authoritative timer for ${quiz.durationMinutes} minutes from now and open the test to all participants.`)) return;
    
    try {
      const now = Date.now();
      const scheduledEndTime = now + (quiz.durationMinutes * 60 * 1000);
      
      await updateDoc(doc(db, "quizzes", quiz.id), {
        status: "active",
        scheduledStartTime: now,
        scheduledEndTime: scheduledEndTime,
        updatedAt: now
      });

      if (typeof window !== "undefined") {
        sessionStorage.removeItem(`quiz_cache_${quiz.id}`);
      }

      setQuizzes(prev => prev.map(q => 
        q.id === quiz.id ? { ...q, status: "active", scheduledStartTime: now, scheduledEndTime, updatedAt: now } : q
      ));
    } catch (err: any) {
      console.error("Failed to start quiz:", err);
      alert("Error starting quiz: " + err.message);
    }
  };

  const handleStopQuiz = async (quiz: Quiz) => {
    if (!confirm(`Are you sure you want to STOP "${quiz.title}" right now?\nParticipants will be forced to submit.`)) return;

    try {
      const now = Date.now();
      await updateDoc(doc(db, "quizzes", quiz.id), {
        status: "completed",
        scheduledEndTime: now, // Force immediate stop
        updatedAt: now
      });

      if (typeof window !== "undefined") {
        sessionStorage.removeItem(`quiz_cache_${quiz.id}`);
      }

      setQuizzes(prev => prev.map(q => 
        q.id === quiz.id ? { ...q, status: "completed", scheduledEndTime: now, updatedAt: now } : q
      ));
    } catch (err: any) {
      console.error("Failed to stop quiz:", err);
      alert("Error stopping quiz: " + err.message);
    }
  };

  // Reset a specific participant's attempt
  const handleResetParticipant = async (sub: QuizSubmission) => {
    if (!confirm(`Unlock and reset quiz attempt for ${sub.userName || sub.userEmail}?\n\nThis will remove their locked submission and allow them to retake the quiz.`)) return;

    try {
      await resetParticipantQuizSession(sub.quizId, sub.userId);
      setSubmissions(prev => prev.filter(s => s.id !== sub.id));
      setActiveSessions(prev => prev.filter(s => s.userId !== sub.userId));
      alert(`Quiz attempt for ${sub.userName || "participant"} has been reset successfully.`);
    } catch (err: any) {
      console.error("Failed to reset participant session:", err);
      alert("Error resetting participant: " + err.message);
    }
  };

  // Reset all submissions for selected quiz
  const handleResetAllSubmissions = async () => {
    if (!selectedQuizId) return;
    const targetQuiz = quizzes.find(q => q.id === selectedQuizId);
    if (!confirm(`WARNING: Are you sure you want to RESET ALL ${submissions.length} submissions for "${targetQuiz?.title || 'this quiz'}"?\n\nAll submission records and locks will be permanently cleared so participants can retake the quiz.`)) return;

    try {
      await resetAllQuizSubmissions(selectedQuizId);
      setSubmissions([]);
      setActiveSessions([]);
      alert("All submissions for this quiz have been cleared successfully.");
    } catch (err: any) {
      console.error("Failed to reset all submissions:", err);
      alert("Error resetting submissions: " + err.message);
    }
  };

  // Export Results to CSV
  const handleExportCSV = () => {
    if (submissions.length === 0) {
      alert("No submissions available to export.");
      return;
    }

    const headers = ["Submission ID", "Participant Name", "Email", "Team Name", "Answered", "Unanswered", "Time Spent (s)", "Submitted At"];
    const rows = submissions.map((s) => [
      s.id,
      `"${s.userName || "N/A"}"`,
      `"${s.userEmail || "N/A"}"`,
      `"${s.teamName || "Solo"}"`,
      s.answeredCount,
      s.unansweredCount,
      s.timeSpentSeconds,
      new Date(s.submittedAt).toISOString()
    ]);

    const csvContent = [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `quiz_${selectedQuizId}_submissions.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const inProgressSessions = activeSessions.filter((s) => s.status === "in_progress");

  const handleBackToEventAccess = () => {
    const targetEventId = eventIdParam || (quizzes.find(q => q.id === selectedQuizId)?.eventId) || "";
    const basePath = user?.role === "organizer" ? "/organizer/events" : "/faculty/events";
    if (targetEventId) {
      navigate(`${basePath}?accessEventId=${targetEventId}`);
    } else {
      navigate(basePath);
    }
  };

  // =========================================================================
  // RENDER FULL-PAGE QUIZ BUILDER / EDITOR VIEW (REDESIGNED)
  // =========================================================================
  if (isEditorMode && editingQuiz) {
    const questionsList = editingQuiz.questions || [];
    const currentQuestion = questionsList[currentQuestionIndex] || null;
    const totalQuestions = questionsList.length;

    // Helper functions for editor
    const handleAddCategory = () => {
      setShowCategoryModal(true);
      setNewCategoryName("");
    };

    const handleSaveCategory = () => {
      const trimmed = newCategoryName.trim();
      if (!trimmed) return;
      if (!customCategories.includes(trimmed)) {
        setCustomCategories([...customCategories, trimmed]);
      }
      setSelectedCategoryView(trimmed);
      setCurrentQuestionIndex(-1); // Switch to the empty category view
      setShowCategoryModal(false);
      setNewCategoryName("");
    };

    const updateCurrentQuestion = (updates: Partial<QuizQuestion>) => {
      if (!currentQuestion) return;
      const newQuestions = [...questionsList];
      newQuestions[currentQuestionIndex] = { ...currentQuestion, ...updates };
      setEditingQuiz({ ...editingQuiz, questions: newQuestions });
    };

    const updateOption = (optionId: string, text: string) => {
      if (!currentQuestion) return;
      const nextOptions = currentQuestion.options.map(opt => 
        opt.id === optionId ? { ...opt, text } : opt
      );
      updateCurrentQuestion({ options: nextOptions });
    };

    const addQuestion = () => {
      if (!selectedCategoryView || selectedCategoryView.trim() === "") {
        alert("Please create and select a Category from the right panel before adding a new question.");
        return;
      }

      const nextNum = totalQuestions + 1;
      const newQ: QuizQuestion = {
        id: `q_${Date.now()}_${nextNum}`,
        questionNumber: nextNum,
        text: "",
        points: 2,
        category: selectedCategoryView,
        options: [
          { id: "opt_a", text: "" },
          { id: "opt_b", text: "" },
          { id: "opt_c", text: "" },
          { id: "opt_d", text: "" }
        ],
        correctOptionId: ""
      };
      const newQuestions = [...questionsList, newQ];
      setEditingQuiz({
        ...editingQuiz,
        questions: newQuestions
      });
      setCurrentQuestionIndex(newQuestions.length - 1);
    };

    const deleteQuestion = (idx: number) => {
      if (confirm("Are you sure you want to delete this question?")) {
        const next = questionsList.filter((_, i) => i !== idx);
        setEditingQuiz({ ...editingQuiz, questions: next });
        if (currentQuestionIndex >= next.length) {
          setCurrentQuestionIndex(Math.max(0, next.length - 1));
        }
      }
    };

    return (
      <div className="min-h-screen bg-[#F4F7FC] flex flex-col font-sans text-slate-800 antialiased select-none pb-24">
        <SEO
          title={editingQuiz.id ? `Edit: ${editingQuiz.title || "Quiz"} - AI Verse` : "Create Assessment - AI Verse"}
            description="Full-page high-concurrency quiz builder and question manager."
          />

          {/* ================= TOP NAV BAR ================= */}
          <header className="h-16 px-4 sm:px-8 border-b border-slate-200/90 bg-white flex items-center justify-between sticky top-0 z-30 shadow-xs">
            {/* Left Brand & Quiz Info */}
            <div className="flex items-center gap-3 min-w-0">
              <button
                type="button"
                onClick={() => {
                  if (confirm("Discard unsaved changes and return to quiz list?")) {
                    setIsEditorMode(false);
                    setEditingQuiz(null);
                    setCurrentQuestionIndex(0);
                  }
                }}
                className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition-all cursor-pointer mr-2"
                title="Back to Quiz List"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
              <div className="min-w-0 hidden md:block">
                <h1 className="text-sm font-black text-[#0F172A] truncate tracking-tight">{editingQuiz.title || "Untitled Assessment"}</h1>
                <p className="text-[10px] text-blue-600 font-bold uppercase tracking-wider">
                  Admin Editor Mode
                </p>
              </div>
            </div>

            {/* Right: Save Button */}
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={handleSaveQuiz}
                disabled={saving || !editingQuiz.title?.trim()}
                className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold text-xs px-5 py-2.5 rounded-xl shadow-md shadow-blue-500/20 transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                <span>Save & Publish</span>
              </button>
            </div>
          </header>

          {/* ================= MAIN EDITOR GRID ================= */}
          <main className="max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 flex-1 grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            
            {/* ================= LEFT COLUMN: QUESTION EDITOR (8 COLS) ================= */}
            <div className="lg:col-span-8 space-y-5">
              
              {/* Question Card */}
              <div className="bg-white border border-slate-200/90 rounded-3xl p-6 sm:p-8 shadow-sm space-y-6">
                
                {/* Question Top Header */}
                <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <span className="bg-blue-50 text-blue-700 font-extrabold text-xs px-3 py-1 rounded-full border border-blue-200/70">
                      {currentQuestionIndex >= 0 ? `Question ${currentQuestionIndex + 1} of ${totalQuestions}` : "Question Editor"}
                    </span>
                  </div>

                  {currentQuestion && (
                    <button
                      onClick={() => deleteQuestion(currentQuestionIndex)}
                      className="flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-xl transition-all cursor-pointer bg-red-50 hover:bg-red-100 text-red-600 border border-red-200"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Delete Question</span>
                    </button>
                  )}
                </div>

                {!currentQuestion ? (
                  <div className="flex flex-col items-center justify-center py-24 text-center space-y-4">
                     <div className="w-16 h-16 bg-slate-50 border border-dashed border-slate-200 rounded-full flex items-center justify-center">
                        <AlertCircle className="w-6 h-6 text-slate-400" />
                     </div>
                     <div>
                       <h3 className="text-base font-extrabold text-[#0F172A]">No Question Selected</h3>
                       <p className="text-xs text-slate-500 font-medium mt-1">Please select a category from the right panel and click Add New Question.</p>
                     </div>
                  </div>
                ) : (
                  <>
                    {/* Question Text & Metadata */}
                    <div className="flex flex-col sm:flex-row gap-4">
                      <div className="flex-1 space-y-1.5">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Question Text</label>
                        <textarea
                          value={currentQuestion.text}
                          onChange={(e) => updateCurrentQuestion({ text: e.target.value })}
                          rows={2}
                          className="w-full text-base sm:text-lg font-bold text-[#0F172A] leading-relaxed p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="Enter your question here..."
                        />
                      </div>
                      
                      <div className="w-full sm:w-1/4 space-y-1.5">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Points</label>
                        <input
                          type="number"
                          value={currentQuestion.points || 2}
                          onChange={(e) => updateCurrentQuestion({ points: Number(e.target.value) })}
                          className="w-full text-xs font-bold text-[#0F172A] p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                    </div>

                    {/* Options List */}
                    <div className="pt-4 border-t border-slate-100">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-3">
                        OPTIONS & CORRECT ANSWER:
                      </span>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {currentQuestion.options.map((option, idx) => {
                        const isCorrect = currentQuestion.correctOptionId === option.id;
                        const optionLetters = ["A", "B", "C", "D", "E", "F"];
                        const letter = optionLetters[idx] || `${idx + 1}`;

                        return (
                          <div
                            key={option.id}
                            className={`w-full text-left p-3 rounded-2xl border transition-all flex items-center gap-4 ${
                              isCorrect
                                ? "bg-emerald-50/70 border-emerald-600 shadow-sm ring-1 ring-emerald-500/20"
                                : "bg-white border-slate-200 hover:border-slate-300"
                            }`}
                          >
                            {/* Correct Radio Button */}
                            <button
                              type="button"
                              onClick={() => updateCurrentQuestion({ correctOptionId: option.id })}
                              className={`w-8 h-8 rounded-full flex flex-shrink-0 items-center justify-center border-2 transition-colors cursor-pointer ${
                                isCorrect 
                                  ? "bg-emerald-500 border-emerald-600 text-white" 
                                  : "bg-white border-slate-300 text-transparent hover:border-emerald-400"
                              }`}
                              title="Mark as correct answer"
                            >
                              <Check className="w-5 h-5" />
                            </button>

                            {/* Option Letter Circle */}
                            <div className="w-8 h-8 rounded-xl bg-slate-100 text-slate-700 font-black text-xs flex flex-shrink-0 items-center justify-center">
                              {letter}
                            </div>

                            {/* Option Text Input */}
                            <input
                              type="text"
                              value={option.text}
                              onChange={(e) => updateOption(option.id, e.target.value)}
                              className={`flex-1 text-sm font-medium leading-relaxed bg-transparent outline-none ${
                                isCorrect ? "text-emerald-950 font-bold" : "text-slate-700"
                              }`}
                              placeholder={`Option ${letter} text...`}
                            />
                          </div>
                        );
                      })}
                      </div>
                    </div>
                  </>
                )}

                {/* Question Navigation Controls */}
                {selectedCategoryView && (() => {
                  const categoryItems = questionsList.map((q, idx) => ({ q, idx })).filter(item => item.q.category === selectedCategoryView);
                  const currentLocalIdx = categoryItems.findIndex(item => item.idx === currentQuestionIndex);
                  const hasPrev = currentLocalIdx > 0;
                  const hasNext = currentLocalIdx >= 0 && currentLocalIdx < categoryItems.length - 1;

                  return (
                    <div className="flex items-center justify-between pt-6 border-t border-slate-100 gap-3">
                      <div className="flex gap-2">
                        <button
                          onClick={() => hasPrev && setCurrentQuestionIndex(categoryItems[currentLocalIdx - 1].idx)}
                          disabled={!hasPrev}
                          className="bg-slate-100 hover:bg-slate-200 text-slate-700 disabled:opacity-30 disabled:cursor-not-allowed font-bold text-xs px-4 py-2.5 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer"
                        >
                          <ArrowLeft className="w-4 h-4" />
                          <span>Previous</span>
                        </button>

                        <button
                          onClick={() => hasNext && setCurrentQuestionIndex(categoryItems[currentLocalIdx + 1].idx)}
                          disabled={!hasNext}
                          className="bg-[#0F172A] hover:bg-slate-800 text-white disabled:opacity-30 disabled:cursor-not-allowed font-bold text-xs px-5 py-2.5 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer shadow-xs"
                        >
                          <span>Next</span>
                          <ArrowRight className="w-4 h-4" />
                        </button>
                      </div>

                      <button
                        onClick={addQuestion}
                        className="bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold text-xs px-4 py-2.5 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer border border-blue-200"
                      >
                        <Plus className="w-4 h-4" />
                        <span>Add New</span>
                      </button>
                    </div>
                  );
                })()}
              </div>
            </div>

          {/* ================= RIGHT COLUMN: PALETTE & SETTINGS (4 COLS) ================= */}
          <div className="lg:col-span-4 space-y-5">
            
            {/* Question Palette Card */}
            <div className="bg-white border border-slate-200/90 rounded-3xl p-6 shadow-sm space-y-5">
                <div className="space-y-1.5 pb-2">
                  <div className="flex items-center justify-between">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Category View</label>
                    <button
                      onClick={handleAddCategory}
                      className="p-1 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                      title="Add new category"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <select
                    value={selectedCategoryView}
                    onChange={(e) => {
                      const newCat = e.target.value;
                      setSelectedCategoryView(newCat);
                      if (newCat) {
                        const firstIdx = questionsList.findIndex(q => q.category === newCat);
                        setCurrentQuestionIndex(firstIdx !== -1 ? firstIdx : -1);
                      } else {
                        setCurrentQuestionIndex(-1);
                      }
                    }}
                    className="w-full text-xs font-bold text-[#0F172A] p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 appearance-none cursor-pointer"
                  >
                    <option value="">Select Category</option>
                    {customCategories.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>

              <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                <h3 className="text-sm font-extrabold text-[#0F172A] uppercase tracking-wider">
                  Question Grid
                </h3>
                <span className="text-xs font-bold text-slate-500">
                  {totalQuestions} Total
                </span>
              </div>

              {/* Question Buttons Matrix Grouped by Category */}
              <div className="max-h-[320px] overflow-y-auto p-1 space-y-4">
                {!selectedCategoryView ? (
                  <div className="text-center p-4 text-xs font-medium text-slate-400 border border-dashed border-slate-200 rounded-xl">
                    Select a category to view questions.
                  </div>
                ) : (() => {
                  const items = questionsList.map((q, idx) => ({ q, idx })).filter(item => item.q.category === selectedCategoryView);
                  if (items.length === 0) {
                     return <div className="text-center p-4 text-xs font-medium text-slate-400 border border-dashed border-slate-200 rounded-xl">No questions in this category yet.</div>;
                  }

                  return (
                    <div className="space-y-2">
                      <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center justify-between">
                        <span>{selectedCategoryView}</span>
                        <span className="text-slate-300">{items.length}</span>
                      </div>
                      <div className="grid grid-cols-5 gap-2">
                        {items.map((item, localIdx) => {
                          const { q, idx } = item;
                          const isCurrent = currentQuestionIndex === idx;
                          const hasValidAnswer = !!q.correctOptionId && q.options.some(opt => opt.id === q.correctOptionId && opt.text.trim().length > 0);
                          const hasText = q.text.trim().length > 0;
                          const hasCategory = !!q.category && q.category.trim().length > 0;
                          const isComplete = hasValidAnswer && hasText && hasCategory;

                          let btnStyle = isComplete ? "bg-slate-100 text-slate-600 hover:bg-slate-200" : "bg-red-50 text-red-500 border border-red-200 border-dashed";
                          
                          if (isCurrent) {
                            btnStyle = "bg-blue-600 text-white font-black shadow-xs ring-3 ring-blue-500 ring-offset-2";
                          }

                          return (
                            <button
                              key={q.id}
                              type="button"
                              onClick={() => setCurrentQuestionIndex(idx)}
                              className={`h-10 rounded-xl text-xs font-bold transition-all flex items-center justify-center relative cursor-pointer ${btnStyle}`}
                              title={!isComplete ? "Missing question text or correct answer" : ""}
                            >
                              <span>{localIdx + 1}</span>
                              {!isComplete && !isCurrent && (
                                <AlertCircle className="absolute -top-1.5 -right-1.5 w-3 h-3 text-red-500 bg-white rounded-full" />
                              )}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })()}

                {selectedCategoryView && (
                  <button
                    type="button"
                    onClick={addQuestion}
                    className="w-full h-10 mt-4 rounded-xl text-xs font-bold transition-all flex items-center justify-center cursor-pointer bg-slate-50 border-2 border-dashed border-slate-300 text-slate-400 hover:border-blue-400 hover:text-blue-500 hover:bg-blue-50"
                    title="Add Question"
                  >
                    <Plus className="w-4 h-4 mr-1.5" />
                    Add New Question
                  </button>
                )}
              </div>

              {/* Settings & Save Actions */}
              <div className="pt-4 border-t border-slate-100 space-y-3">
                <button
                  type="button"
                  onClick={() => setShowSettingsModal(true)}
                  className="w-full bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs py-3 rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer border border-slate-200"
                >
                  <FileText className="w-4 h-4" />
                  <span>Edit Quiz Settings</span>
                </button>
                
                <button
                  type="button"
                  onClick={handleSaveQuiz}
                  disabled={saving || !editingQuiz.title?.trim()}
                  className="w-full bg-[#0F172A] hover:bg-slate-800 text-white font-black text-sm py-3.5 rounded-2xl shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  <span>Save Assessment</span>
                </button>
                <p className="text-[11px] text-center text-slate-400 font-medium">
                  {editingQuiz.status === "draft" ? "Currently saved as Draft" : "Currently Active & Published"}
                </p>
              </div>
            </div>
          </div>
        </main>

        {/* ================= GLOBAL SETTINGS MODAL ================= */}
        {showSettingsModal && (
          <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white border border-slate-200 rounded-3xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6 sm:p-8 space-y-6 shadow-2xl">
              <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                <h3 className="text-xl font-extrabold text-[#0F172A] flex items-center gap-2">
                  <FileText className="w-5 h-5 text-blue-600" />
                  Assessment Settings
                </h3>
                <button
                  onClick={() => setShowSettingsModal(false)}
                  className="p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700 rounded-xl transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-5">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 flex items-center gap-1">
                    <span>Quiz Title</span>
                    <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={editingQuiz.title || ""}
                    onChange={(e) => setEditingQuiz({ ...editingQuiz, title: e.target.value })}
                    placeholder="e.g. AI Verse 2026 Core Technical Assessment"
                    className="w-full px-4 py-3 rounded-2xl border border-slate-200 text-slate-800 text-sm font-bold focus:ring-2 focus:ring-blue-500 outline-none transition-all shadow-2xs"
                  />
                </div>

                <div className="space-y-1.5 bg-blue-50/50 p-4 rounded-2xl border border-blue-100">
                  <label className="text-xs font-bold text-blue-950 flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-blue-600" />
                    <span>Associated Event</span>
                    <span className="text-[10px] text-blue-500 font-medium">(Links this quiz to an active event)</span>
                  </label>
                  <select
                    value={editingQuiz.eventId || ""}
                    onChange={(e) => {
                      const evId = e.target.value;
                      const selectedEv = events.find((ev) => ev.id === evId);
                      setEditingQuiz({
                        ...editingQuiz,
                        eventId: evId,
                        eventTitle: selectedEv ? selectedEv.title : "",
                        track: selectedEv?.category ? `${selectedEv.category} Track` : editingQuiz.track
                      });
                    }}
                    className="w-full px-4 py-2.5 rounded-xl border border-blue-200 bg-white text-slate-800 text-xs font-bold focus:ring-2 focus:ring-blue-500 outline-none cursor-pointer mt-2"
                  >
                    <option value="">-- Select an Event (Optional) --</option>
                    {events.map((ev) => (
                      <option key={ev.id} value={ev.id}>
                        {ev.title} {ev.category ? `(${ev.category})` : ""}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700">Description</label>
                  <textarea
                    value={editingQuiz.description || ""}
                    onChange={(e) => setEditingQuiz({ ...editingQuiz, description: e.target.value })}
                    rows={2}
                    className="w-full px-4 py-3 rounded-2xl border border-slate-200 text-slate-800 text-xs font-medium focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700">Duration (Minutes)</label>
                    <input
                      type="number"
                      min={1}
                      value={editingQuiz.durationMinutes || 30}
                      onChange={(e) => setEditingQuiz({ ...editingQuiz, durationMinutes: Number(e.target.value) })}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700">Status</label>
                    <select
                      value={editingQuiz.status || "active"}
                      onChange={(e) => setEditingQuiz({ ...editingQuiz, status: e.target.value as any })}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-bold cursor-pointer"
                    >
                      <option value="active">Active / Published</option>
                      <option value="draft">Draft (Hidden)</option>
                      <option value="completed">Completed / Closed</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="pt-6 border-t border-slate-100 flex justify-end">
                <button
                  onClick={() => setShowSettingsModal(false)}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs px-6 py-2.5 rounded-xl transition-all cursor-pointer"
                >
                  Done
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Add Category Modal */}
        {showCategoryModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
            <div className="bg-white rounded-3xl w-full max-w-sm shadow-xl overflow-hidden border border-slate-100">
              <div className="flex items-center justify-between p-5 border-b border-slate-100">
                <h3 className="font-extrabold text-[#0F172A] uppercase tracking-wider text-sm">Add Category</h3>
                <button
                  onClick={() => setShowCategoryModal(false)}
                  className="p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 rounded-full transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="p-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Category Name</label>
                  <input
                    type="text"
                    autoFocus
                    value={newCategoryName}
                    onChange={(e) => setNewCategoryName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleSaveCategory();
                    }}
                    className="w-full text-xs font-bold text-[#0F172A] p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g. Frontend Development"
                  />
                </div>
              </div>
              <div className="p-5 border-t border-slate-100 flex justify-end gap-3 bg-slate-50">
                <button
                  onClick={() => setShowCategoryModal(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-500 hover:bg-slate-200 rounded-xl transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveCategory}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs px-6 py-2 rounded-xl transition-all shadow-sm cursor-pointer"
                >
                  Save
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // =========================================================================
  // RENDER MAIN DASHBOARD QUIZ LIST / LIVE CONCURRENCY MONITOR VIEW
  // =========================================================================
  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900 font-sans pb-24">
      <SEO
        title="Quiz & Assessment Management - AI Verse"
        description="Faculty and organizer management portal for creating, editing, and monitoring high-concurrency quizzes."
      />

      {/* Top Standalone Header Bar */}
      <header className="bg-white border-b border-slate-200/80 sticky top-0 z-30 shadow-2xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              to={user?.role === "organizer" ? "/organizer/events" : "/faculty/events"}
              className="flex items-center gap-2.5 group"
            >
              <img src="/ai_verse.png" alt="AI Verse Logo" className="w-8 h-8 rounded-xl object-contain shrink-0 shadow-2xs" />
              <div className="leading-tight text-left">
                <span className="tracking-tight font-sans font-black block text-sm text-slate-900 group-hover:text-blue-600 transition-colors">AI Verse</span>
                <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider block">Assessment Infrastructure</span>
              </div>
            </Link>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200/80 text-xs font-bold shadow-2xs">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>Live Engine Online</span>
            </div>

            <div className="flex items-center gap-2.5 px-3 py-1.5 rounded-2xl bg-slate-50 border border-slate-200/80 text-slate-800 shadow-2xs">
              <div className="w-7 h-7 rounded-xl bg-blue-600 text-white font-black text-xs flex items-center justify-center shadow-xs">
                {user?.name ? user.name.slice(0, 2).toUpperCase() : "SA"}
              </div>
              <div className="text-left hidden sm:block">
                <div className="text-xs font-black text-slate-800 leading-none">{user?.name || "Super Admin"}</div>
                <div className="text-[9px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">{user?.displayRole || "Admin"}</div>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 space-y-6">
        {/* Header Area */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-[#0F172A] tracking-tight">
              Quiz & Assessment Infrastructure
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 font-medium mt-1">
              High-concurrency quiz engine supporting 200–500 simultaneous participants on Vercel + Firebase.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleBackToEventAccess}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 hover:border-slate-300 text-slate-700 font-bold text-xs shadow-2xs hover:shadow-xs transition-all cursor-pointer active:scale-95"
            >
              <ArrowLeft className="w-4 h-4 text-slate-500" />
              <span>Back to Event Access</span>
            </button>

            <button
              onClick={handleOpenCreateModal}
              className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold text-xs px-5 py-2.5 rounded-xl shadow-md shadow-blue-600/20 transition-all flex items-center gap-2 cursor-pointer active:scale-95"
            >
              <Plus className="w-4 h-4" />
              <span>Create New Quiz</span>
            </button>
          </div>
        </div>

        {/* Event Scoping / Selector Toolbar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white border border-slate-200/90 rounded-2xl p-4 shadow-2xs">
          <div className="flex items-center gap-3">
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-black text-xs ${activeEvent ? 'bg-purple-100 text-purple-700' : 'bg-blue-50 text-blue-600'}`}>
              <Calendar className="w-4 h-4" />
            </div>
            <div>
              <div className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
                {activeEvent ? "Event Scoped Quiz Workspace" : "All Events Workspace"}
              </div>
              <div className="text-sm font-black text-slate-800 flex items-center gap-2">
                <span>{activeEvent ? activeEvent.title : "Showing Quizzes for All Events"}</span>
                {activeEvent?.category && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-purple-50 text-purple-700 border border-purple-200">
                    {activeEvent.category}
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <label className="text-xs font-bold text-slate-500 whitespace-nowrap">Filter Event:</label>
            <select
              value={selectedEventFilter}
              onChange={(e) => {
                const newFilter = e.target.value;
                setSelectedEventFilter(newFilter);
                if (newFilter !== "all") {
                  setSearchParams({ eventId: newFilter });
                } else {
                  setSearchParams({});
                }
              }}
              className="px-3.5 py-2 rounded-xl border border-slate-200 bg-slate-50 text-slate-800 text-xs font-bold focus:ring-2 focus:ring-blue-500 outline-none cursor-pointer"
            >
              <option value="all">-- All Events ({quizzes.length} Total Quizzes) --</option>
              {events.map((ev) => {
                const count = quizzes.filter(q => q.eventId === ev.id || (q.eventTitle && q.eventTitle.toLowerCase().trim() === ev.title.toLowerCase().trim())).length;
                return (
                  <option key={ev.id} value={ev.id}>
                    {ev.title} ({count} {count === 1 ? "quiz" : "quizzes"})
                  </option>
                );
              })}
            </select>

            {selectedEventFilter !== "all" && (
              <button
                type="button"
                onClick={() => {
                  setSelectedEventFilter("all");
                  setSearchParams({});
                }}
                className="px-3 py-2 rounded-xl text-xs font-bold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 transition-colors cursor-pointer"
              >
                View All
              </button>
            )}
          </div>
        </div>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200/80 pb-3 overflow-x-auto">
        {[
          { id: "quizzes" as const, label: "Quiz Library", icon: FileText, count: filteredQuizzes.length },
          { id: "live_monitor" as const, label: "Live Concurrency Monitor", icon: Users, count: inProgressSessions.length },
          { id: "submissions" as const, label: "Submissions & Results", icon: Award, count: submissions.length }
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${activeTab === tab.id
                ? "bg-[#0F172A] text-white shadow-xs"
                : "text-slate-600 hover:bg-slate-100"
              }`}
          >
            <tab.icon className="w-4 h-4" />
            <span>{tab.label}</span>
            <span className={`px-2 py-0.5 rounded-full text-[10px] ${activeTab === tab.id ? "bg-blue-600 text-white" : "bg-slate-200 text-slate-700"
              }`}>
              {tab.count}
            </span>
          </button>
        ))}
      </div>

      {/* ================= TAB 1: QUIZ LIBRARY ================= */}
      {activeTab === "quizzes" && (
        <div className="space-y-6">
          {loading ? (
            <div className="p-12 text-center text-slate-400">
              <Loader2 className="w-8 h-8 text-blue-600 animate-spin mx-auto mb-2" />
              <p className="text-xs font-semibold">Loading quiz database...</p>
            </div>
          ) : filteredQuizzes.length === 0 ? (
            <div className="bg-white border border-slate-200 rounded-3xl p-12 text-center space-y-4">
              <HelpCircle className="w-12 h-12 text-slate-300 mx-auto" />
              <div>
                <h3 className="text-base font-extrabold text-[#0F172A]">
                  {activeEvent ? `No Quizzes Found for "${activeEvent.title}"` : "No Quizzes Created Yet"}
                </h3>
                <p className="text-xs text-slate-500 font-medium mt-1">
                  {activeEvent 
                    ? `Create an assessment specifically for ${activeEvent.title}.`
                    : "Create your first high-concurrency quiz to publish to participants."
                  }
                </p>
              </div>
              <button
                onClick={handleOpenCreateModal}
                className="bg-blue-600 text-white font-bold text-xs px-5 py-2.5 rounded-xl cursor-pointer"
              >
                Create Quiz for {activeEvent ? activeEvent.title : "Event"}
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredQuizzes.map((q) => (
                <div
                  key={q.id}
                  className="bg-white border border-slate-200/90 rounded-3xl p-6 shadow-sm hover:shadow-md transition-all flex flex-col justify-between space-y-5"
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className={`text-[10px] font-extrabold px-3 py-1 rounded-full uppercase tracking-wider ${q.status === "active"
                          ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                          : "bg-slate-100 text-slate-600"
                        }`}>
                        {q.status}
                      </span>
                      <span className="text-xs font-bold text-blue-600">{q.track || "General Track"}</span>
                    </div>

                    <h3 className="text-lg font-extrabold text-[#0F172A] leading-tight">{q.title}</h3>
                    {q.eventTitle && (
                      <p className="text-[11px] font-bold text-slate-400 flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5 text-blue-500" /> {q.eventTitle}
                      </p>
                    )}
                    <p className="text-xs text-slate-500 font-medium line-clamp-2">{q.description || "No description provided."}</p>
                  </div>

                  <div className="grid grid-cols-3 gap-2 bg-slate-50 p-3 rounded-2xl text-center text-xs border border-slate-100">
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 block uppercase">Duration</span>
                      <span className="font-extrabold text-[#0F172A]">{q.durationMinutes}m</span>
                    </div>
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 block uppercase">Questions</span>
                      <span className="font-extrabold text-[#0F172A]">{q.questions?.length || q.questionsCount || 0}</span>
                    </div>
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 block uppercase">Marks</span>
                      <span className="font-extrabold text-[#0F172A]">{q.totalMarks}</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => handleOpenEditModal(q)}
                        className="p-2 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-colors cursor-pointer"
                        title="Edit Quiz"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteQuiz(q.id)}
                        className="p-2 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors cursor-pointer"
                        title="Delete Quiz"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    {/* Start / Stop / Restart Quiz Button */}
                    <div className="flex items-center">
                      {(q.status === "active" || q.status === "draft" || q.status === "scheduled") && (!q.scheduledStartTime || q.scheduledEndTime! <= Date.now()) ? (
                        <button
                          onClick={() => handleStartQuiz(q)}
                          className="flex items-center gap-1.5 px-4 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold rounded-xl transition-colors cursor-pointer shadow-sm"
                        >
                          <Play className="w-3.5 h-3.5" />
                          Start Quiz
                        </button>
                      ) : q.status === "active" && q.scheduledStartTime && q.scheduledEndTime && q.scheduledEndTime > Date.now() ? (
                        <button
                          onClick={() => handleStopQuiz(q)}
                          className="flex items-center gap-1.5 px-4 py-1.5 bg-red-500 hover:bg-red-600 text-white text-xs font-bold rounded-xl transition-colors cursor-pointer shadow-sm"
                        >
                          <Square className="w-3.5 h-3.5" />
                          Stop Quiz
                        </button>
                      ) : q.status === "completed" ? (
                        <button
                          onClick={() => handleStartQuiz(q)}
                          className="flex items-center gap-1.5 px-4 py-1.5 bg-blue-500 hover:bg-blue-600 text-white text-xs font-bold rounded-xl transition-colors cursor-pointer shadow-sm"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                          Restart Quiz
                        </button>
                      ) : (
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-2">
                          Unavailable
                        </span>
                      )}
                    </div>

                    <a
                      href={`/participant/quiz/${q.id}/lobby`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-600 hover:text-blue-700 bg-blue-50 px-3 py-1.5 rounded-xl border border-blue-200/60"
                    >
                      <span>Preview Lobby</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ================= TAB 2: LIVE CONCURRENCY MONITOR ================= */}
      {activeTab === "live_monitor" && (
        <div className="space-y-6">

          {/* Quiz Selector Bar */}
          <div className="bg-white border border-slate-200 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-500">Monitoring Quiz:</span>
              <select
                value={selectedQuizId}
                onChange={(e) => setSelectedQuizId(e.target.value)}
                className="bg-slate-50 border border-slate-200 text-xs font-bold text-[#0F172A] px-3 py-1.5 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {filteredQuizzes.map((q) => (
                  <option key={q.id} value={q.id}>{q.title}</option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-4 text-xs">
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                <span className="font-extrabold text-[#0F172A]">{inProgressSessions.length} Active Writers</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
                <span className="font-extrabold text-[#0F172A]">{submissions.length} Submitted</span>
              </div>
            </div>
          </div>

          {/* Active Participants Table */}
          <div className="bg-white border border-slate-200/90 rounded-3xl p-6 shadow-sm space-y-4">
            <h3 className="text-base font-extrabold text-[#0F172A]">Real-Time Active Sessions</h3>

            {inProgressSessions.length === 0 ? (
              <div className="py-12 text-center text-slate-400 space-y-2">
                <Users className="w-10 h-10 mx-auto text-slate-300" />
                <p className="text-xs font-semibold">No participants currently writing this quiz.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-100 text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                      <th className="py-3 px-4">Participant</th>
                      <th className="py-3 px-4">Team</th>
                      <th className="py-3 px-4">Started At</th>
                      <th className="py-3 px-4">Last Autosave</th>
                      <th className="py-3 px-4">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                    {inProgressSessions.map((s) => (
                      <tr key={s.id} className="hover:bg-slate-50/50">
                        <td className="py-3.5 px-4 font-bold text-[#0F172A]">
                          <div>{s.userName}</div>
                          <div className="text-[10px] text-slate-400 font-normal">{s.userEmail}</div>
                        </td>
                        <td className="py-3.5 px-4">{s.teamName || "Solo"}</td>
                        <td className="py-3.5 px-4">{new Date(s.startTime).toLocaleTimeString()}</td>
                        <td className="py-3.5 px-4">
                          <span className="text-emerald-600 font-bold">
                            {Math.max(0, Math.floor((Date.now() - s.lastAutosavedAt) / 1000))}s ago
                          </span>
                        </td>
                        <td className="py-3.5 px-4">
                          <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 px-2.5 py-0.5 rounded-full font-bold text-[10px] flex items-center gap-1 w-max">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> Writing
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ================= TAB 3: SUBMISSIONS & RESULTS ================= */}
      {activeTab === "submissions" && (
        <div className="space-y-6">
          <div className="bg-white border border-slate-200 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-500">Quiz Submissions:</span>
              <select
                value={selectedQuizId}
                onChange={(e) => setSelectedQuizId(e.target.value)}
                className="bg-slate-50 border border-slate-200 text-xs font-bold text-[#0F172A] px-3 py-1.5 rounded-xl"
              >
                {filteredQuizzes.map((q) => (
                  <option key={q.id} value={q.id}>{q.title}</option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-2">
              {submissions.length > 0 && (
                <button
                  onClick={handleResetAllSubmissions}
                  className="bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 font-bold text-xs px-3.5 py-2 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer"
                  title="Clear all submissions for this quiz"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Clear All Submissions</span>
                </button>
              )}

              <button
                onClick={handleExportCSV}
                className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs px-4 py-2 rounded-xl transition-all flex items-center gap-2 cursor-pointer"
              >
                <Download className="w-4 h-4" />
                <span>Export CSV</span>
              </button>
            </div>
          </div>

          <div className="bg-white border border-slate-200/90 rounded-3xl p-6 shadow-sm space-y-4">
            <h3 className="text-base font-extrabold text-[#0F172A]">Finalized Submissions ({submissions.length})</h3>

            {submissions.length === 0 ? (
              <div className="py-12 text-center text-slate-400 space-y-2">
                <Award className="w-10 h-10 mx-auto text-slate-300" />
                <p className="text-xs font-semibold">No submissions recorded yet.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-100 text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                      <th className="py-3 px-4">Participant</th>
                      <th className="py-3 px-4">Team</th>
                      <th className="py-3 px-4">Answered</th>
                      <th className="py-3 px-4">Time Spent</th>
                      <th className="py-3 px-4">Submitted At</th>
                      <th className="py-3 px-4">Submission Lock</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                    {submissions.map((sub) => (
                      <tr key={sub.id} className="hover:bg-slate-50/50">
                        <td className="py-3.5 px-4 font-bold text-[#0F172A]">
                          <div>{sub.userName}</div>
                          <div className="text-[10px] text-slate-400 font-normal">{sub.userEmail}</div>
                        </td>
                        <td className="py-3.5 px-4">{sub.teamName || "Solo"}</td>
                        <td className="py-3.5 px-4 font-bold text-emerald-600">
                          {sub.answeredCount} / {sub.totalQuestions}
                        </td>
                        <td className="py-3.5 px-4">
                          {Math.floor(sub.timeSpentSeconds / 60)}m {sub.timeSpentSeconds % 60}s
                        </td>
                        <td className="py-3.5 px-4">{new Date(sub.submittedAt).toLocaleTimeString()}</td>
                        <td className="py-3.5 px-4">
                          <span className="bg-blue-50 text-blue-700 border border-blue-200 px-2.5 py-0.5 rounded-full font-bold text-[10px] flex items-center gap-1 w-max">
                            <CheckCircle2 className="w-3 h-3 text-blue-600" /> Immutable
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <button
                            onClick={() => handleResetParticipant(sub)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200 rounded-lg font-bold text-[11px] transition-colors cursor-pointer"
                            title="Reset locked submission to allow re-entry"
                          >
                            <RotateCcw className="w-3 h-3" />
                            <span>Unlock & Reset</span>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      </main>
    </div>
  );
};

export default QuizManagementPage;
