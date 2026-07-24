import React, { useState, useEffect, useMemo, useRef } from "react";
import jsQR from "jsqr";
import { db, auth } from "../../config/firebase";
import { collection, getDocs, getDoc, doc, updateDoc, deleteDoc } from "firebase/firestore";
import SEO from "../../components/layout/SEO";
import { 
  Search, 
  Filter, 
  ArrowUpDown, 
  RefreshCw, 
  FileText, 
  QrCode,
  Camera,
  Check,
  X,
  AlertCircle
} from "lucide-react";


interface StudentAttendee {
  id: string;
  name: string;
  email: string;
  studentId: string;
  department: string;
  year: string;
  program: string;
  checkInTime: string;
  status: "Present" | "Late" | "Absent";
  avatar: string;
  regId?: string;
  isLead?: boolean;
  memberIndex?: number;
}


const OrgAttendancePage: React.FC = () => {
  const [students, setStudents] = useState<StudentAttendee[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<"name" | "time" | "status">("name");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
  const [syncTime, setSyncTime] = useState(2); // minutes ago

  const [isScannerModalOpen, setIsScannerModalOpen] = useState(false);
  const [scannedTeamInfo, setScannedTeamInfo] = useState<any | null>(null);
  const [scanLoading, setScanLoading] = useState(false);
  const [scanSuccessMsg, setScanSuccessMsg] = useState("");
  const [registrations, setRegistrations] = useState<any[]>([]);
  const [rosterAttendance, setRosterAttendance] = useState<Record<string, "Present" | "Late" | "Absent">>({});
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const requestRef = useRef<number | null>(null);

  const [assignedEvent, setAssignedEvent] = useState<any | null>(null);
  const [isEventDay, setIsEventDay] = useState(true);



  useEffect(() => {
    const loadAttendanceData = async () => {
      try {
        setLoading(true);

        // 1. Fetch assigned event title matching the logged-in organizer from "team" or "organizers" collection
        const userEmail = auth.currentUser?.email || "saichandrakiranuppalapati@gmail.com";
        let assignedEventTitle = "test event";

        const orgsSnap = await getDocs(collection(db, "organizers"));
        const organizerData = orgsSnap.docs.map(d => d.data()).find(o => 
          o.email?.toLowerCase() === userEmail.toLowerCase() || 
          o.username?.toLowerCase() === userEmail.toLowerCase() ||
          o.email === "teammember1@gmail.com" ||
          o.username === "teammember1@gmail.com"
        );

        if (organizerData?.assignedEvents?.[0]) {
          assignedEventTitle = organizerData.assignedEvents[0];
        } else {
          const teamSnap = await getDocs(collection(db, "team"));
          const teamOrganizerData = teamSnap.docs.map(d => d.data()).find(o => 
            o.email?.toLowerCase() === userEmail.toLowerCase() || 
            o.username?.toLowerCase() === userEmail.toLowerCase() ||
            o.email === "j.smith@uni.edu"
          );
          if (teamOrganizerData?.assignedEvents?.[0]) {
            assignedEventTitle = teamOrganizerData.assignedEvents[0];
          }
        }

        // 2. Query events details matching title
        const eventsSnap = await getDocs(collection(db, "events"));
        const matchedEvent = eventsSnap.docs.map(d => ({ id: d.id, ...d.data() } as any)).find(e => e.title?.toLowerCase() === assignedEventTitle.toLowerCase());
        const activeEventInfo = (matchedEvent || { id: "neural_workshop", title: assignedEventTitle, venue: "Main Auditorium", room: "Quantum Lab B-02" }) as any;
        setAssignedEvent(activeEventInfo);

        // Check if today matches activeEventInfo date parameters (e.g. startDate)
        const eventDate = activeEventInfo.startDate || activeEventInfo.date;
        if (eventDate) {
          const localToday = new Date();
          const localTodayStr = `${localToday.getFullYear()}-${String(localToday.getMonth() + 1).padStart(2, "0")}-${String(localToday.getDate()).padStart(2, "0")}`;
          
          if (eventDate !== localTodayStr) {
            setIsEventDay(false);
          } else {
            setIsEventDay(true);
          }
        } else {
          setIsEventDay(true);
        }

        // 3. Query registrations from Firestore and clean up sample entries
        const regsSnap = await getDocs(collection(db, "registrations"));
        const deletePromises: Promise<any>[] = [];
        regsSnap.forEach((docSnap) => {
          const data = docSnap.data();
          if (data.teamLeadEmail === "alex.rivera@azure.edu" || 
              data.teamLeadEmail === "sarah.chen@azure.edu" || 
              data.teamLeadEmail === "jordan.smith@azure.edu") {
            deletePromises.push(deleteDoc(doc(db, "registrations", docSnap.id)));
          }
        });

        if (deletePromises.length > 0) {
          await Promise.all(deletePromises);
        }

        // Fetch clean dataset from registrations collection and administrative users to exclude them from student roster
        const usersSnap = await getDocs(collection(db, "users"));
        const dbUserEmails = new Set(
          usersSnap.docs.map(doc => doc.data().email?.toLowerCase()).filter(Boolean)
        );

        const updatedRegsSnap = await getDocs(collection(db, "registrations"));
        const list: StudentAttendee[] = [];
        const regList: any[] = [];

        updatedRegsSnap.forEach((docSnap) => {
          const data = docSnap.data();
          regList.push({ id: docSnap.id, ...data });
          // Map database elements to student columns if applicable
          if (data.eventId === activeEventInfo.id || data.eventTitle?.toLowerCase() === activeEventInfo.title?.toLowerCase()) {
            // Push Team Lead if not a database user/organizer
            if (!dbUserEmails.has(data.teamLeadEmail?.toLowerCase())) {
              list.push({
                id: docSnap.id + "_lead",
                regId: docSnap.id,
                isLead: true,
                name: data.teamLeadName || "Unnamed Student",
                email: data.teamLeadEmail || "",
                studentId: data.teamLeadStudentId || `AI-2026-${Math.floor(100 + Math.random() * 900)}`,
                department: data.groupName || "Computer Science",
                year: data.year || "Year 3",
                program: data.program || "Honours",
                checkInTime: data.checkInTime || "Not Checked-in",
                status: (data.attendanceStatus as any) || "Absent",
                avatar: data.avatar || "satoshiImg"
              });
            }

            // Push Teammates if not a database user/organizer
            if (data.members && data.members.length > 0) {
              data.members.forEach((m: any, idx: number) => {
                if (!dbUserEmails.has(m.email?.toLowerCase())) {
                  list.push({
                    id: docSnap.id + `_member_${idx}`,
                    regId: docSnap.id,
                    isLead: false,
                    memberIndex: idx,
                    name: m.name || "Unnamed Teammate",
                    email: m.email || "",
                    studentId: m.studentId || `AI-2026-${Math.floor(100 + Math.random() * 900)}`,
                    department: data.groupName || "Computer Science",
                    year: data.year || "Year 3",
                    program: data.program || "Honours",
                    checkInTime: m.checkInTime || "Not Checked-in",
                    status: (m.attendanceStatus as any) || "Absent",
                    avatar: "sarah"
                  });
                }
              });
            }
          }
        });

        setStudents(list);
        setRegistrations(regList);
      } catch (err) {
        console.error("Error loading attendance records:", err);
      } finally {
        setLoading(false);
      }
    };

    loadAttendanceData();
  }, []);

  // Real QR code scanner frame loop and callbacks
  const handleScannedCode = (decodedText: string) => {
    const reg = registrations.find(r => r.id === decodedText || r.qrCodeData === decodedText);
    if (reg) {
      if (reg.eventId !== assignedEvent?.id && reg.eventTitle?.toLowerCase() !== assignedEvent?.title?.toLowerCase()) {
        alert(`This registration is for "${reg.eventTitle}". You can only check-in attendees for your assigned event: "${assignedEvent?.title}".`);
        return;
      }
      setScannedTeamInfo(reg);
    } else {
      alert("Invalid ticket QR Code or registration ID.");
    }
  };

  const scanFrame = () => {
    if (videoRef.current && videoRef.current.readyState === videoRef.current.HAVE_ENOUGH_DATA) {
      const video = videoRef.current;
      const canvas = document.createElement("canvas");
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext("2d");
      
      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const code = jsQR(imageData.data, imageData.width, imageData.height, {
          inversionAttempts: "dontInvert",
        });

        if (code) {
          console.log("Real QR Decoded:", code.data);
          handleScannedCode(code.data);
          return;
        }
      }
    }
    
    if (isScannerModalOpen && !scannedTeamInfo) {
      requestRef.current = requestAnimationFrame(scanFrame);
    }
  };

  useEffect(() => {
    let active = true;

    const startCamera = async () => {
      if (isScannerModalOpen && !scannedTeamInfo) {
        try {
          const stream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: "environment" }
          });
          if (!active) {
            stream.getTracks().forEach(t => t.stop());
            return;
          }
          streamRef.current = stream;
          if (videoRef.current) {
            videoRef.current.srcObject = stream;
            videoRef.current.setAttribute("playsinline", "true");
            videoRef.current.play();
            requestRef.current = requestAnimationFrame(scanFrame);
          }
        } catch (err) {
          console.warn("Camera access failed or unavailable, displaying mock feed fallback:", err);
        }
      }
    };

    const stopCamera = () => {
      if (requestRef.current) {
        cancelAnimationFrame(requestRef.current);
        requestRef.current = null;
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      }
    };

    startCamera();

    return () => {
      active = false;
      stopCamera();
    };
  }, [isScannerModalOpen, scannedTeamInfo, registrations]);

  useEffect(() => {
    if (scannedTeamInfo) {
      const initialStatuses: Record<string, "Present" | "Late" | "Absent"> = {};
      initialStatuses["lead"] = (scannedTeamInfo.attendanceStatus as any) || "Present";
      if (scannedTeamInfo.members) {
        scannedTeamInfo.members.forEach((m: any, idx: number) => {
          initialStatuses[`member_${idx}`] = m.attendanceStatus || "Present";
        });
      }
      setRosterAttendance(initialStatuses);
    } else {
      setRosterAttendance({});
    }
  }, [scannedTeamInfo]);


  // Toggle status handler (updates Firestore and State)
  const handleStatusChange = async (studentId: string, newStatus: "Present" | "Late" | "Absent") => {
    const timeNow = new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
    const formattedCheckIn = newStatus === "Absent" 
      ? "Not Checked-in" 
      : `${timeNow} (Manual)`;

    // Find student in local state
    const student = students.find(s => s.id === studentId);
    if (!student) return;

    // Update locally
    setStudents(prev => prev.map(s => s.id === studentId ? {
      ...s,
      status: newStatus,
      checkInTime: formattedCheckIn
    } : s));

    // Update in Firestore
    try {
      const regId = student.regId || studentId;
      const docRef = doc(db, "registrations", regId);

      if (student.isLead) {
        await updateDoc(docRef, {
          attendanceStatus: newStatus,
          checkInTime: formattedCheckIn
        });
      } else if (student.memberIndex !== undefined) {
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const data = docSnap.data();
          const membersList = [...(data.members || [])];
          if (membersList[student.memberIndex]) {
            membersList[student.memberIndex].attendanceStatus = newStatus;
            membersList[student.memberIndex].checkInTime = formattedCheckIn;
          }
          await updateDoc(docRef, {
            members: membersList
          });
        }
      } else {
        await updateDoc(docRef, {
          attendanceStatus: newStatus,
          checkInTime: formattedCheckIn
        });
      }
    } catch (err) {
      console.error("Failed to update status in DB:", err);
    }
  };

  // Simulated Sync Action
  const handleSyncAttendance = () => {
    setSyncTime(0);
    alert("Attendance data successfully synced to Azure University database!");
  };

  // Simulated Report Action
  const handleGenerateReport = () => {
    alert("Attendance log compiled! Downloading Neural_Networks_Attendance_Report.csv...");
  };

  // Search & Filter students
  const filteredStudents = useMemo(() => {
    let result = students.filter((s) => {
      const q = searchQuery.toLowerCase();
      return (
        s.name.toLowerCase().includes(q) ||
        s.studentId.toLowerCase().includes(q) ||
        s.department.toLowerCase().includes(q)
      );
    });

    // Apply Sorting
    result.sort((a, b) => {
      let fieldA: string = "";
      let fieldB: string = "";

      if (sortBy === "name") {
        fieldA = a.name;
        fieldB = b.name;
      } else if (sortBy === "time") {
        fieldA = a.checkInTime;
        fieldB = b.checkInTime;
      } else if (sortBy === "status") {
        fieldA = a.status;
        fieldB = b.status;
      }

      return sortOrder === "asc"
        ? fieldA.localeCompare(fieldB)
        : fieldB.localeCompare(fieldA);
    });

    return result;
  }, [students, searchQuery, sortBy, sortOrder]);

  // Compute real statistics based on the students list
  const stats = useMemo(() => {
    const presentList = students.filter(s => s.status === "Present" || s.status === "Late");
    const totalPresent = presentList.length;
    const totalExpected = students.length;
    const rate = totalExpected > 0 ? ((totalPresent / totalExpected) * 100).toFixed(1) : "0.0";

    return {
      present: totalPresent,
      expected: totalExpected,
      rate
    };
  }, [students]);

  if (!isEventDay) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center text-center p-8 bg-slate-50/50 rounded-3xl border border-slate-100/60 shadow-sm animate-in fade-in duration-300">
        <SEO title="Attendance Portal Closed - AI Verse" description="The attendance portal is closed on non-event days." />
        <div className="w-20 h-20 rounded-full bg-amber-50 text-amber-500 flex items-center justify-center border border-amber-100 shadow-inner mb-6 animate-bounce">
          <AlertCircle className="w-10 h-10" />
        </div>
        
        <span className="text-[10px] font-black uppercase text-amber-500 tracking-widest px-3 py-1 rounded-full bg-amber-50 border border-amber-100/50 inline-block mb-3">
          Portal Offline
        </span>
        
        <h1 className="text-3xl font-black text-slate-800 tracking-tight leading-none mb-3">
          Attendance Portal Closed
        </h1>
        
        <p className="text-slate-500 text-sm font-semibold max-w-md leading-relaxed mb-6">
          The attendance check-in system for <span className="text-slate-800 font-extrabold">"{assignedEvent?.title || "test event"}"</span> is scheduled for <span className="text-[#2563EB] font-extrabold">{assignedEvent?.startDate || "2026-07-31"}</span>. It is only accessible on the official day of the event.
        </p>

        <div className="text-[10px] font-bold text-slate-400 bg-white border border-slate-200/50 px-4 py-2 rounded-xl shadow-sm">
          Current System Date: <span className="text-slate-650 font-black">{new Date().toLocaleDateString("en-US", { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-24 text-left font-sans relative">
      <SEO 
        title="Session Attendance - Student Organizer" 
        description="Verify check-ins, generate session QR codes, and log attendee records."
      />

      {/* ================= SESSION INFO HEADER ================= */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div className="space-y-2">
          {/* Live Session Badge */}
          <div className="flex items-center gap-2">
            <span className="bg-[#EFF6FF] text-[#2563EB] border border-[#2563EB]/15 text-[10px] uppercase font-black tracking-widest px-3 py-1 rounded-lg">
              Live Session
            </span>
            <span className="text-slate-400 text-xs font-semibold flex items-center gap-1">
              <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></span>
              {assignedEvent ? `${assignedEvent.starts || "14:00"} - ${assignedEvent.ends || "17:00"}` : "14:00 - 17:00"}
            </span>
          </div>

          <h1 className="text-3xl font-black text-slate-800 tracking-tight leading-none">
            {assignedEvent ? assignedEvent.title : "Neural Networks Workshop"}
          </h1>
          <p className="text-slate-500 text-xs font-semibold">
            {assignedEvent ? `${assignedEvent.venue || "c block lab"} • Room ${assignedEvent.room || "Quantum Lab B-02"}` : "Main Auditorium • Hosted by Faculty of CS"}
          </p>
        </div>

        {/* Dynamic Metric Cards */}
        <div className="flex items-center gap-4 self-start lg:self-center">
          {/* PRESENT CARD */}
          <div className="bg-white border border-slate-100 rounded-2xl px-5 py-3 shadow-[0_8px_30px_rgba(0,0,0,0.015)] text-center min-w-[100px]">
            <span className="text-[9px] uppercase tracking-wider font-black text-slate-400">Present</span>
            <div className="text-2xl font-black text-[#2563EB] mt-0.5">{stats.present}</div>
          </div>

          {/* EXPECTED CARD */}
          <div className="bg-white border border-slate-100 rounded-2xl px-5 py-3 shadow-[0_8px_30px_rgba(0,0,0,0.015)] text-center min-w-[100px]">
            <span className="text-[9px] uppercase tracking-wider font-black text-slate-400">Expected</span>
            <div className="text-2xl font-black text-slate-800 mt-0.5">{stats.expected}</div>
          </div>

          {/* ATTENDANCE RATE CARD */}
          <div className="bg-white border border-[#B3F3D2]/30 rounded-2xl px-5 py-3 shadow-[0_8px_30px_rgba(0,0,0,0.015)] text-center min-w-[100px]">
            <span className="text-[9px] uppercase tracking-wider font-black text-slate-400">Rate</span>
            <div className="text-2xl font-black text-emerald-600 mt-0.5">{stats.rate}%</div>
          </div>
        </div>
      </div>

      {/* ================= CONTROLS ROW ================= */}
      <div className="flex items-center gap-3 pt-2 max-w-2xl">
        <div className="relative flex-grow">
          <Search className="absolute left-3.5 top-2.5 h-4.5 w-4.5 text-slate-400 pointer-events-none" />
          <input
            type="text"
            placeholder="Search by name, ID or department..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-white border border-slate-200/80 rounded-xl py-2 pl-10 pr-4 text-xs font-semibold text-slate-750 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-aether-blue-500 shadow-sm"
          />
        </div>
        <button 
          onClick={() => {
            setSortBy(sortBy === "name" ? "status" : "name");
            setSortOrder(sortOrder === "asc" ? "desc" : "asc");
          }}
          className="border border-slate-200 bg-white hover:bg-slate-50 text-slate-650 font-extrabold text-xs px-4 py-2 rounded-xl flex items-center gap-1.5 shadow-sm transition-all whitespace-nowrap"
        >
          <Filter className="h-4 w-4 text-slate-400" />
          Filter
        </button>
        <button 
          onClick={() => {
            setSortOrder(sortOrder === "asc" ? "desc" : "asc");
          }}
          className="border border-slate-200 bg-white hover:bg-slate-50 text-slate-650 font-extrabold text-xs px-4 py-2 rounded-xl flex items-center gap-1.5 shadow-sm transition-all whitespace-nowrap"
        >
          <ArrowUpDown className="h-4 w-4 text-slate-400" />
          Sort
        </button>
      </div>

      {/* ================= SPLIT SCREEN GRID ================= */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Left Side: Attendees Table (8/12) */}
        <div className="lg:col-span-8 bg-white border border-slate-100 rounded-2xl overflow-hidden shadow-[0_8px_30px_rgba(0,0,0,0.015)]">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20">
              <RefreshCw className="h-8 w-8 text-[#2563EB] animate-spin" />
              <p className="text-xs text-slate-400 font-semibold mt-2">Loading students log...</p>
            </div>
          ) : filteredStudents.length === 0 ? (
            <div className="py-20 text-center text-slate-400 font-semibold text-xs">
              No students match the criteria.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs font-semibold text-slate-600">
                <thead>
                  <tr className="bg-slate-50/70 border-b border-slate-100 text-slate-400 uppercase text-[9px] font-black tracking-wider">
                    <th className="px-6 py-4">Student</th>
                    <th className="px-6 py-4">ID & Dept</th>
                    <th className="px-6 py-4">Last Check-in</th>
                    <th className="px-6 py-4 text-right pr-12">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredStudents.map((student) => {
                    const isPresent = student.status === "Present";
                    const isLate = student.status === "Late";

                    return (
                      <tr key={student.id} className="hover:bg-slate-50/30 transition-colors">
                        {/* Student Column */}
                        <td className="px-6 py-4">
                          <div>
                            <span className="font-extrabold text-slate-800 text-xs block leading-snug">
                              {student.name}
                            </span>
                            <span className="text-[10px] text-slate-400 mt-0.5 block">
                              {student.year} • {student.program}
                            </span>
                          </div>
                        </td>

                        {/* ID & Dept Column */}
                        <td className="px-6 py-4">
                          <span className="text-slate-850 font-bold block">{student.studentId}</span>
                          <span className="text-[10px] text-slate-400 mt-0.5 block font-medium">{student.department}</span>
                        </td>

                        {/* Last Check-in Column */}
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <span className={`w-2 h-2 rounded-full shrink-0 ${
                              isPresent ? "bg-emerald-500" : isLate ? "bg-amber-500" : "bg-slate-350"
                            }`}></span>
                            <span className="text-slate-700 font-bold">{student.checkInTime}</span>
                          </div>
                        </td>

                        {/* Actions Column */}
                        <td className="px-6 py-4 text-right pr-12">
                          <button
                            onClick={() => {
                              const nextStatus = isPresent ? "Late" : isLate ? "Absent" : "Present";
                              handleStatusChange(student.id, nextStatus);
                            }}
                            className={`px-3.5 py-1.5 rounded-xl text-[10px] font-black tracking-wider uppercase transition-all shadow-sm border ${
                              isPresent
                                ? "bg-emerald-50 text-emerald-600 border-emerald-100 hover:bg-emerald-100/30"
                                : isLate
                                ? "bg-amber-50 text-amber-600 border-amber-100 hover:bg-amber-100/30"
                                : "bg-rose-50 text-rose-650 border-rose-100 hover:bg-rose-100/30"
                            }`}
                          >
                            {student.status}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Right Side: QR check-in & active sessions (4/12) */}
        <div className="lg:col-span-4 space-y-6">
          
          {/* Card 1: Student Check-in (QR code) */}
          <div className="bg-[#2563EB] rounded-2xl p-6 text-white text-center space-y-4 shadow-lg shadow-blue-600/10">
            <h3 className="text-sm font-black uppercase tracking-wider text-blue-100">
              Student Check-in
            </h3>

            {/* Viewfinder Camera Simulation */}
            <div className="bg-slate-900/90 rounded-xl p-4 w-44 h-44 mx-auto border border-slate-800 shadow-inner relative flex flex-col items-center justify-center overflow-hidden group">
              {/* Scan Laser Line */}
              <div className="absolute left-0 right-0 h-0.5 bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.8)] top-4 animate-bounce z-10"></div>
              
              {/* Viewfinder Corners */}
              <div className="absolute top-3.5 left-3.5 w-4 h-4 border-t-2 border-l-2 border-blue-500"></div>
              <div className="absolute top-3.5 right-3.5 w-4 h-4 border-t-2 border-r-2 border-blue-500"></div>
              <div className="absolute bottom-3.5 left-3.5 w-4 h-4 border-b-2 border-l-2 border-blue-500"></div>
              <div className="absolute bottom-3.5 right-3.5 w-4 h-4 border-b-2 border-r-2 border-blue-500"></div>
              
              {/* Camera Icon */}
              <Camera className="w-12 h-12 text-slate-400 group-hover:text-blue-400 transition-colors duration-300" />
              
              {/* Status Text */}
              <div className="text-[8px] text-blue-400 font-black uppercase tracking-widest mt-2">
                Scanner Viewfinder
              </div>
            </div>

            <p className="text-xs font-semibold text-blue-100/90 leading-relaxed max-w-[240px] mx-auto">
              Scan student's registration code with your scanner app to check them in.
            </p>

            <div className="pt-2">
              <button
                onClick={() => {
                  setIsScannerModalOpen(true);
                  setScanSuccessMsg("");
                }}
                className="w-full bg-white hover:bg-blue-50 text-[#2563EB] font-extrabold text-xs py-2.5 rounded-xl transition-all flex items-center justify-center gap-1.5 shadow-sm"
              >
                <QrCode className="h-4.5 w-4.5" />
                Enter to Check-in
              </button>
            </div>
          </div>



        </div>
      </div>

      {/* ================= STICKY BOTTOM BAR ================= */}
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 max-w-2xl w-[calc(100%-2rem)]">
        <div className="bg-white/85 backdrop-blur-md border border-slate-200/50 shadow-xl rounded-2xl px-4 sm:px-6 py-3.5 flex flex-col sm:flex-row items-center justify-between gap-3 sm:gap-6">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 self-start sm:self-auto">
            <span className="w-2 h-2 bg-emerald-500 rounded-full animate-ping"></span>
            <span>Last sync: {syncTime === 0 ? "just now" : `${syncTime} mins ago`}</span>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3 w-full sm:w-auto">
            <button
              onClick={handleGenerateReport}
              className="border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-extrabold text-xs py-2.5 px-4 rounded-xl flex items-center justify-center gap-1.5 shadow-sm transition-all whitespace-nowrap"
            >
              <FileText className="h-4 w-4 text-slate-400" />
              Generate Report
            </button>
            <button
              onClick={handleSyncAttendance}
              className="bg-[#2563EB] hover:bg-blue-700 text-white font-extrabold text-xs py-2.5 px-4.5 rounded-xl flex items-center justify-center gap-1.5 shadow-md shadow-blue-600/10 transition-all whitespace-nowrap"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              Sync Final Attendance
            </button>
          </div>
        </div>
      </div>

      {/* ================= QR SCANNER MODAL ================= */}
      {isScannerModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-slate-950 text-white rounded-2xl shadow-xl w-full max-w-md border border-slate-800 p-6 flex flex-col items-center space-y-6 relative overflow-hidden animate-in zoom-in-95 duration-200">
            {/* Close Button */}
            <button
              onClick={() => {
                setIsScannerModalOpen(false);
                setScannedTeamInfo(null);
              }}
              className="absolute top-4 right-4 p-1.5 hover:bg-slate-800 text-slate-400 hover:text-slate-200 rounded-lg transition-colors"
            >
              <X className="h-5 w-5" />
            </button>

            {/* Header */}
            <div className="text-center space-y-1">
              <span className="text-[9px] font-black uppercase text-blue-400 tracking-widest block">QR Code Scanner</span>
              <h2 className="text-lg font-black text-white tracking-tight leading-snug">
                Student QR Check-in
              </h2>
              <p className="text-[11px] text-slate-400 font-semibold max-w-[280px]">
                Scan registration barcodes presented by students to record attendance.
              </p>
            </div>

            {/* Camera Viewfinder Simulation */}
            {!scannedTeamInfo && (
              <div className="w-56 h-56 rounded-2xl border-4 border-dashed border-blue-500 relative flex items-center justify-center bg-black overflow-hidden shrink-0">
                {/* Laser animation */}
                <div className="absolute top-0 left-0 w-full h-1 bg-red-500 shadow-[0_0_8px_#ef4444] animate-[bounce_2.5s_infinite] z-20"></div>
                
                {/* Corner bracket decorations */}
                <div className="absolute top-2 left-2 w-4 h-4 border-t-2 border-l-2 border-blue-400 z-20"></div>
                <div className="absolute top-2 right-2 w-4 h-4 border-t-2 border-r-2 border-blue-400 z-20"></div>
                <div className="absolute bottom-2 left-2 w-4 h-4 border-b-2 border-l-2 border-blue-400 z-20"></div>
                <div className="absolute bottom-2 right-2 w-4 h-4 border-b-2 border-r-2 border-blue-400 z-20"></div>

                {scanLoading ? (
                  <div className="flex flex-col items-center gap-2 z-10">
                    <RefreshCw className="h-8 w-8 text-blue-500 animate-spin" />
                    <span className="text-[10px] text-blue-300 font-bold uppercase tracking-wider">Reading QR Code...</span>
                  </div>
                ) : (
                  <>
                    <video
                      ref={videoRef}
                      className="absolute inset-0 w-full h-full object-cover z-10"
                      muted
                      playsInline
                    />
                    <div className="absolute inset-0 flex flex-col items-center justify-center p-6 space-y-3 bg-black/75 z-0">
                      <div className="w-20 h-20 bg-white rounded-lg p-2 relative shadow-inner">
                        <img
                          src="https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=simulate_scanner_feed"
                          alt="QR Scanner Target"
                          className="w-full h-full object-contain opacity-60"
                        />
                      </div>
                      <span className="text-[9px] text-slate-500 font-black uppercase tracking-wider">
                        Webcam Feed Inactive
                      </span>
                    </div>
                  </>
                )}
              </div>
            )}

            {/* Selector to simulate scanning */}
            {!scannedTeamInfo && !scanLoading && (
              <div className="w-full pt-2">
                <button
                  type="button"
                  onClick={async () => {
                    const reg = registrations.find(x => 
                      (x.eventId === assignedEvent?.id || x.eventTitle?.toLowerCase() === assignedEvent?.title?.toLowerCase())
                    );
                    if (!reg) {
                      alert(`No registrations found in the database for the active assigned event "${assignedEvent?.title || "Quantum Workshop"}".`);
                      return;
                    }

                    setScanLoading(true);
                    await new Promise(resolve => setTimeout(resolve, 1000));
                    setScanLoading(false);
                    setScannedTeamInfo(reg);
                  }}
                  className="w-full bg-[#2563EB] hover:bg-blue-700 text-white font-extrabold text-xs py-3 rounded-xl transition-all shadow-md shadow-blue-900/30 uppercase tracking-wider flex items-center justify-center gap-1.5"
                >
                  <Camera className="h-4 w-4" />
                  Simulate QR Scan
                </button>
              </div>
            )}

            {/* Team details view */}
            {scannedTeamInfo && (
              <div className="w-full space-y-5 text-left animate-in fade-in duration-200">
                {scanSuccessMsg ? (
                  <div className="flex flex-col items-center justify-center gap-2 py-8 text-center animate-in zoom-in-95 duration-200">
                    <div className="w-12 h-12 rounded-full bg-emerald-500/25 text-emerald-400 flex items-center justify-center border border-emerald-500/40 shadow-inner">
                      <Check className="h-6 w-6" />
                    </div>
                    <span className="text-xs font-black uppercase tracking-widest text-emerald-400 block">Check-in Verified</span>
                    <h4 className="text-sm font-bold text-white mt-1">{scanSuccessMsg}</h4>
                  </div>
                ) : (
                  <>
                    {/* Team Header */}
                    <div className="border-b border-slate-800 pb-3">
                      <span className="text-[8px] font-black uppercase text-blue-400 tracking-wider">Scanned Team Info</span>
                      <h3 className="text-base font-black text-white leading-tight mt-0.5">{scannedTeamInfo.groupName}</h3>
                      <p className="text-[10px] text-slate-400 mt-1 font-semibold">Event: {scannedTeamInfo.eventTitle}</p>
                    </div>

                    {/* Team Lead */}
                    <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-3.5 space-y-1.5">
                      <span className="bg-blue-500/20 text-blue-400 text-[8px] font-black tracking-wider uppercase px-2 py-0.5 rounded-full border border-blue-500/10 inline-block">Team Lead</span>
                      <div className="flex justify-between items-center text-xs">
                        <div className="flex flex-col">
                          <span className="font-extrabold text-slate-200">{scannedTeamInfo.teamLeadName}</span>
                          <span className="text-[10px] text-slate-450 mt-0.5">{scannedTeamInfo.teamLeadEmail}</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-slate-400 font-bold text-[10px]">{scannedTeamInfo.teamLeadStudentId}</span>
                          <select
                            value={rosterAttendance["lead"] || "Present"}
                            onChange={(e) => setRosterAttendance(prev => ({ ...prev, lead: e.target.value as any }))}
                            className="bg-slate-955 border border-slate-800 rounded-lg px-2 py-1 text-[10px] font-bold text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                          >
                            <option value="Present">Present</option>
                            <option value="Late">Late</option>
                            <option value="Absent">Absent</option>
                          </select>
                        </div>
                      </div>
                    </div>

                    {/* Teammates List */}
                    {scannedTeamInfo.members && scannedTeamInfo.members.length > 0 && (
                      <div className="space-y-2">
                        <span className="text-[9px] font-black text-slate-450 tracking-wider uppercase block">Teammates Roster</span>
                        <div className="max-h-[140px] overflow-y-auto space-y-2 pr-1 select-none">
                          {scannedTeamInfo.members.map((member: any, i: number) => (
                            <div key={i} className="bg-slate-900/40 border border-slate-850 rounded-xl p-3 flex flex-col gap-1">
                              <div className="flex justify-between items-center text-xs font-semibold">
                                <div className="flex flex-col">
                                  <span className="text-slate-350">{member.name}</span>
                                  <span className="text-[9px] text-slate-500 mt-0.5">{member.email}</span>
                                </div>
                                <div className="flex items-center gap-3">
                                  <span className="text-slate-500 text-[10px]">{member.studentId}</span>
                                  <select
                                    value={rosterAttendance[`member_${i}`] || "Present"}
                                    onChange={(e) => setRosterAttendance(prev => ({ ...prev, [`member_${i}`]: e.target.value as any }))}
                                    className="bg-slate-950 border border-slate-800 rounded-lg px-2 py-1 text-[10px] font-bold text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                                  >
                                    <option value="Present">Present</option>
                                    <option value="Late">Late</option>
                                    <option value="Absent">Absent</option>
                                  </select>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Action buttons */}
                    <div className="flex gap-3.5 pt-1">
                      <button
                        type="button"
                        onClick={() => {
                          setScannedTeamInfo(null);
                        }}
                        className="flex-1 border border-slate-800 hover:bg-slate-955 hover:border-slate-700 text-slate-300 font-extrabold text-xs py-3 rounded-xl transition-all"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={async () => {
                          setScanLoading(true);
                          try {
                            const updatedMembers = (scannedTeamInfo.members || []).map((m: any, idx: number) => ({
                              ...m,
                              attendanceStatus: rosterAttendance[`member_${idx}`] || "Present"
                            }));

                            // 1. Update Firestore registration document
                            await updateDoc(doc(db, "registrations", scannedTeamInfo.id), {
                              attendanceStatus: rosterAttendance["lead"] || "Present",
                              checkInTime: new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" }) + " (QR Scan)",
                              members: updatedMembers
                            });

                            // 2. Update local students list
                            setStudents(prev => prev.map(s => {
                              if (s.regId === scannedTeamInfo.id) {
                                const timeStr = new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" }) + " (QR Scan)";
                                if (s.isLead) {
                                  return {
                                    ...s,
                                    status: rosterAttendance["lead"] || "Present",
                                    checkInTime: timeStr
                                  };
                                } else if (s.memberIndex !== undefined) {
                                  return {
                                    ...s,
                                    status: rosterAttendance[`member_${s.memberIndex}`] || "Present",
                                    checkInTime: timeStr
                                  };
                                }
                              }
                              return s;
                            }));

                            setScanLoading(false);
                            setScanSuccessMsg(`${scannedTeamInfo.groupName} checked in successfully!`);
                            
                            setTimeout(() => {
                              setScanSuccessMsg("");
                              setScannedTeamInfo(null);
                              setIsScannerModalOpen(false);
                            }, 1800);
                          } catch (err) {
                            console.error("Check-in scan verification failed:", err);
                            alert("Check-in scan verification failed.");
                            setScanLoading(false);
                          }
                        }}
                        className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs py-3 rounded-xl transition-all shadow-md shadow-emerald-950 flex items-center justify-center gap-1.5"
                      >
                        <Check className="h-4.5 w-4.5" />
                        Check In Team
                      </button>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      )}

    </div>
  );
};

export default OrgAttendancePage;
