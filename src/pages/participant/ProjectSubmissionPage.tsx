import React, { useState, useEffect, useRef } from "react";
import { 
  FileText, 
  FileUp, 
  Video, 
  Code, 
  Globe, 
  PlayCircle, 
  Check, 
  ArrowRight, 
  ArrowLeft,
  Loader2,
  CheckCircle2,
  Sparkles,
  ShieldCheck
} from "lucide-react";
import { db } from "../../config/firebase";
import { doc, updateDoc, getDoc, collection, getDocs, onSnapshot } from "firebase/firestore";

interface ProjectSubmissionPageProps {
  targetRegId?: string;
  initialData?: any;
  onSuccess?: () => void;
  embedded?: boolean;
}

export const ProjectSubmissionPage: React.FC<ProjectSubmissionPageProps> = ({
  targetRegId,
  initialData,
  onSuccess,
  embedded = false
}) => {
  // Stepper State (1 to 4)
  const [currentStep, setCurrentStep] = useState<number>(1);

  // Textarea Refs for Auto-Expansion (Full Card View, No Scrolling Box)
  const problemStatementRef = useRef<HTMLTextAreaElement>(null);
  const keyFeaturesRef = useRef<HTMLTextAreaElement>(null);

  // Form State
  const [problemStatement, setProblemStatement] = useState("");
  const [keyFeatures, setKeyFeatures] = useState("");
  const [githubUrl, setGithubUrl] = useState("");
  const [prototypeUrl, setPrototypeUrl] = useState("");
  const [demoVideoUrl, setDemoVideoUrl] = useState("");

  // Document Upload File States
  const [srsFileName, setSrsFileName] = useState("");
  const [presentationFileName, setPresentationFileName] = useState("");

  // Status & Submit States
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [statusNotice, setStatusNotice] = useState<{ type: "success" | "error"; message: string } | null>(null);

  // Problem Statements List, Selected, Saved & Lock State
  const [availableProblemStatements, setAvailableProblemStatements] = useState<any[]>([]);
  const [selectedPsId, setSelectedPsId] = useState<string>("");
  const [takenPsMap, setTakenPsMap] = useState<Record<string, string>>({});
  const [isPsSaved, setIsPsSaved] = useState<boolean>(false);
  const [savingPs, setSavingPs] = useState<boolean>(false);
  const [isPsLocked, setIsPsLocked] = useState<boolean>(false);

  // Real-time listener for registrations to track problem statements claimed by other teams
  useEffect(() => {
    const unsubscribe = onSnapshot(
      collection(db, "registrations"),
      (snapshot) => {
        const takenMap: Record<string, string> = {};
        snapshot.docs.forEach((docSnap) => {
          const reg = docSnap.data();
          const regId = docSnap.id;
          
          // Exclude current team's registration
          if (targetRegId && regId === targetRegId) return;

          // Only count as taken if the other team saved it
          const psId = reg.selectedProblemStatementId || reg.selectedProblemStatement?.id || reg.selectedProblemStatement?.code;
          const isSaved = reg.isPsSaved !== false && (!!psId);

          if (psId && isSaved) {
            const teamName = reg.groupName || reg.teamName || reg.participantName || reg.name || "Another Team";
            takenMap[psId] = teamName;
            if (reg.selectedProblemStatement?.code) {
              takenMap[reg.selectedProblemStatement.code] = teamName;
            }
            if (reg.selectedProblemStatement?.id) {
              takenMap[reg.selectedProblemStatement.id] = teamName;
            }
          }
        });
        setTakenPsMap(takenMap);
      },
      (err) => {
        console.error("Error listening to registrations snapshot for problem statement allocation:", err);
      }
    );

    return () => unsubscribe();
  }, [targetRegId]);

  // Auto-expand Problem Statement textarea to full height (eliminates inner scrollbar & text truncation)
  useEffect(() => {
    const updateHeight = () => {
      if (problemStatementRef.current) {
        problemStatementRef.current.style.height = "auto";
        problemStatementRef.current.style.height = `${Math.max(220, problemStatementRef.current.scrollHeight + 32)}px`;
      }
    };
    updateHeight();
    const timer1 = setTimeout(updateHeight, 50);
    const timer2 = setTimeout(updateHeight, 250);
    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
    };
  }, [problemStatement, currentStep, selectedPsId]);

  // Auto-expand Key Features textarea
  useEffect(() => {
    const updateHeight = () => {
      if (keyFeaturesRef.current) {
        keyFeaturesRef.current.style.height = "auto";
        keyFeaturesRef.current.style.height = `${Math.max(160, keyFeaturesRef.current.scrollHeight + 20)}px`;
      }
    };
    updateHeight();
    const timer = setTimeout(updateHeight, 50);
    return () => clearTimeout(timer);
  }, [keyFeatures, currentStep]);

  // Initialize values from initialData (only if values exist to prevent accidental wipes)
  useEffect(() => {
    if (initialData) {
      if (initialData.problemStatement) setProblemStatement(initialData.problemStatement);
      if (initialData.keyFeatures) setKeyFeatures(initialData.keyFeatures);
      if (initialData.githubUrl || initialData.githubLink) setGithubUrl(initialData.githubUrl || initialData.githubLink);
      if (initialData.prototypeUrl || initialData.figmaUrl) setPrototypeUrl(initialData.prototypeUrl || initialData.figmaUrl);
      if (initialData.demoVideoUrl || initialData.videoLink) setDemoVideoUrl(initialData.demoVideoUrl || initialData.videoLink);
      if (initialData.srsFileName) setSrsFileName(initialData.srsFileName);
      else if (initialData.srsDocumentUrl) setSrsFileName("SRS_Document_Uploaded.pdf");
      if (initialData.presentationFileName) setPresentationFileName(initialData.presentationFileName);
      else if (initialData.presentationUrl) setPresentationFileName("Project_Presentation_Uploaded.pptx");
      if (initialData.selectedProblemStatementId) setSelectedPsId(initialData.selectedProblemStatementId);
      if (initialData.isPsSaved) setIsPsSaved(true);
      if (initialData.isPsLocked || initialData.problemStatementLocked) {
        setIsPsLocked(true);
        setIsPsSaved(true);
      }
    }
  }, [initialData]);

  // Load latest values if targetRegId provided
  useEffect(() => {
    const loadRegData = async () => {
      if (!targetRegId) return;
      try {
        const docRef = doc(db, "registrations", targetRegId);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const data = docSnap.data();
          if (data.problemStatement) setProblemStatement(data.problemStatement);
          if (data.keyFeatures) setKeyFeatures(data.keyFeatures);
          if (data.githubUrl || data.githubLink) setGithubUrl(data.githubUrl || data.githubLink);
          if (data.prototypeUrl || data.figmaUrl) setPrototypeUrl(data.prototypeUrl || data.figmaUrl);
          if (data.demoVideoUrl || data.videoLink) setDemoVideoUrl(data.demoVideoUrl || data.videoLink);
          if (data.srsFileName) setSrsFileName(data.srsFileName);
          if (data.presentationFileName) setPresentationFileName(data.presentationFileName);
          if (data.selectedProblemStatementId) setSelectedPsId(data.selectedProblemStatementId);
          if (data.isPsSaved) setIsPsSaved(true);
          if (data.isPsLocked || data.problemStatementLocked) {
            setIsPsLocked(true);
            setIsPsSaved(true);
          }

          // Fetch Event Problem Statements from Firestore
          let eventId = data.eventId;
          let eventData: any = null;

          if (eventId) {
            const evSnap = await getDoc(doc(db, "events", eventId));
            if (evSnap.exists()) eventData = evSnap.data();
          }

          if (!eventData && data.eventTitle) {
            const evsSnap = await getDocs(collection(db, "events"));
            const matched = evsSnap.docs.find(d => (d.data().title || "").toLowerCase().trim() === (data.eventTitle || "").toLowerCase().trim());
            if (matched) eventData = matched.data();
          }

          if (eventData) {
            if (eventData.problemStatements && eventData.problemStatements.length > 0) {
              setAvailableProblemStatements(eventData.problemStatements);
            } else if (eventData.problemStatementTitle) {
              setAvailableProblemStatements([{
                id: "ps_1",
                code: "PS-01",
                title: eventData.problemStatementTitle,
                track: eventData.problemStatementTrack || "General",
                description: eventData.problemStatement || ""
              }]);
            }
          }
        }
      } catch (err) {
        console.error("Error loading registration submission data:", err);
      }
    };
    loadRegData();
  }, [targetRegId]);

  // Handle Problem Statement Card Selection (Preview locally)
  const handleSelectProblemStatement = (item: any, idx: number) => {
    if (isPsLocked) {
      setStatusNotice({
        type: "error",
        message: "Problem statement selection is locked for your team because you already confirmed it and continued to SRS & PPT submission."
      });
      setTimeout(() => setStatusNotice(null), 4000);
      return;
    }

    const psKey = item.id || item.code || `ps_${idx + 1}`;
    const takenBy = takenPsMap[item.id] || takenPsMap[item.code] || takenPsMap[psKey];

    // If taken by another team who saved it, show error notice
    if (takenBy && selectedPsId !== item.id && selectedPsId !== item.code) {
      setStatusNotice({
        type: "error",
        message: `"${item.title}" is already taken by ${takenBy}.`
      });
      setTimeout(() => setStatusNotice(null), 4000);
      return;
    }

    const newId = item.id || item.code || `ps_${idx + 1}`;
    const isDifferent = selectedPsId !== newId;

    setSelectedPsId(newId);
    const fullText = `[${item.code || `PS-0${idx + 1}`}] ${item.title}\n\n${item.description}`;
    setProblemStatement(fullText);

    if (isDifferent) {
      setIsPsSaved(false);
    }
  };

  // Save My Problem Statement Button Handler (Marks statement as TAKEN for other teams in real-time)
  const handleSaveProblemStatement = async () => {
    if (!problemStatement.trim()) {
      setStatusNotice({
        type: "error",
        message: "Please select or enter a problem statement before saving."
      });
      setTimeout(() => setStatusNotice(null), 4000);
      return;
    }

    const selectedPsObj = availableProblemStatements.find(p => p.id === selectedPsId || p.code === selectedPsId) || null;
    const psKey = selectedPsId || selectedPsObj?.code;
    const takenBy = psKey ? takenPsMap[psKey] : null;

    if (takenBy) {
      setStatusNotice({
        type: "error",
        message: `This problem statement is already taken by ${takenBy}. Please select another statement.`
      });
      setTimeout(() => setStatusNotice(null), 4000);
      return;
    }

    setSavingPs(true);
    setStatusNotice(null);

    try {
      if (targetRegId) {
        const regRef = doc(db, "registrations", targetRegId);
        await updateDoc(regRef, {
          selectedProblemStatementId: selectedPsId,
          selectedProblemStatement: selectedPsObj,
          problemStatement,
          isPsSaved: true,
          updatedAt: Date.now()
        });
      }

      setIsPsSaved(true);
      setStatusNotice({
        type: "success",
        message: "Problem statement successfully saved & held for your team!"
      });
      setTimeout(() => setStatusNotice(null), 4000);
    } catch (err) {
      console.error("Error saving problem statement:", err);
      setStatusNotice({
        type: "error",
        message: "Failed to save problem statement. Please try again."
      });
    } finally {
      setSavingPs(false);
    }
  };

  // Handle Clearing/Resetting Selection (Releases Hold for Other Teams)
  const handleClearSelection = async () => {
    if (isPsLocked) {
      setStatusNotice({
        type: "error",
        message: "Your problem statement selection is locked and cannot be reset."
      });
      setTimeout(() => setStatusNotice(null), 4000);
      return;
    }

    setSelectedPsId("");
    setProblemStatement("");
    setIsPsSaved(false);

    if (targetRegId) {
      try {
        const regRef = doc(db, "registrations", targetRegId);
        await updateDoc(regRef, {
          selectedProblemStatementId: "",
          selectedProblemStatement: null,
          problemStatement: "",
          isPsSaved: false,
          updatedAt: Date.now()
        });
      } catch (err) {
        console.error("Error clearing problem statement hold in Firestore:", err);
      }
    }
  };

  // Confirm Problem Statement & Lock Selection before moving to Step 2
  const handleConfirmProblemStatementAndContinue = async () => {
    if (!problemStatement.trim()) {
      setStatusNotice({
        type: "error",
        message: "Please select an available problem statement or enter your custom statement before continuing."
      });
      setTimeout(() => setStatusNotice(null), 4000);
      return;
    }

    // Lock PS Selection for current team
    setIsPsSaved(true);
    setIsPsLocked(true);

    if (targetRegId) {
      try {
        const regRef = doc(db, "registrations", targetRegId);
        const selectedPsObj = availableProblemStatements.find(p => p.id === selectedPsId || p.code === selectedPsId) || null;
        await updateDoc(regRef, {
          problemStatement,
          selectedProblemStatementId: selectedPsId,
          selectedProblemStatement: selectedPsObj,
          isPsSaved: true,
          isPsLocked: true,
          problemStatementLocked: true,
          updatedAt: Date.now()
        });
      } catch (err) {
        console.error("Error locking problem statement selection in Firestore:", err);
      }
    }

    setCurrentStep(2);
  };

  // Handle Draft Save
  const handleSaveDraft = async () => {
    setSaving(true);
    setStatusNotice(null);

    try {
      if (targetRegId) {
        const regRef = doc(db, "registrations", targetRegId);
        const selectedPsObj = availableProblemStatements.find(p => p.id === selectedPsId) || null;
        await updateDoc(regRef, {
          problemStatement,
          keyFeatures,
          githubUrl,
          prototypeUrl,
          demoVideoUrl,
          srsFileName,
          presentationFileName,
          selectedProblemStatementId: selectedPsId,
          selectedProblemStatement: selectedPsObj,
          submissionStatus: "Draft",
          updatedAt: Date.now()
        });
      }

      setStatusNotice({ type: "success", message: "Draft saved successfully!" });
      setTimeout(() => setStatusNotice(null), 4000);
    } catch (err) {
      console.error("Error saving draft:", err);
      setStatusNotice({ type: "error", message: "Failed to save draft. Please try again." });
    } finally {
      setSaving(false);
    }
  };

  // Handle Final Submission
  const handleSubmitProject = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setSubmitting(true);
    setStatusNotice(null);

    try {
      if (targetRegId) {
        const regRef = doc(db, "registrations", targetRegId);
        const selectedPsObj = availableProblemStatements.find(p => p.id === selectedPsId) || null;
        await updateDoc(regRef, {
          problemStatement,
          keyFeatures,
          githubUrl,
          prototypeUrl,
          demoVideoUrl,
          srsFileName,
          presentationFileName,
          selectedProblemStatementId: selectedPsId,
          selectedProblemStatement: selectedPsObj,
          submissionStatus: "Submitted",
          submittedAt: Date.now(),
          updatedAt: Date.now()
        });
      }

      setStatusNotice({ type: "success", message: "Project submitted successfully!" });
      if (onSuccess) onSuccess();
      setTimeout(() => setStatusNotice(null), 4000);
    } catch (err) {
      console.error("Error submitting project:", err);
      setStatusNotice({ type: "error", message: "Failed to submit project. Please try again." });
    } finally {
      setSubmitting(false);
    }
  };

  // SRS File Drop / Choose
  const handleSrsFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSrsFileName(e.target.files[0].name);
    }
  };

  // Presentation File Drop / Choose
  const handlePresentationFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setPresentationFileName(e.target.files[0].name);
    }
  };

  // 4 Main Steps Definition
  const STEPS = [
    { 
      id: 1, 
      name: "Problem Statement", 
      label: "1. Problem Statement", 
      icon: FileText, 
      desc: "Select or enter your problem statement" 
    },
    { 
      id: 2, 
      name: "SRS & PPT Submission", 
      label: "2. SRS & PPT Submission", 
      icon: FileUp, 
      desc: "Upload SRS document and presentation deck" 
    },
    { 
      id: 3, 
      name: "Repo & Feature", 
      label: "3. Repo & Feature", 
      icon: Code, 
      desc: "Code repository link and key features" 
    },
    { 
      id: 4, 
      name: "Prototype Link & Video", 
      label: "4. Prototype Link & Video Submission", 
      icon: Video, 
      desc: "Live prototype and video demo link" 
    }
  ];

  return (
    <div className={`space-y-8 font-sans ${embedded ? "" : "max-w-6xl mx-auto p-8"}`}>
      
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <img src="/ai_verse.png" alt="AI Verse Logo" className="w-12 h-12 rounded-2xl object-contain shadow-md shadow-blue-500/20 shrink-0" />
          <div>
            <h1 className="text-3xl font-black text-slate-900 tracking-tight">Project Submission</h1>
            <p className="text-sm font-medium text-slate-500 mt-0.5">
              Complete the 4 steps below to submit your hackathon project to AI Verse.
            </p>
          </div>
        </div>

        {/* Top Right Quick Draft Button */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleSaveDraft}
            disabled={saving}
            className="bg-white hover:bg-slate-50 text-slate-700 font-bold text-xs px-5 py-2.5 rounded-xl border border-slate-300 transition-all cursor-pointer flex items-center gap-2 shadow-xs"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin text-slate-500" /> : null}
            <span>Save Draft</span>
          </button>
        </div>
      </div>

      {/* Alert Notice */}
      {statusNotice && (
        <div className={`p-4 rounded-2xl text-sm font-semibold flex items-center gap-3 shadow-md animate-fade-in ${
          statusNotice.type === "success" 
            ? "bg-emerald-500 text-white" 
            : "bg-red-500 text-white"
        }`}>
          <CheckCircle2 className="w-5 h-5" />
          <span>{statusNotice.message}</span>
        </div>
      )}

      {/* 🚀 4-STEP PROGRESS INDICATOR */}
      <div className="bg-white border border-slate-200/90 rounded-3xl p-6 sm:p-7 shadow-xs">
        <div className="flex items-center justify-between relative max-w-5xl mx-auto">
          
          {STEPS.map((step, idx) => {
            const isCompleted = currentStep > step.id;
            const isActive = currentStep === step.id;

            return (
              <React.Fragment key={step.id}>
                {/* Step Circle & Button */}
                <button
                  type="button"
                  onClick={() => setCurrentStep(step.id)}
                  className="flex flex-col items-center gap-2.5 z-10 group cursor-pointer focus:outline-none"
                >
                  <div 
                    className={`w-11 h-11 rounded-2xl flex items-center justify-center font-black text-sm transition-all duration-300 ${
                      isCompleted 
                        ? "bg-emerald-500 text-white shadow-md shadow-emerald-500/30 scale-100"
                        : isActive 
                          ? "bg-[#2563EB] text-white shadow-lg shadow-blue-500/30 ring-4 ring-blue-100 scale-105"
                          : "bg-slate-100 text-slate-400 group-hover:bg-slate-200 group-hover:text-slate-600"
                    }`}
                  >
                    {isCompleted ? (
                      <Check className="w-5 h-5 stroke-[3]" />
                    ) : (
                      <span>{step.id}</span>
                    )}
                  </div>

                  <div className="text-center">
                    <span 
                      className={`block text-xs font-black transition-colors ${
                        isActive 
                          ? "text-[#2563EB]" 
                          : isCompleted 
                            ? "text-emerald-700 font-bold" 
                            : "text-slate-400 font-medium group-hover:text-slate-600"
                      }`}
                    >
                      {step.name}
                    </span>
                  </div>
                </button>

                {/* Progress Connecting Line */}
                {idx < STEPS.length - 1 && (
                  <div className="flex-1 h-1 mx-3 rounded-full overflow-hidden bg-slate-100 self-center -mt-6">
                    <div 
                      className={`h-full transition-all duration-500 ${
                        currentStep > step.id ? "bg-emerald-500" : currentStep === step.id ? "bg-blue-400" : "bg-slate-200"
                      }`} 
                    />
                  </div>
                )}
              </React.Fragment>
            );
          })}

        </div>
      </div>

      {/* STEP CONTENT CONTAINER */}
      <div className="bg-white border border-slate-200/90 rounded-3xl p-6 sm:p-9 shadow-xs space-y-8 text-left">
        
        {/* STEP 1: PROBLEM STATEMENT */}
        {currentStep === 1 && (
          <div className="space-y-6 animate-in fade-in duration-200">
            <div className="flex items-center gap-3.5 border-b border-slate-100 pb-5">
              <div className="w-11 h-11 rounded-2xl bg-blue-50 text-[#2563EB] flex items-center justify-center font-bold">
                <FileText className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-blue-50 text-blue-700 border border-blue-100">
                    Step 1 of 4
                  </span>
                  <h3 className="text-xl font-black text-slate-900 tracking-tight">1. Problem Statement</h3>
                </div>
                <p className="text-xs text-slate-500 font-medium mt-0.5">
                  Select an official event problem statement or enter your team's custom problem statement.
                </p>
              </div>
            </div>

            {/* Available Official Event Problem Statements Picker */}
            {availableProblemStatements.length > 0 && (
              <div className="space-y-4 p-5 bg-slate-50/80 border border-slate-200/90 rounded-3xl">
                {isPsLocked && (
                  <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-2xl text-xs font-bold text-amber-800 flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-amber-600 shrink-0" />
                    <span>🔒 Problem Statement Confirmed & Locked — Selection cannot be changed after proceeding.</span>
                  </div>
                )}

                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 border-b border-slate-200/60 pb-3.5">
                  <label className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-[#2563EB]" /> Official Event Problem Statements ({availableProblemStatements.length})
                  </label>

                  {/* Allocation Status Legend */}
                  <div className="flex flex-wrap items-center gap-2.5 text-[11px] font-bold">
                    <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-200">
                      <span className="w-2 h-2 rounded-full bg-emerald-500" /> Green: Available
                    </span>
                    <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-blue-50 text-blue-700 border border-blue-200">
                      <span className="w-2 h-2 rounded-full bg-[#2563EB]" /> Blue: Held (Your Team)
                    </span>
                    <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-red-50 text-red-700 border border-red-200">
                      <span className="w-2 h-2 rounded-full bg-red-500" /> Red: Taken (Other Team)
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {availableProblemStatements.map((item, idx) => {
                    const psKey = item.id || item.code || `ps_${idx + 1}`;
                    const isSelected = selectedPsId === item.id || selectedPsId === item.code;
                    const takenByTeam = takenPsMap[item.id] || takenPsMap[item.code] || takenPsMap[psKey];
                    const isTakenByOther = !!takenByTeam && !isSelected;

                    return (
                      <div
                        key={item.id || idx}
                        onClick={() => handleSelectProblemStatement(item, idx)}
                        className={`p-5 rounded-2xl border-2 transition-all text-left space-y-2.5 relative ${
                          isSelected
                            ? isPsLocked
                              ? "bg-amber-50/90 border-amber-500 shadow-md ring-2 ring-amber-500/20 cursor-not-allowed"
                              : "bg-blue-50/90 border-[#2563EB] shadow-md ring-2 ring-blue-500/20 cursor-pointer"
                            : isTakenByOther || isPsLocked
                              ? "bg-red-50/60 border-red-300 opacity-90 cursor-not-allowed shadow-2xs"
                              : "bg-emerald-50/30 border-emerald-300 hover:border-emerald-500 hover:bg-emerald-50/80 hover:shadow-xs cursor-pointer"
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span
                            className={`px-2.5 py-1 rounded-xl text-xs font-black ${
                              isSelected
                                ? isPsLocked ? "bg-amber-600 text-white" : "bg-[#2563EB] text-white"
                                : isTakenByOther
                                  ? "bg-red-600 text-white"
                                  : "bg-emerald-600 text-white"
                            }`}
                          >
                            {item.code || `PS-0${idx + 1}`}
                          </span>

                          {/* Status Pill Badge */}
                          {isSelected ? (
                            <span className={`px-2.5 py-1 rounded-xl text-xs font-black text-white border flex items-center gap-1.5 shadow-2xs ${
                              isPsLocked ? "bg-amber-600 border-amber-700" : "bg-blue-600 border-blue-700"
                            }`}>
                              <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
                              {isPsLocked ? "🔒 Confirmed & Locked" : "In Hold (Your Team)"}
                            </span>
                          ) : isTakenByOther ? (
                            <span className="px-2.5 py-1 rounded-xl text-xs font-black bg-red-100 text-red-700 border border-red-200 flex items-center gap-1.5 shadow-2xs">
                              <span className="w-2 h-2 rounded-full bg-red-600 animate-pulse" />
                              Taken ({takenByTeam})
                            </span>
                          ) : (
                            <span className="px-2.5 py-1 rounded-xl text-xs font-black bg-emerald-100 text-emerald-800 border border-emerald-200/80 flex items-center gap-1.5 shadow-2xs">
                              <span className="w-2 h-2 rounded-full bg-emerald-500" />
                              Available
                            </span>
                          )}
                        </div>

                        <h4 className="text-sm font-black text-slate-900 leading-tight">{item.title}</h4>
                        <p
                          className={`text-xs font-medium leading-relaxed line-clamp-3 ${
                            isSelected
                              ? "text-slate-800 font-semibold"
                              : isTakenByOther
                                ? "text-slate-600"
                                : "text-slate-700"
                          }`}
                        >
                          {item.description}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Problem Statement Text & Detailed Description Card */}
            <div className="bg-white p-7 sm:p-8 rounded-3xl border border-slate-200/80 shadow-sm space-y-6 text-left relative overflow-hidden">
              
              {/* Subtle Ambient Glow */}
              <div className="absolute top-0 right-0 w-80 h-80 bg-gradient-to-br from-blue-500/5 to-indigo-500/5 rounded-full blur-3xl pointer-events-none" />

              {/* Header Bar */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-5 relative z-10">
                <div className="flex items-center gap-3.5">
                  <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-[#2563EB] to-indigo-600 text-white flex items-center justify-center font-bold shrink-0 shadow-md shadow-blue-500/20">
                    <FileText className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-base font-black text-slate-900 tracking-tight">
                      Problem Statement & Requirements
                    </h4>
                    <p className="text-xs text-slate-500 font-medium mt-0.5">
                      Review, customize, or paste your team's exact problem statement requirements.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2.5 self-start sm:self-auto">
                  {selectedPsId ? (
                    <span className={`px-3.5 py-1.5 rounded-xl text-xs font-black flex items-center gap-2 shadow-2xs ${
                      isPsLocked ? "bg-amber-50 text-amber-800 border border-amber-200" : "bg-blue-50 text-blue-700 border border-blue-200/80"
                    }`}>
                      <span className={`w-2 h-2 rounded-full animate-pulse ${isPsLocked ? "bg-amber-600" : "bg-[#2563EB]"}`} />
                      {isPsLocked ? "🔒 Problem Statement Confirmed & Locked" : "Official Statement Selected"}
                    </span>
                  ) : (
                    <span className="px-3.5 py-1.5 rounded-xl text-xs font-extrabold bg-slate-100 text-slate-600 border border-slate-200/80">
                      Custom Statement Mode
                    </span>
                  )}
                  {problemStatement && (
                    <button
                      type="button"
                      onClick={handleClearSelection}
                      disabled={isPsLocked}
                      className={`text-xs font-extrabold px-3 py-1.5 rounded-xl transition-all border shadow-2xs ${
                        isPsLocked 
                          ? "bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed" 
                          : "text-slate-400 hover:text-red-600 bg-slate-50 hover:bg-red-50 border-slate-200/60 cursor-pointer"
                      }`}
                    >
                      {isPsLocked ? "🔒 Selection Locked" : "Reset / Clear"}
                    </button>
                  )}
                </div>
              </div>

              {/* Seamless Borderless Text Area */}
              <div className="space-y-4 relative z-10">
                <textarea
                  ref={problemStatementRef}
                  rows={8}
                  value={problemStatement}
                  onChange={(e) => !isPsLocked && setProblemStatement(e.target.value)}
                  readOnly={isPsLocked}
                  maxLength={1000}
                  placeholder="Type or paste your problem statement title, detailed description, constraints, and target user requirements..."
                  className={`w-full p-5 sm:p-6 border-0 rounded-2xl text-sm font-medium leading-relaxed whitespace-pre-wrap font-sans transition-all overflow-hidden resize-none shadow-2xs ${
                    isPsLocked 
                      ? "bg-slate-100/80 text-slate-700 cursor-not-allowed" 
                      : "bg-slate-50/70 hover:bg-slate-50 focus:bg-white text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20"
                  }`}
                />
                
                {/* Clean Seamless Footer Status & Counter Bar */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs font-semibold text-slate-500 px-1 pt-1">
                  <div className="flex items-center gap-2 text-slate-500">
                    <Sparkles className="w-4 h-4 text-[#2563EB] shrink-0" />
                    <span>
                      {isPsLocked 
                        ? "🔒 Problem Statement is confirmed and locked for your team." 
                        : "Full card view enabled — multiline requirements, formatting, and constraints expanded."}
                    </span>
                  </div>

                  <div className="flex items-center gap-2.5 shrink-0 self-end sm:self-auto">
                    <div className="w-20 h-1.5 rounded-full bg-slate-200/80 overflow-hidden">
                      <div 
                        className={`h-full transition-all duration-300 ${
                          problemStatement.length > 900 ? "bg-red-500" : problemStatement.length > 700 ? "bg-amber-500" : "bg-[#2563EB]"
                        }`}
                        style={{ width: `${Math.min((problemStatement.length / 1000) * 100, 100)}%` }}
                      />
                    </div>
                    <span className={`font-mono text-xs font-black ${problemStatement.length > 900 ? "text-red-600" : "text-slate-600"}`}>
                      {problemStatement.length} / 1000
                    </span>
                  </div>
                </div>
              </div>

            </div>

            {/* Navigation Buttons for Step 1 */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={handleSaveDraft}
                disabled={saving}
                className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-all cursor-pointer self-start sm:self-auto"
              >
                Save Draft
              </button>
              
              <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
                {/* Save My Problem Statement Button (Placed in user's requested red box area) */}
                <button
                  type="button"
                  onClick={handleSaveProblemStatement}
                  disabled={savingPs || isPsLocked}
                  className={`px-6 py-3 font-black text-xs rounded-2xl shadow-md transition-all flex items-center gap-2 cursor-pointer ${
                    isPsSaved
                      ? "bg-emerald-500 hover:bg-emerald-600 text-white shadow-emerald-500/20"
                      : "bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-500/30"
                  } ${isPsLocked ? "opacity-60 cursor-not-allowed" : ""}`}
                >
                  {savingPs ? (
                    <Loader2 className="w-4 h-4 animate-spin text-white" />
                  ) : isPsSaved ? (
                    <CheckCircle2 className="w-4 h-4 text-white" />
                  ) : (
                    <Sparkles className="w-4 h-4 text-white" />
                  )}
                  <span>{isPsSaved ? "✓ Problem Statement Saved" : "Save My Problem Statement"}</span>
                </button>

                <button
                  type="button"
                  onClick={handleConfirmProblemStatementAndContinue}
                  className="px-7 py-3 bg-[#2563EB] hover:bg-blue-700 text-white font-black text-xs rounded-2xl shadow-lg shadow-blue-500/20 transition-all flex items-center gap-2 cursor-pointer"
                >
                  <span>Continue to SRS & PPT Submission</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* STEP 2: SRS AND PPT SUBMISSION */}
        {currentStep === 2 && (
          <div className="space-y-6 animate-in fade-in duration-200">
            <div className="flex items-center gap-3.5 border-b border-slate-100 pb-5">
              <div className="w-11 h-11 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
                <FileUp className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-indigo-50 text-indigo-700 border border-indigo-100">
                    Step 2 of 4
                  </span>
                  <h3 className="text-xl font-black text-slate-900 tracking-tight">2. SRS & PPT Submission</h3>
                </div>
                <p className="text-xs text-slate-500 font-medium mt-0.5">
                  Upload your project Software Requirements Specification (SRS) document and Presentation Deck.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* SRS Document Upload Card */}
              <div className="border-2 border-dashed border-slate-200 hover:border-blue-400 rounded-3xl p-8 text-center space-y-4 transition-all bg-slate-50/50 hover:bg-blue-50/20 relative group">
                <input 
                  type="file" 
                  accept=".pdf,.docx,.doc"
                  onChange={handleSrsFileChange}
                  className="absolute inset-0 opacity-0 cursor-pointer w-full h-full z-10"
                />
                <div className="w-12 h-12 rounded-2xl bg-blue-50 group-hover:bg-blue-100 text-[#2563EB] flex items-center justify-center mx-auto transition-colors">
                  <FileUp className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="text-base font-black text-slate-900">SRS Document Submission</h4>
                  <p className="text-xs text-slate-500 font-medium mt-1">
                    Drag & drop file or <span className="text-blue-600 font-extrabold underline cursor-pointer">browse from device</span>
                  </p>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-2">
                    PDF, DOCX (MAX 10MB)
                  </p>
                </div>

                {srsFileName ? (
                  <div className="pt-2 text-xs font-black text-emerald-600 bg-emerald-50 py-2 px-4 rounded-xl flex items-center justify-center gap-2 border border-emerald-200">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span className="truncate max-w-[240px]">{srsFileName}</span>
                  </div>
                ) : (
                  <span className="inline-block text-[11px] font-extrabold text-slate-400 bg-slate-100 px-3 py-1 rounded-lg">
                    No file selected yet
                  </span>
                )}
              </div>

              {/* Project Presentation PPT Upload Card */}
              <div className="border-2 border-dashed border-slate-200 hover:border-indigo-400 rounded-3xl p-8 text-center space-y-4 transition-all bg-slate-50/50 hover:bg-indigo-50/20 relative group">
                <input 
                  type="file" 
                  accept=".ppt,.pptx,.pdf"
                  onChange={handlePresentationFileChange}
                  className="absolute inset-0 opacity-0 cursor-pointer w-full h-full z-10"
                />
                <div className="w-12 h-12 rounded-2xl bg-indigo-50 group-hover:bg-indigo-100 text-indigo-600 flex items-center justify-center mx-auto transition-colors">
                  <Video className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="text-base font-black text-slate-900">PPT Presentation Submission</h4>
                  <p className="text-xs text-slate-500 font-medium mt-1">
                    Drag & drop pitch deck or <span className="text-indigo-600 font-extrabold underline cursor-pointer">browse from device</span>
                  </p>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-2">
                    PPT, PPTX, PDF (MAX 25MB)
                  </p>
                </div>

                {presentationFileName ? (
                  <div className="pt-2 text-xs font-black text-emerald-600 bg-emerald-50 py-2 px-4 rounded-xl flex items-center justify-center gap-2 border border-emerald-200">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span className="truncate max-w-[240px]">{presentationFileName}</span>
                  </div>
                ) : (
                  <span className="inline-block text-[11px] font-extrabold text-slate-400 bg-slate-100 px-3 py-1 rounded-lg">
                    No presentation uploaded yet
                  </span>
                )}
              </div>
            </div>

            {/* Navigation Buttons for Step 2 */}
            <div className="flex items-center justify-between pt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setCurrentStep(1)}
                className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-all cursor-pointer flex items-center gap-2"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Back</span>
              </button>
              
              <button
                type="button"
                onClick={() => setCurrentStep(3)}
                className="px-7 py-3 bg-[#2563EB] hover:bg-blue-700 text-white font-black text-xs rounded-2xl shadow-lg shadow-blue-500/20 transition-all flex items-center gap-2 cursor-pointer"
              >
                <span>Continue to Repo & Feature</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* STEP 3: REPO AND FEATURE */}
        {currentStep === 3 && (
          <div className="space-y-6 animate-in fade-in duration-200">
            <div className="flex items-center gap-3.5 border-b border-slate-100 pb-5">
              <div className="w-11 h-11 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center font-bold">
                <Code className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-purple-50 text-purple-700 border border-purple-100">
                    Step 3 of 4
                  </span>
                  <h3 className="text-xl font-black text-slate-900 tracking-tight">3. Repo & Feature</h3>
                </div>
                <p className="text-xs text-slate-500 font-medium mt-0.5">
                  Provide your code repository link and describe key features & technical functionalities.
                </p>
              </div>
            </div>

            {/* Code Repository URL Input */}
            <div className="space-y-2">
              <label className="block text-xs font-black text-slate-700 uppercase tracking-wider">
                Code Repository URL (GitHub / GitLab / Bitbucket)
              </label>
              <div className="relative flex items-center">
                <Code className="w-5 h-5 text-slate-400 absolute left-4 pointer-events-none" />
                <input 
                  type="url" 
                  value={githubUrl}
                  onChange={(e) => setGithubUrl(e.target.value)}
                  placeholder="https://github.com/your-username/your-project-repo" 
                  className="w-full pl-12 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-semibold text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-blue-500 focus:bg-white transition-all"
                  required
                />
              </div>
            </div>

            {/* Key Features Textarea */}
            <div className="space-y-2">
              <label className="block text-xs font-black text-slate-700 uppercase tracking-wider">
                Key Features & Technical Functionalities
              </label>
              <textarea
                ref={keyFeaturesRef}
                rows={6}
                value={keyFeatures}
                onChange={(e) => setKeyFeatures(e.target.value)}
                placeholder={`1. AI-driven predictive resource management algorithm\n2. Real-time websocket notification engine\n3. Role-based authentication & analytics dashboard...`}
                className="w-full p-4.5 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-medium text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-blue-500 focus:bg-white transition-all leading-relaxed whitespace-pre-wrap overflow-hidden resize-none"
              />
            </div>

            {/* Navigation Buttons for Step 3 */}
            <div className="flex items-center justify-between pt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setCurrentStep(2)}
                className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-all cursor-pointer flex items-center gap-2"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Back</span>
              </button>
              
              <button
                type="button"
                onClick={() => setCurrentStep(4)}
                className="px-7 py-3 bg-[#2563EB] hover:bg-blue-700 text-white font-black text-xs rounded-2xl shadow-lg shadow-blue-500/20 transition-all flex items-center gap-2 cursor-pointer"
              >
                <span>Continue to Prototype & Video</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* STEP 4: PROTOTYPE LINK AND VIDEO SUBMISSION */}
        {currentStep === 4 && (
          <div className="space-y-6 animate-in fade-in duration-200">
            <div className="flex items-center gap-3.5 border-b border-slate-100 pb-5">
              <div className="w-11 h-11 rounded-2xl bg-teal-50 text-teal-600 flex items-center justify-center font-bold">
                <Video className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-teal-50 text-teal-700 border border-teal-100">
                    Step 4 of 4
                  </span>
                  <h3 className="text-xl font-black text-slate-900 tracking-tight">4. Prototype Link & Video Submission</h3>
                </div>
                <p className="text-xs text-slate-500 font-medium mt-0.5">
                  Submit live prototype URL, demo video link, and complete final project submission.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Prototype Link */}
              <div className="space-y-2">
                <label className="block text-xs font-black text-slate-700 uppercase tracking-wider">
                  Live Prototype / Demo URL
                </label>
                <div className="relative flex items-center">
                  <Globe className="w-5 h-5 text-slate-400 absolute left-4 pointer-events-none" />
                  <input 
                    type="url" 
                    value={prototypeUrl}
                    onChange={(e) => setPrototypeUrl(e.target.value)}
                    placeholder="https://figma.com/... or https://myproject.vercel.app" 
                    className="w-full pl-12 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-semibold text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-blue-500 focus:bg-white transition-all"
                  />
                </div>
              </div>

              {/* Demo Video URL */}
              <div className="space-y-2">
                <label className="block text-xs font-black text-slate-700 uppercase tracking-wider">
                  Demo Video URL (YouTube / Google Drive / Loom)
                </label>
                <div className="relative flex items-center">
                  <PlayCircle className="w-5 h-5 text-slate-400 absolute left-4 pointer-events-none" />
                  <input 
                    type="url" 
                    value={demoVideoUrl}
                    onChange={(e) => setDemoVideoUrl(e.target.value)}
                    placeholder="https://youtube.com/watch?v=... or Drive link" 
                    className="w-full pl-12 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-semibold text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-blue-500 focus:bg-white transition-all"
                    required
                  />
                </div>
              </div>
            </div>

            {/* Submission Summary Card */}
            <div className="p-6 bg-slate-50 border border-slate-200/90 rounded-3xl space-y-4">
              <h4 className="text-sm font-black text-slate-900 tracking-tight flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                Submission Overview Summary
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-medium text-slate-700">
                <div className="p-3.5 bg-white rounded-2xl border border-slate-200/80">
                  <span className="block text-[10px] font-black text-slate-400 uppercase">1. Problem Statement:</span>
                  <span className="font-bold text-slate-900 line-clamp-1">{problemStatement || "Not specified"}</span>
                </div>
                <div className="p-3.5 bg-white rounded-2xl border border-slate-200/80">
                  <span className="block text-[10px] font-black text-slate-400 uppercase">2. Documents:</span>
                  <span className="font-bold text-slate-900">{srsFileName || "SRS Pending"} • {presentationFileName || "PPT Pending"}</span>
                </div>
                <div className="p-3.5 bg-white rounded-2xl border border-slate-200/80">
                  <span className="block text-[10px] font-black text-slate-400 uppercase">3. Repository & Features:</span>
                  <span className="font-bold text-slate-900 truncate block">{githubUrl || "Repo URL Pending"}</span>
                </div>
                <div className="p-3.5 bg-white rounded-2xl border border-slate-200/80">
                  <span className="block text-[10px] font-black text-slate-400 uppercase">4. Prototype & Video:</span>
                  <span className="font-bold text-slate-900 truncate block">{prototypeUrl || "Prototype Link"} • {demoVideoUrl || "Video Link"}</span>
                </div>
              </div>
            </div>

            {/* Final Submission Action Bar */}
            <div className="flex items-center justify-between pt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setCurrentStep(3)}
                className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-all cursor-pointer flex items-center gap-2"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Back</span>
              </button>
              
              <button
                type="button"
                onClick={() => handleSubmitProject()}
                disabled={submitting}
                className="px-8 py-3.5 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-black text-sm rounded-2xl shadow-xl shadow-emerald-500/20 transition-all flex items-center gap-2.5 cursor-pointer disabled:opacity-50"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-white" />
                    <span>Submitting Project...</span>
                  </>
                ) : (
                  <>
                    <ShieldCheck className="w-5 h-5 text-white" />
                    <span>Submit Project Details</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};

export default ProjectSubmissionPage;

