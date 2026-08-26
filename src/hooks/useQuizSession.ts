import { useState, useEffect, useRef, useCallback } from "react";
import type { Quiz, QuizSession, QuizDraftAnswers, AutosaveStatus } from "../types/quiz";
import { saveDraftAnswers } from "../services/quizService";

interface UseQuizSessionProps {
  quiz: Quiz;
  session: QuizSession;
  initialAnswers?: Record<string, string>;
  initialFlags?: string[];
  initialQuestionIndex?: number;
}

export function useQuizSession({
  quiz,
  session,
  initialAnswers = {},
  initialFlags = [],
  initialQuestionIndex = 0
}: UseQuizSessionProps) {
  // Load any local storage cached answers for instantaneous restore
  const getInitialState = () => {
    let localAnswers = initialAnswers;
    let localFlags = initialFlags;
    let localIdx = initialQuestionIndex;
    let localViolations = session.violationsCount || 0;
    let localViolationLogs: import("../types/quiz").QuizViolationLog[] = session.violationLogs || [];

    if (typeof window !== "undefined") {
      try {
        const stored = localStorage.getItem(`quiz_draft_${session.id}`);
        if (stored) {
          const parsed = JSON.parse(stored);
          if (parsed) {
            if (parsed.answers) localAnswers = { ...initialAnswers, ...parsed.answers };
            if (parsed.flaggedQuestions) localFlags = parsed.flaggedQuestions;
            if (typeof parsed.currentQuestionIndex === "number") {
              localIdx = parsed.currentQuestionIndex;
            }
            if (typeof parsed.violationsCount === "number" && parsed.violationsCount > localViolations) {
              localViolations = parsed.violationsCount;
            }
            if (Array.isArray(parsed.violationLogs) && parsed.violationLogs.length > localViolationLogs.length) {
              localViolationLogs = parsed.violationLogs;
            }
          }
        }
      } catch {
        // ignore
      }
    }
    return { localAnswers, localFlags, localIdx, localViolations, localViolationLogs };
  };

  const { localAnswers, localFlags, localIdx, localViolations, localViolationLogs } = getInitialState();

  const [answers, setAnswers] = useState<Record<string, string>>(localAnswers);
  const [flaggedQuestions, setFlaggedQuestions] = useState<string[]>(localFlags);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState<number>(localIdx);
  const [violationsCount, setViolationsCount] = useState<number>(localViolations);
  const [violationLogs, setViolationLogs] = useState<import("../types/quiz").QuizViolationLog[]>(localViolationLogs);
  const [saveStatus, setSaveStatus] = useState<AutosaveStatus>("saved");
  const [lastSavedAt, setLastSavedAt] = useState<number>(session.lastAutosavedAt || Date.now());

  // Ref tracking dirty state so we only autosave when answers or flags change
  const isDirtyRef = useRef(false);
  const answersRef = useRef(answers);
  answersRef.current = answers;
  const flagsRef = useRef(flaggedQuestions);
  flagsRef.current = flaggedQuestions;
  const indexRef = useRef(currentQuestionIndex);
  indexRef.current = currentQuestionIndex;
  const violationsCountRef = useRef(violationsCount);
  violationsCountRef.current = violationsCount;
  const violationLogsRef = useRef(violationLogs);
  violationLogsRef.current = violationLogs;

  // Persist to local storage immediately on change (zero network cost, crash-proof)
  const syncLocalStorage = useCallback(() => {
    if (typeof window !== "undefined") {
      try {
        const draft: QuizDraftAnswers = {
          sessionId: session.id,
          quizId: quiz.id,
          userId: session.userId,
          answers: answersRef.current,
          flaggedQuestions: flagsRef.current,
          currentQuestionIndex: indexRef.current,
          violationsCount: violationsCountRef.current,
          violationLogs: violationLogsRef.current,
          lastAutosavedAt: Date.now(),
          clientTimestamp: Date.now()
        };
        localStorage.setItem(`quiz_draft_${session.id}`, JSON.stringify(draft));
      } catch {
        // quota exceeded or disabled
      }
    }
  }, [session.id, quiz.id, session.userId]);

  // Execute Firestore Autosave
  const performSave = useCallback(async (isCritical = false): Promise<boolean> => {
    if (!navigator.onLine) {
      setSaveStatus("offline");
      return false;
    }

    if (!isDirtyRef.current && !isCritical) {
      return true;
    }

    setSaveStatus("saving");
    try {
      const payload: QuizDraftAnswers = {
        sessionId: session.id,
        quizId: quiz.id,
        userId: session.userId,
        answers: answersRef.current,
        flaggedQuestions: flagsRef.current,
        currentQuestionIndex: indexRef.current,
        violationsCount: violationsCountRef.current,
        violationLogs: violationLogsRef.current,
        lastAutosavedAt: Date.now(),
        clientTimestamp: Date.now()
      };

      const success = await saveDraftAnswers(payload, 2);
      if (success) {
        isDirtyRef.current = false;
        setSaveStatus("saved");
        setLastSavedAt(Date.now());
        return true;
      } else {
        setSaveStatus("retrying");
        return false;
      }
    } catch {
      setSaveStatus("error");
      return false;
    }
  }, [session.id, quiz.id, session.userId]);

  // Log Proctoring Violation
  const logViolation = useCallback((type: import("../types/quiz").QuizViolationLog["type"], message: string) => {
    const newLog: import("../types/quiz").QuizViolationLog = {
      type,
      message,
      timestamp: Date.now()
    };

    setViolationsCount(prev => {
      const nextCount = prev + 1;
      violationsCountRef.current = nextCount;
      return nextCount;
    });

    setViolationLogs(prev => {
      const nextLogs = [...prev, newLog];
      violationLogsRef.current = nextLogs;
      isDirtyRef.current = true;
      syncLocalStorage();
      return nextLogs;
    });

    // Asynchronously flush violation to server immediately
    setTimeout(() => {
      performSave(true);
    }, 100);

    return violationsCountRef.current;
  }, [performSave, syncLocalStorage]);

  // Option selection handler (Instant UI, mark dirty, sync local backup)
  const selectOption = useCallback((questionId: string, optionId: string) => {
    setAnswers((prev) => {
      const next = { ...prev, [questionId]: optionId };
      answersRef.current = next;
      isDirtyRef.current = true;
      syncLocalStorage();
      return next;
    });
  }, [syncLocalStorage]);

  // Clear answer
  const clearOption = useCallback((questionId: string) => {
    setAnswers((prev) => {
      const next = { ...prev };
      delete next[questionId];
      answersRef.current = next;
      isDirtyRef.current = true;
      syncLocalStorage();
      return next;
    });
  }, [syncLocalStorage]);

  // Toggle flag for review
  const toggleFlag = useCallback((questionId: string) => {
    setFlaggedQuestions((prev) => {
      const next = prev.includes(questionId)
        ? prev.filter((id) => id !== questionId)
        : [...prev, questionId];
      flagsRef.current = next;
      isDirtyRef.current = true;
      syncLocalStorage();
      return next;
    });
  }, [syncLocalStorage]);

  // Navigate question
  const goToQuestion = useCallback((index: number) => {
    const total = quiz.questions?.length || 0;
    if (index >= 0 && index < total) {
      setCurrentQuestionIndex(index);
      indexRef.current = index;
      syncLocalStorage();
    }
  }, [quiz.questions?.length, syncLocalStorage]);

  // Periodic Autosave Interval (Every 35 seconds to smooth out traffic spikes)
  useEffect(() => {
    const intervalId = setInterval(() => {
      if (isDirtyRef.current) {
        performSave();
      }
    }, 35000);

    return () => clearInterval(intervalId);
  }, [performSave]);

  // Online / Offline Listeners
  useEffect(() => {
    const handleOnline = () => {
      if (isDirtyRef.current) {
        performSave(true);
      } else {
        setSaveStatus("saved");
      }
    };
    const handleOffline = () => {
      setSaveStatus("offline");
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    // Save on beforeunload
    const handleBeforeUnload = () => {
      if (isDirtyRef.current) {
        // LocalStorage is synchronous and guaranteed to succeed
        syncLocalStorage();
      }
    };
    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [performSave, syncLocalStorage]);

  return {
    answers,
    flaggedQuestions,
    currentQuestionIndex,
    violationsCount,
    violationLogs,
    saveStatus,
    lastSavedAt,
    selectOption,
    clearOption,
    toggleFlag,
    goToQuestion,
    logViolation,
    forceSave: () => performSave(true)
  };
}
