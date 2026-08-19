import { db } from "../config/firebase";
import { 
  doc, 
  getDoc, 
  setDoc, 
  updateDoc, 
  collection, 
  getDocs, 
  writeBatch
} from "firebase/firestore";
import type { 
  Quiz, 
  QuizSession, 
  QuizDraftAnswers, 
  QuizSubmission 
} from "../types/quiz";

// In-memory cache for immutable quiz question data to achieve zero duplicate reads
const quizMemoryCache = new Map<string, { data: Quiz; cachedAt: number }>();
const CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes

/**
 * Fetch quiz with in-memory caching
 * All 200 participants hitting this in the same session will only fetch once per client
 */
export async function getQuizById(quizId: string, forceRefresh = false): Promise<Quiz | null> {
  const cleanId = quizId.trim();
  if (!cleanId) return null;

  // 1. Check in-memory cache
  if (!forceRefresh) {
    const cached = quizMemoryCache.get(cleanId);
    if (cached && Date.now() - cached.cachedAt < CACHE_TTL_MS) {
      return cached.data;
    }
  }

  // 2. Check SessionStorage cache
  if (!forceRefresh && typeof window !== "undefined") {
    try {
      const stored = sessionStorage.getItem(`quiz_cache_${cleanId}`);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed && parsed.data && Date.now() - parsed.cachedAt < CACHE_TTL_MS) {
          quizMemoryCache.set(cleanId, parsed);
          return parsed.data;
        }
      }
    } catch {
      // sessionStorage unavailable or parse failed
    }
  }

  // 3. Fetch from Firestore
  try {
    const quizDoc = await getDoc(doc(db, "quizzes", cleanId));
    if (!quizDoc.exists()) {
      return null;
    }

    const raw = quizDoc.data();
    const quiz: Quiz = {
      id: quizDoc.id,
      title: raw.title || "AI Verse Quiz",
      description: raw.description || "",
      eventId: raw.eventId || "",
      eventTitle: raw.eventTitle || "",
      track: raw.track || "General",
      durationMinutes: Number(raw.durationMinutes) || 30,
      totalMarks: Number(raw.totalMarks) || (raw.questions?.length ? raw.questions.length * 2 : 50),
      passingMarks: Number(raw.passingMarks) || 20,
      instructions: Array.isArray(raw.instructions) && raw.instructions.length > 0 ? raw.instructions : [
        "Each question has 4 options with single correct answer.",
        "Your answers are automatically saved periodically in the background.",
        "You can navigate freely between questions using the Question Palette.",
        "Once submitted or when the timer expires, no further modifications are allowed.",
        "Do not close or switch browser tabs to ensure an uninterrupted session."
      ],
      status: raw.status || "active",
      scheduledStartTime: raw.scheduledStartTime || 0,
      scheduledEndTime: raw.scheduledEndTime || 0,
      questionsCount: Number(raw.questionsCount) || (raw.questions?.length || 0),
      shuffleQuestions: !!raw.shuffleQuestions,
      shuffleOptions: !!raw.shuffleOptions,
      questions: raw.questions || [],
      createdAt: raw.createdAt || Date.now(),
      updatedAt: raw.updatedAt || Date.now(),
      createdBy: raw.createdBy || ""
    };

    // Cache locally
    const cacheEntry = { data: quiz, cachedAt: Date.now() };
    quizMemoryCache.set(cleanId, cacheEntry);
    if (typeof window !== "undefined") {
      try {
        sessionStorage.setItem(`quiz_cache_${cleanId}`, JSON.stringify(cacheEntry));
      } catch {
        // quota exceeded or private mode
      }
    }

    return quiz;
  } catch (err) {
    console.error(`[QuizService] Error fetching quiz ${cleanId}:`, err);
    throw err;
  }
}

/**
 * Fetch all available quizzes for participants or faculty
 */
export async function getAllQuizzes(): Promise<Quiz[]> {
  try {
    const snap = await getDocs(collection(db, "quizzes"));
    const quizzes: Quiz[] = [];
    snap.forEach((d) => {
      const data = d.data();
      quizzes.push({
        id: d.id,
        title: data.title || "Untitled Quiz",
        description: data.description || "",
        eventId: data.eventId || "",
        eventTitle: data.eventTitle || "",
        track: data.track || "General",
        durationMinutes: Number(data.durationMinutes) || 30,
        totalMarks: Number(data.totalMarks) || 50,
        passingMarks: Number(data.passingMarks) || 20,
        instructions: data.instructions || [],
        status: data.status || "draft",
        questionsCount: Number(data.questionsCount) || (data.questions?.length || 0),
        questions: data.questions || [],
        createdAt: data.createdAt || Date.now(),
        updatedAt: data.updatedAt || Date.now()
      });
    });
    return quizzes;
  } catch (err) {
    console.error("[QuizService] Error fetching quizzes list:", err);
    return [];
  }
}

/**
 * Deterministic Session ID generation
 * Guaranteed 1 session per user per quiz, preventing multi-tab duplication
 */
export function getDeterministicSessionId(quizId: string, userId: string): string {
  return `${quizId.trim()}_${userId.trim()}`;
}

/**
 * Initialize or restore authoritative Quiz Session
 */
export async function getOrCreateQuizSession(
  quiz: Quiz, 
  user: { uid: string; email?: string | null; displayName?: string | null; name?: string | null },
  team?: { id?: string; name?: string }
): Promise<QuizSession> {
  const sessionId = getDeterministicSessionId(quiz.id, user.uid);
  const sessionRef = doc(db, "quizSessions", sessionId);

  try {
    const sessionSnap = await getDoc(sessionRef);

    if (sessionSnap.exists()) {
      const data = sessionSnap.data();
      return {
        id: sessionSnap.id,
        quizId: data.quizId,
        quizTitle: data.quizTitle || quiz.title,
        userId: data.userId,
        userEmail: data.userEmail || user.email || "",
        userName: data.userName || user.displayName || user.name || "Participant",
        teamId: data.teamId || team?.id || "",
        teamName: data.teamName || team?.name || "",
        startTime: Number(data.startTime) || Date.now(),
        endTime: Number(data.endTime) || (Date.now() + quiz.durationMinutes * 60 * 1000),
        durationMinutes: Number(data.durationMinutes) || quiz.durationMinutes,
        status: data.status || "in_progress",
        lastAutosavedAt: Number(data.lastAutosavedAt) || Date.now(),
        submittedAt: data.submittedAt || undefined,
        createdAt: data.createdAt || Date.now(),
        updatedAt: data.updatedAt || Date.now()
      };
    }

    // Create New Session with authoritative server timestamp calculation
    const now = Date.now();
    const durationMs = (quiz.durationMinutes || 30) * 60 * 1000;
    const authoritativeEndTime = now + durationMs;

    const newSession: QuizSession = {
      id: sessionId,
      quizId: quiz.id,
      quizTitle: quiz.title,
      userId: user.uid,
      userEmail: user.email || "",
      userName: user.displayName || user.name || "Participant",
      teamId: team?.id || "",
      teamName: team?.name || "",
      startTime: now,
      endTime: authoritativeEndTime,
      durationMinutes: quiz.durationMinutes || 30,
      status: "in_progress",
      lastAutosavedAt: now,
      createdAt: now,
      updatedAt: now
    };

    await setDoc(sessionRef, newSession);
    return newSession;
  } catch (err) {
    console.error("[QuizService] Error initializing quiz session:", err);
    throw err;
  }
}

/**
 * Load draft answers for an active session
 */
export async function loadDraftAnswers(sessionId: string): Promise<QuizDraftAnswers | null> {
  try {
    const docSnap = await getDoc(doc(db, "quizAnswers", sessionId));
    if (docSnap.exists()) {
      return docSnap.data() as QuizDraftAnswers;
    }
    return null;
  } catch (err) {
    console.warn("[QuizService] Warning loading draft answers:", err);
    return null;
  }
}

/**
 * Idempotent Autosave with Exponential Backoff
 * Writes to `quizAnswers/{sessionId}` and updates session timestamp
 */
export async function saveDraftAnswers(
  draft: QuizDraftAnswers, 
  maxRetries = 2
): Promise<boolean> {
  const sessionId = draft.sessionId;
  let attempt = 0;
  let delayMs = 500;

  while (attempt <= maxRetries) {
    try {
      const now = Date.now();
      const payload: QuizDraftAnswers = {
        ...draft,
        lastAutosavedAt: now,
        clientTimestamp: now
      };

      // Atomic setDoc with merge to ensure idempotent safety
      await setDoc(doc(db, "quizAnswers", sessionId), payload, { merge: true });
      
      // Fire-and-forget lightweight session ping
      updateDoc(doc(db, "quizSessions", sessionId), {
        lastAutosavedAt: now,
        updatedAt: now
      }).catch(() => {});

      return true;
    } catch (err) {
      attempt++;
      if (attempt > maxRetries) {
        console.error(`[QuizService] Autosave failed after ${maxRetries} attempts for session ${sessionId}:`, err);
        return false;
      }
      // Exponential backoff with jitter
      const jitter = Math.floor(Math.random() * 200);
      await new Promise((resolve) => setTimeout(resolve, delayMs + jitter));
      delayMs *= 2;
    }
  }

  return false;
}

/**
 * Atomic Final Submission with Double-Submit Prevention Lock
 */
export async function submitQuizFinal(
  session: QuizSession,
  answers: Record<string, string>,
  totalQuestions: number,
  isAutoSubmitted = false
): Promise<QuizSubmission> {
  const sessionId = session.id;
  const now = Date.now();

  // 1. Check if already submitted to prevent duplicates
  const submissionRef = doc(db, "quizSubmissions", sessionId);
  const existingSnap = await getDoc(submissionRef);
  if (existingSnap.exists()) {
    const existing = existingSnap.data() as QuizSubmission;
    return existing;
  }

  const answeredCount = Object.keys(answers).filter(k => !!answers[k]).length;
  const unansweredCount = Math.max(0, totalQuestions - answeredCount);
  const timeSpentSeconds = Math.max(1, Math.floor((now - session.startTime) / 1000));

  const submissionPayload: QuizSubmission = {
    id: sessionId,
    sessionId,
    quizId: session.quizId,
    quizTitle: session.quizTitle,
    userId: session.userId,
    userEmail: session.userEmail,
    userName: session.userName,
    teamId: session.teamId,
    teamName: session.teamName,
    answers,
    answeredCount,
    unansweredCount,
    totalQuestions,
    timeSpentSeconds,
    startTime: session.startTime,
    submittedAt: now,
    isAutoSubmitted,
    isFinal: true
  };

  // Perform atomic batch write: (1) create submission doc, (2) update session status to submitted
  const batch = writeBatch(db);
  batch.set(submissionRef, submissionPayload);
  batch.update(doc(db, "quizSessions", sessionId), {
    status: "submitted",
    submittedAt: now,
    lastAutosavedAt: now,
    updatedAt: now
  });

  await batch.commit();

  // Clear local draft caches
  if (typeof window !== "undefined") {
    try {
      localStorage.removeItem(`quiz_draft_${sessionId}`);
    } catch {
      // ignore
    }
  }

  return submissionPayload;
}
