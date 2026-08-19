import React, { useState, useEffect } from "react";
import { useNavigate, Link, useSearchParams } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { db } from "../../config/firebase";
import {
  collection,
  getDocs,
  doc,
  setDoc,
  deleteDoc,
  onSnapshot,
  query,
  where
} from "firebase/firestore";
import type { Quiz, QuizQuestion, QuizSubmission, QuizSession } from "../../types/quiz";
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
  Code
} from "lucide-react";

interface EventOption {
  id: string;
  title: string;
  category?: string;
}

export const QuizManagementPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const eventIdParam = searchParams.get("eventId") || searchParams.get("accessEventId");
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [events, setEvents] = useState<EventOption[]>([]);
  const [submissions, setSubmissions] = useState<QuizSubmission[]>([]);
  const [activeSessions, setActiveSessions] = useState<QuizSession[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedQuizId, setSelectedQuizId] = useState<string>("");

  // View state: "list" or "editor" (Full-page editor mode)
  const [isEditorMode, setIsEditorMode] = useState<boolean>(false);
  const [editingQuiz, setEditingQuiz] = useState<Partial<Quiz> | null>(null);
  const [saving, setSaving] = useState<boolean>(false);

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
        if (qList.length > 0 && !selectedQuizId) {
          setSelectedQuizId(qList[0].id);
        }

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
    if (!selectedQuizId) return;

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
    setEditingQuiz({
      title: "",
      description: "",
      eventId: events.length > 0 ? events[0].id : "",
      eventTitle: events.length > 0 ? events[0].title : "",
      track: "General Track",
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
      questions: [
        {
          id: `q_${Date.now()}_1`,
          questionNumber: 1,
          text: "What is the primary benefit of batching client writes during high concurrency?",
          category: "Architecture",
          points: 2,
          options: [
            { id: "opt_a", text: "Decreases network write contention on Firestore" },
            { id: "opt_b", text: "Increases bundle size" },
            { id: "opt_c", text: "Requires a dedicated Redis server" },
            { id: "opt_d", text: "Forces browser reloads" }
          ],
          correctOptionId: "opt_a"
        },
        {
          id: `q_${Date.now()}_2`,
          questionNumber: 2,
          text: "Why should quiz examination timers be anchored to server-authoritative timestamps?",
          category: "Security",
          points: 2,
          options: [
            { id: "opt_a", text: "To prevent participant client clock tampering and browser drift" },
            { id: "opt_b", text: "To make the clock tick faster" },
            { id: "opt_c", text: "To disable offline caching" },
            { id: "opt_d", text: "Because JavaScript cannot measure seconds" }
          ],
          correctOptionId: "opt_a"
        }
      ]
    });
    setIsEditorMode(true);
  };

  // Open Full-Page Edit Mode
  const handleOpenEditModal = (quiz: Quiz) => {
    setEditingQuiz(JSON.parse(JSON.stringify(quiz)));
    setIsEditorMode(true);
  };

  // Save Quiz to Firestore
  const handleSaveQuiz = async () => {
    if (!editingQuiz || !editingQuiz.title?.trim() || saving) return;

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
    if (!confirm("Are you sure you want to delete this quiz? This action cannot be undone.")) return;

    try {
      await deleteDoc(doc(db, "quizzes", quizId));
      setQuizzes((prev) => prev.filter((q) => q.id !== quizId));
      if (selectedQuizId === quizId) {
        setSelectedQuizId(quizzes.find((q) => q.id !== quizId)?.id || "");
      }
    } catch (err: any) {
      console.error("Error deleting quiz:", err);
      alert("Error deleting quiz: " + err.message);
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
  // RENDER FULL-PAGE QUIZ BUILDER / EDITOR VIEW
  // =========================================================================
  if (isEditorMode && editingQuiz) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] text-slate-900 font-sans pb-24">
        <SEO
          title={editingQuiz.id ? `Edit: ${editingQuiz.title || "Quiz"} - AI Verse` : "Create Assessment - AI Verse"}
          description="Full-page high-concurrency quiz builder and question manager."
        />

        {/* Top Sticky Header */}
        <div className="bg-white border-b border-slate-200/80 sticky top-0 z-30 shadow-2xs">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => {
                  if (confirm("Discard unsaved changes and return to quiz list?")) {
                    setIsEditorMode(false);
                    setEditingQuiz(null);
                  }
                }}
                className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition-all cursor-pointer"
                title="Back to Quiz List"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
              <div>
                <h1 className="text-base sm:text-lg font-black text-[#0F172A] tracking-tight">
                  {editingQuiz.id ? "Edit Assessment" : "Create Assessment"}
                </h1>
                <p className="text-[11px] text-slate-500 font-medium hidden sm:block">
                  High-concurrency quiz builder with auto-grading.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => {
                  if (confirm("Discard unsaved changes?")) {
                    setIsEditorMode(false);
                    setEditingQuiz(null);
                  }
                }}
                className="px-4 py-2 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 font-bold text-xs cursor-pointer transition-all"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveQuiz}
                disabled={saving || !editingQuiz.title?.trim()}
                className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold text-xs px-5 py-2 rounded-xl shadow-md shadow-blue-600/25 transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                <span>Save Assessment</span>
              </button>
            </div>
          </div>
        </div>

        <div className="space-y-6 pt-8 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Section 1: Basic Information & Event Linking */}
        <div className="bg-white border border-slate-200/90 rounded-3xl p-6 sm:p-8 shadow-sm space-y-6">
          <div className="flex items-center gap-2.5 pb-4 border-b border-slate-100">
            <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
              <FileText className="w-4 h-4" />
            </div>
            <h2 className="text-base font-extrabold text-[#0F172A]">Assessment Overview & Event Association</h2>
          </div>

          <div className="space-y-5">
            {/* 1. Quiz Title */}
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

            {/* 2. Associated Event Selector (Directly Below Quiz Title) */}
            <div className="space-y-1.5 bg-blue-50/50 p-4 rounded-2xl border border-blue-100">
              <label className="text-xs font-bold text-blue-950 flex items-center gap-2">
                <Calendar className="w-4 h-4 text-blue-600" />
                <span>Associated Event</span>
                <span className="text-[10px] text-blue-500 font-medium">(Links this quiz to an active event in the system)</span>
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
                className="w-full px-4 py-2.5 rounded-xl border border-blue-200 bg-white text-slate-800 text-xs font-bold focus:ring-2 focus:ring-blue-500 outline-none cursor-pointer"
              >
                <option value="">-- Select an Event (Optional / Standalone Quiz) --</option>
                {events.map((ev) => (
                  <option key={ev.id} value={ev.id}>
                    {ev.title} {ev.category ? `(${ev.category})` : ""}
                  </option>
                ))}
              </select>
              {editingQuiz.eventTitle && (
                <p className="text-[11px] text-blue-600 font-semibold mt-1">
                  Selected Event: <strong>{editingQuiz.eventTitle}</strong>
                </p>
              )}
            </div>

            {/* 3. Description */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">Description</label>
              <textarea
                value={editingQuiz.description || ""}
                onChange={(e) => setEditingQuiz({ ...editingQuiz, description: e.target.value })}
                placeholder="Provide a comprehensive summary or overview for this assessment..."
                rows={3}
                className="w-full px-4 py-3 rounded-2xl border border-slate-200 text-slate-800 text-xs font-medium focus:ring-2 focus:ring-blue-500 outline-none transition-all shadow-2xs"
              />
            </div>

            {/* 4. Grid of Parameters */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">Track Name</label>
                <input
                  type="text"
                  value={editingQuiz.track || "General Track"}
                  onChange={(e) => setEditingQuiz({ ...editingQuiz, track: e.target.value })}
                  placeholder="e.g. AI / ML Track"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-800"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">Duration (Minutes)</label>
                <input
                  type="number"
                  min={1}
                  value={editingQuiz.durationMinutes || 30}
                  onChange={(e) => setEditingQuiz({ ...editingQuiz, durationMinutes: Number(e.target.value) })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-800"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">Total Marks</label>
                <input
                  type="number"
                  min={1}
                  value={editingQuiz.totalMarks || (editingQuiz.questions?.length ? editingQuiz.questions.length * 2 : 50)}
                  onChange={(e) => setEditingQuiz({ ...editingQuiz, totalMarks: Number(e.target.value) })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-800"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">Status</label>
                <select
                  value={editingQuiz.status || "active"}
                  onChange={(e) => setEditingQuiz({ ...editingQuiz, status: e.target.value as any })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-800 bg-white cursor-pointer"
                >
                  <option value="active">Active / Published</option>
                  <option value="draft">Draft (Hidden)</option>
                  <option value="completed">Completed / Closed</option>
                </select>
              </div>
            </div>

            {/* 5. Instructions List */}
            <div className="space-y-2 pt-2">
              <label className="text-xs font-bold text-slate-700 block">Examination Instructions</label>
              <div className="space-y-2">
                {editingQuiz.instructions?.map((inst, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <input
                      type="text"
                      value={inst}
                      onChange={(e) => {
                        const next = [...(editingQuiz.instructions || [])];
                        next[idx] = e.target.value;
                        setEditingQuiz({ ...editingQuiz, instructions: next });
                      }}
                      className="flex-1 px-3.5 py-2 rounded-xl border border-slate-200 text-xs font-medium text-slate-700"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        const next = (editingQuiz.instructions || []).filter((_, i) => i !== idx);
                        setEditingQuiz({ ...editingQuiz, instructions: next });
                      }}
                      className="p-2 text-slate-400 hover:text-red-500 rounded-lg cursor-pointer"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() => {
                    setEditingQuiz({
                      ...editingQuiz,
                      instructions: [...(editingQuiz.instructions || []), "New exam guideline..."]
                    });
                  }}
                  className="text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1 cursor-pointer pt-1"
                >
                  <Plus className="w-3.5 h-3.5" /> Add Instruction Line
                </button>
              </div>
            </div>

          </div>
        </div>

        {/* Section 2: Full-Page Questions Builder */}
        <div className="bg-white border border-slate-200/90 rounded-3xl p-6 sm:p-8 shadow-sm space-y-6">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
                <HelpCircle className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-base font-extrabold text-[#0F172A]">
                  Questions Matrix ({editingQuiz.questions?.length || 0})
                </h2>
                <p className="text-xs text-slate-400 font-medium">Add, reorder, and configure options and answer keys.</p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                const nextNum = (editingQuiz.questions?.length || 0) + 1;
                const newQ: QuizQuestion = {
                  id: `q_${Date.now()}_${nextNum}`,
                  questionNumber: nextNum,
                  text: `Question ${nextNum} text goes here...`,
                  points: 2,
                  category: "Core",
                  options: [
                    { id: "opt_a", text: "Option A text" },
                    { id: "opt_b", text: "Option B text" },
                    { id: "opt_c", text: "Option C text" },
                    { id: "opt_d", text: "Option D text" }
                  ],
                  correctOptionId: "opt_a"
                };
                setEditingQuiz({
                  ...editingQuiz,
                  questions: [...(editingQuiz.questions || []), newQ]
                });
              }}
              className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-4 py-2.5 rounded-xl cursor-pointer flex items-center gap-1.5 text-xs shadow-sm transition-all"
            >
              <Plus className="w-4 h-4" />
              <span>Add New Question</span>
            </button>
          </div>

          {/* Questions List */}
          <div className="space-y-6">
            {editingQuiz.questions?.map((q, qIdx) => (
              <div
                key={q.id}
                className="p-6 bg-slate-50/70 border border-slate-200/90 rounded-3xl space-y-4 shadow-2xs hover:border-blue-300 transition-all"
              >
                {/* Question Header */}
                <div className="flex items-center justify-between pb-2 border-b border-slate-200/60">
                  <div className="flex items-center gap-3">
                    <span className="w-8 h-8 rounded-xl bg-blue-600 text-white font-black text-xs flex items-center justify-center shadow-xs">
                      {qIdx + 1}
                    </span>
                    <span className="text-sm font-extrabold text-[#0F172A]">Question {qIdx + 1}</span>
                  </div>

                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => {
                        const updated = (editingQuiz.questions || []).filter((_, i) => i !== qIdx);
                        setEditingQuiz({ ...editingQuiz, questions: updated });
                      }}
                      className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg cursor-pointer transition-colors"
                      title="Delete question"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Question Text */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700">Question Text</label>
                  <textarea
                    value={q.text}
                    onChange={(e) => {
                      const updated = [...(editingQuiz.questions || [])];
                      updated[qIdx].text = e.target.value;
                      setEditingQuiz({ ...editingQuiz, questions: updated });
                    }}
                    rows={2}
                    className="w-full px-4 py-2.5 bg-white rounded-2xl border border-slate-200 text-xs font-medium text-slate-800 outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter question statement..."
                  />
                </div>

                {/* Optional Code Snippet */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                      <Code className="w-3.5 h-3.5 text-slate-500" />
                      <span>Code Snippet (Optional)</span>
                    </label>
                    <input
                      type="text"
                      value={q.codeLanguage || ""}
                      onChange={(e) => {
                        const updated = [...(editingQuiz.questions || [])];
                        updated[qIdx].codeLanguage = e.target.value;
                        setEditingQuiz({ ...editingQuiz, questions: updated });
                      }}
                      placeholder="Language (e.g. python, javascript)"
                      className="text-[11px] px-2 py-0.5 rounded border border-slate-200 bg-white"
                    />
                  </div>
                  <textarea
                    value={q.codeSnippet || ""}
                    onChange={(e) => {
                      const updated = [...(editingQuiz.questions || [])];
                      updated[qIdx].codeSnippet = e.target.value;
                      setEditingQuiz({ ...editingQuiz, questions: updated });
                    }}
                    rows={2}
                    className="w-full font-mono text-xs px-3 py-2 bg-[#0B132B] text-blue-200 rounded-xl border border-slate-800"
                    placeholder="Paste code snippet here if applicable..."
                  />
                </div>

                {/* Options 2x2 Grid */}
                <div className="space-y-2 pt-1">
                  <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                    Options & Answer Key (Select the radio button for the correct answer):
                  </label>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {q.options.map((opt, optIdx) => {
                      const isCorrect = q.correctOptionId === opt.id;
                      const letters = ["A", "B", "C", "D", "E", "F"];
                      const letter = letters[optIdx] || `${optIdx + 1}`;

                      return (
                        <div
                          key={opt.id}
                          className={`flex items-center gap-3 p-3 rounded-2xl border transition-all ${isCorrect
                              ? "bg-emerald-50/70 border-emerald-400 ring-2 ring-emerald-500/20"
                              : "bg-white border-slate-200"
                            }`}
                        >
                          <label className="flex items-center gap-2 cursor-pointer shrink-0">
                            <input
                              type="radio"
                              name={`correct_${q.id}`}
                              checked={isCorrect}
                              onChange={() => {
                                const updated = [...(editingQuiz.questions || [])];
                                updated[qIdx].correctOptionId = opt.id;
                                setEditingQuiz({ ...editingQuiz, questions: updated });
                              }}
                              className="w-4 h-4 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                            />
                            <span className={`w-6 h-6 rounded-lg text-xs font-black flex items-center justify-center ${isCorrect ? "bg-emerald-600 text-white" : "bg-slate-100 text-slate-600"
                              }`}>
                              {letter}
                            </span>
                          </label>

                          <input
                            type="text"
                            value={opt.text}
                            onChange={(e) => {
                              const updated = [...(editingQuiz.questions || [])];
                              updated[qIdx].options[optIdx].text = e.target.value;
                              setEditingQuiz({ ...editingQuiz, questions: updated });
                            }}
                            placeholder={`Option ${letter} text`}
                            className="w-full text-xs font-medium outline-none bg-transparent"
                          />
                        </div>
                      );
                    })}
                  </div>
                </div>

              </div>
            ))}
          </div>

          {/* Bottom Add Question Button */}
          <div className="pt-4 text-center">
            <button
              type="button"
              onClick={() => {
                const nextNum = (editingQuiz.questions?.length || 0) + 1;
                const newQ: QuizQuestion = {
                  id: `q_${Date.now()}_${nextNum}`,
                  questionNumber: nextNum,
                  text: `Question ${nextNum} text goes here...`,
                  points: 2,
                  category: "Core",
                  options: [
                    { id: "opt_a", text: "Option A" },
                    { id: "opt_b", text: "Option B" },
                    { id: "opt_c", text: "Option C" },
                    { id: "opt_d", text: "Option D" }
                  ],
                  correctOptionId: "opt_a"
                };
                setEditingQuiz({
                  ...editingQuiz,
                  questions: [...(editingQuiz.questions || []), newQ]
                });
              }}
              className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs px-6 py-3 rounded-2xl transition-all cursor-pointer inline-flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              <span>Add Another Question</span>
            </button>
          </div>
        </div>

        {/* Sticky Bottom Actions Bar */}
        <div className="flex items-center justify-between bg-white p-5 rounded-3xl border border-slate-200/90 shadow-sm">
          <button
            type="button"
            onClick={() => {
              if (confirm("Discard unsaved changes?")) {
                setIsEditorMode(false);
                setEditingQuiz(null);
              }
            }}
            className="px-6 py-2.5 rounded-xl border border-slate-200 text-slate-700 font-bold text-xs cursor-pointer hover:bg-slate-50"
          >
            Back to Quiz Overview
          </button>

          <button
            type="button"
            onClick={handleSaveQuiz}
            disabled={saving || !editingQuiz.title?.trim()}
            className="bg-[#0F172A] hover:bg-slate-800 text-white font-bold text-xs px-8 py-3 rounded-xl shadow-md transition-all cursor-pointer flex items-center gap-2"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            <span>Save & Publish Assessment</span>
          </button>
          </div>
        </div>

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

      {/* Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200/80 pb-3 overflow-x-auto">
        {[
          { id: "quizzes" as const, label: "Quiz Library", icon: FileText, count: quizzes.length },
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
          ) : quizzes.length === 0 ? (
            <div className="bg-white border border-slate-200 rounded-3xl p-12 text-center space-y-4">
              <HelpCircle className="w-12 h-12 text-slate-300 mx-auto" />
              <div>
                <h3 className="text-base font-extrabold text-[#0F172A]">No Quizzes Created Yet</h3>
                <p className="text-xs text-slate-500 font-medium mt-1">Create your first high-concurrency quiz to publish to participants.</p>
              </div>
              <button
                onClick={handleOpenCreateModal}
                className="bg-blue-600 text-white font-bold text-xs px-5 py-2.5 rounded-xl cursor-pointer"
              >
                Create First Quiz
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {quizzes.map((q) => (
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
                {quizzes.map((q) => (
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
                {quizzes.map((q) => (
                  <option key={q.id} value={q.id}>{q.title}</option>
                ))}
              </select>
            </div>

            <button
              onClick={handleExportCSV}
              className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs px-4 py-2 rounded-xl transition-all flex items-center gap-2 cursor-pointer"
            >
              <Download className="w-4 h-4" />
              <span>Export CSV</span>
            </button>
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
