import React, { useState, useMemo, useEffect } from "react";
import SEO from "../../components/layout/SEO";
import { db } from "../../config/firebase";
import { collection, doc, getDocs, addDoc, deleteDoc, getDoc, setDoc } from "firebase/firestore";
import { 
  Calendar, 
  Users, 
  TrendingUp, 
  Clock, 
  Plus, 
  SlidersHorizontal, 
  Download, 
  HelpCircle, 
  Search, 
  ChevronLeft, 
  ChevronRight, 
  MapPin,
  Trash2,
  Upload,
  Info,
  Settings2,
  Pencil,
  CheckSquare,
  MessageSquare
} from "lucide-react";

// Import local assets
import sparkImg from "../../assets/images/spark.png";
import hackathonImg from "../../assets/images/hackathon.png";
import seminarImg from "../../assets/images/seminar.png";

interface EventItem {
  id: string;
  title: string;
  date: string;
  location: string;
  category: "HACKATHONS" | "LECTURES" | "WORKSHOPS";
  status: "Draft" | "Active" | "Opened";
  currentReg: number;
  maxReg: number;
  image?: string;
}

const EventManagementPage: React.FC = () => {
  const [events, setEvents] = useState<EventItem[]>([]);
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const speakerFileInputRef = React.useRef<HTMLInputElement>(null);

  const handleSpeakerFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setFormSpeakerImageFilename(file.name);
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormSpeakerImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setFormPosterFilename(file.name);
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormPosterPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  // Fetch events from Firestore on mount
  useEffect(() => {
    const loadEvents = async () => {
      try {
        const querySnapshot = await getDocs(collection(db, "events"));
        const list: EventItem[] = [];
        querySnapshot.forEach((doc) => {
          const data = doc.data();
          let image = sparkImg;
          if (data.posterPreview) {
            image = data.posterPreview;
          } else if (data.imageName === "hackathonImg" || data.category === "HACKATHONS") {
            image = hackathonImg;
          } else if (data.imageName === "seminarImg" || data.category === "LECTURES") {
            image = seminarImg;
          }

          list.push({
            id: doc.id,
            title: data.title || "",
            date: data.date || data.startDate || "",
            location: data.location || "",
            category: data.category || "WORKSHOPS",
            status: data.status || "Draft",
            currentReg: Math.max(0, Number(data.currentReg) || 0),
            maxReg: data.maxReg || 100,
            image: image
          });
        });
        setEvents(list);
      } catch (err) {
        console.error("Error reading events from Firestore:", err);
      }
    };

    loadEvents();
  }, []);

  // States
  const [searchQuery, setSearchQuery] = useState("");
  const [view, setView] = useState<"list" | "create">("list");
  const [isSupportModalOpen, setIsSupportModalOpen] = useState(false);
  const [editingEventId, setEditingEventId] = useState<string | null>(null);

  // New Detailed Event Form State
  const [formTitle, setFormTitle] = useState("");
  const [formCategory, setFormCategory] = useState<"Workshop" | "Hackathon" | "Seminar">("Workshop");
  const [formPrimaryTag, setFormPrimaryTag] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formStartDate, setFormStartDate] = useState("");
  const [formEndDate, setFormEndDate] = useState("");
  const [formStartTime, setFormStartTime] = useState("");
  const [formEndTime, setFormEndTime] = useState("");
  const [formIsVirtual, setFormIsVirtual] = useState(true);
  const [formLocation, setFormLocation] = useState("");
  const [formRegDeadline, setFormRegDeadline] = useState("");
  const [formMaxParticipants, setFormMaxParticipants] = useState("");
  const [formEnableWaitlist, setFormEnableWaitlist] = useState(false);
  const [formMinTeamSize, setFormMinTeamSize] = useState("1");
  const [formMaxTeamSize, setFormMaxTeamSize] = useState("4");
  const [formRegistrationFee, setFormRegistrationFee] = useState("0");
  const [formPosterFilename, setFormPosterFilename] = useState("");
  const [formWhatsGroupLink, setFormWhatsGroupLink] = useState("");
  const [formPosterPreview, setFormPosterPreview] = useState("");
  const [formVisibility, setFormVisibility] = useState<"Public" | "Internal Only">("Public");

  const [formSpeakerName, setFormSpeakerName] = useState("");
  const [formSpeakerRole, setFormSpeakerRole] = useState("");
  const [formSpeakerBio, setFormSpeakerBio] = useState("");
  const [formSpeakerLinkedin, setFormSpeakerLinkedin] = useState("");
  const [formSpeakerTwitter, setFormSpeakerTwitter] = useState("");
  const [formSpeakerImageFilename, setFormSpeakerImageFilename] = useState("");
  const [formSpeakerImagePreview, setFormSpeakerImagePreview] = useState("");

  // Agenda States
  const [formAgendaItems, setFormAgendaItems] = useState<any[]>([
    { time: "09:00 AM - 10:30 AM", title: "Morning Keynote: The Future of Compute", description: "Opening session detailing next-gen silicon compute." },
    { time: "11:30 AM - 01:00 PM", title: "Workshop: Transformer Efficiency", description: "Hands-on FlashAttention, quantization, and sparse computation models." },
    { time: "03:00 PM - 04:30 PM", title: "Panel: Ethical Scaling", description: "A roundtable discussion with industry leaders on model deployment." }
  ]);
  const [formIsFeatured, setFormIsFeatured] = useState(false);
  const [formSendEmail, setFormSendEmail] = useState(true);
  const [formStatus, setFormStatus] = useState<"Draft" | "Active" | "Opened">("Draft");

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 3;

  // Filter logic
  const filteredEvents = useMemo(() => {
    return events.filter(e => 
      e.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      e.location.toLowerCase().includes(searchQuery.toLowerCase()) ||
      e.category.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [events, searchQuery]);

  const paginatedEvents = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredEvents.slice(start, start + itemsPerPage);
  }, [filteredEvents, currentPage]);

  const totalPages = Math.ceil(filteredEvents.length / itemsPerPage) || 1;

  // Handlers
  const handleCreateEvent = async (e: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!formTitle) {
      alert("Event Name is required!");
      return;
    }

    const mappedCategory = formCategory === "Workshop" ? "WORKSHOPS" : formCategory === "Hackathon" ? "HACKATHONS" : "LECTURES";

    let imageName = "sparkImg";
    let imageFile = sparkImg;
    if (mappedCategory === "HACKATHONS") {
      imageName = "hackathonImg";
      imageFile = hackathonImg;
    } else if (mappedCategory === "LECTURES") {
      imageName = "seminarImg";
      imageFile = seminarImg;
    }

    let displayDate = "TBD";
    if (formStartDate) {
      const d = new Date(formStartDate);
      if (!isNaN(d.getTime())) {
        displayDate = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      } else {
        displayDate = formStartDate;
      }
    }

    const payload = {
      title: formTitle,
      date: displayDate,
      location: formLocation || "Virtual Hub",
      category: mappedCategory,
      currentReg: 0,
      maxReg: formMaxParticipants ? Number(formMaxParticipants) : 100,
      imageName: imageName,
      primaryTag: formPrimaryTag,
      description: formDescription,
      startDate: formStartDate,
      endDate: formEndDate,
      startTime: formStartTime,
      endTime: formEndTime,
      isVirtual: formIsVirtual,
      regDeadline: formRegDeadline,
      enableWaitlist: formEnableWaitlist,
      posterFilename: formPosterFilename,
      posterPreview: formPosterPreview,
      visibility: formVisibility,
      isFeatured: formIsFeatured,
      sendEmail: formSendEmail,
      speakerName: formSpeakerName,
      speakerRole: formSpeakerRole,
      speakerBio: formSpeakerBio,
      speakerLinkedin: formSpeakerLinkedin,
      speakerTwitter: formSpeakerTwitter,
      speakerImagePreview: formSpeakerImagePreview,
      agendaItems: formAgendaItems,
      agendaTime1: formAgendaItems[0]?.time || "",
      agendaTitle1: formAgendaItems[0]?.title || "",
      agendaDesc1: formAgendaItems[0]?.description || "",
      agendaTime2: formAgendaItems[1]?.time || "",
      agendaTitle2: formAgendaItems[1]?.title || "",
      agendaDesc2: formAgendaItems[1]?.description || "",
      agendaTime3: formAgendaItems[2]?.time || "",
      agendaTitle3: formAgendaItems[2]?.title || "",
      agendaDesc3: formAgendaItems[2]?.description || "",
      minTeamSize: formMinTeamSize ? Number(formMinTeamSize) : 1,
      maxTeamSize: formMaxTeamSize ? Number(formMaxTeamSize) : 4,
      registrationFee: formRegistrationFee ? Number(formRegistrationFee) : 0,
      status: formStatus,
      whatsGroupLink: formWhatsGroupLink,
      createdAt: Date.now()
    };

    try {
      if (editingEventId) {
        await setDoc(doc(db, "events", editingEventId), payload, { merge: true });
        const updatedEvent: EventItem = {
          id: editingEventId,
          title: formTitle,
          date: displayDate,
          location: formLocation || "Virtual Hub",
          category: mappedCategory,
          status: formStatus,
          currentReg: 0,
          maxReg: formMaxParticipants ? Number(formMaxParticipants) : 100,
          image: formPosterPreview || imageFile
        };
        setEvents(prev => prev.map(e => e.id === editingEventId ? { ...e, ...updatedEvent } : e));
        setEditingEventId(null);
      } else {
        const docRef = await addDoc(collection(db, "events"), payload);
        const newEvent: EventItem = {
          id: docRef.id,
          title: formTitle,
          date: displayDate,
          location: formLocation || "Virtual Hub",
          category: mappedCategory,
          status: formStatus,
          currentReg: 0,
          maxReg: formMaxParticipants ? Number(formMaxParticipants) : 100,
          image: formPosterPreview || imageFile
        };
        setEvents(prev => [newEvent, ...prev]);
      }
      
      // Reset form fields
      setFormTitle("");
      setFormCategory("Workshop");
      setFormPrimaryTag("");
      setFormDescription("");
      setFormStartDate("");
      setFormEndDate("");
      setFormStartTime("");
      setFormEndTime("");
      setFormIsVirtual(true);
      setFormLocation("");
      setFormRegDeadline("");
      setFormMaxParticipants("");
      setFormEnableWaitlist(false);
      setFormPosterFilename("");
      setFormPosterPreview("");
      setFormVisibility("Public");
      setFormIsFeatured(false);
      setFormSendEmail(true);
      setFormStatus("Draft");
      setFormMinTeamSize("1");
      setFormMaxTeamSize("4");
      setFormRegistrationFee("0");
      setFormWhatsGroupLink("");

      setFormSpeakerName("");
      setFormSpeakerRole("");
      setFormSpeakerBio("");
      setFormSpeakerLinkedin("");
      setFormSpeakerTwitter("");
      setFormSpeakerImageFilename("");
      setFormSpeakerImagePreview("");
      setFormAgendaItems([
        { time: "09:00 AM - 10:30 AM", title: "Morning Keynote: The Future of Compute", description: "Opening session detailing next-gen silicon compute." },
        { time: "11:30 AM - 01:00 PM", title: "Workshop: Transformer Efficiency", description: "Hands-on FlashAttention, quantization, and sparse computation models." },
        { time: "03:00 PM - 04:30 PM", title: "Panel: Ethical Scaling", description: "A roundtable discussion with industry leaders on model deployment." }
      ]);
      
      setView("list");
    } catch (err) {
      console.error("Error saving event to Firestore:", err);
      alert("Failed to save event to database.");
    }
  };

  const handleDeleteEvent = async (id: string, title: string) => {
    if (confirm(`Are you sure you want to delete the event "${title}"?`)) {
      try {
        const docRef = doc(db, "events", id);
        await deleteDoc(docRef);
        setEvents(prev => prev.filter(e => e.id !== id));
      } catch (err) {
        console.error("Error deleting event from Firestore:", err);
        alert("Failed to delete event from database.");
      }
    }
  };

  const handleStartEditEvent = async (id: string) => {
    try {
      const docRef = doc(db, "events", id);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        const data = docSnap.data();
        setEditingEventId(id);
        
        setFormTitle(data.title || "");
        
        let cat: "Workshop" | "Hackathon" | "Seminar" = "Workshop";
        if (data.category === "HACKATHONS") cat = "Hackathon";
        else if (data.category === "LECTURES") cat = "Seminar";
        setFormCategory(cat);
        
        setFormPrimaryTag(data.primaryTag || "");
        setFormDescription(data.description || "");
        setFormStartDate(data.startDate || "");
        setFormEndDate(data.endDate || "");
        setFormStartTime(data.startTime || "");
        setFormEndTime(data.endTime || "");
        setFormIsVirtual(data.isVirtual !== undefined ? data.isVirtual : true);
        setFormLocation(data.location || "");
        setFormRegDeadline(data.regDeadline || "");
        setFormMaxParticipants(data.maxReg ? String(data.maxReg) : "");
        setFormEnableWaitlist(data.enableWaitlist || false);
        setFormPosterFilename(data.posterFilename || "");
        setFormPosterPreview(data.posterPreview || "");
        setFormVisibility(data.visibility || "Public");
        setFormIsFeatured(data.isFeatured || false);
        setFormSendEmail(data.sendEmail !== undefined ? data.sendEmail : true);
        setFormStatus(data.status || "Draft");
        setFormMinTeamSize(data.minTeamSize ? String(data.minTeamSize) : "1");
        setFormMaxTeamSize(data.maxTeamSize ? String(data.maxTeamSize) : "4");
        setFormRegistrationFee(data.registrationFee !== undefined ? String(data.registrationFee) : "0");
        setFormWhatsGroupLink(data.whatsGroupLink || "");
        
        setFormSpeakerName(data.speakerName || "");
        setFormSpeakerRole(data.speakerRole || "");
        setFormSpeakerBio(data.speakerBio || "");
        setFormSpeakerLinkedin(data.speakerLinkedin || "");
        setFormSpeakerTwitter(data.speakerTwitter || "");
        setFormSpeakerImageFilename(data.speakerImageFilename || "");
        setFormSpeakerImagePreview(data.speakerImagePreview || "");
        
        if (data.agendaItems && Array.isArray(data.agendaItems)) {
          setFormAgendaItems(data.agendaItems);
        } else {
          setFormAgendaItems([
            { time: data.agendaTime1 || "09:00 AM - 10:30 AM", title: data.agendaTitle1 || "Morning Keynote: The Future of Compute", description: data.agendaDesc1 || "Opening session detailing next-gen silicon compute." },
            { time: data.agendaTime2 || "11:30 AM - 01:00 PM", title: data.agendaTitle2 || "Workshop: Transformer Efficiency", description: data.agendaDesc2 || "Hands-on FlashAttention, quantization, and sparse computation models." },
            { time: data.agendaTime3 || "03:00 PM - 04:30 PM", title: data.agendaTitle3 || "Panel: Ethical Scaling", description: data.agendaDesc3 || "A roundtable discussion with industry leaders on model deployment." }
          ]);
        }
        
        setView("create");
      } else {
        alert("Could not load event data.");
      }
    } catch (err) {
      console.error("Error loading event for editing:", err);
      alert("Error fetching event details.");
    }
  };

  const handleStatusChange = async (id: string, newStatus: "Draft" | "Active" | "Opened") => {
    try {
      const docRef = doc(db, "events", id);
      await setDoc(docRef, { status: newStatus }, { merge: true });
      setEvents(prev => prev.map(e => e.id === id ? { ...e, status: newStatus } : e));
    } catch (err) {
      console.error("Error updating status:", err);
      alert("Failed to update status.");
    }
  };



  const handleNextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1);
    }
  };

  const handlePrevPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };

  return (
    <div className="space-y-8 pb-12 font-sans">
      <SEO 
        title="Event Management - Faculty Portal" 
        description="Control center for all faculty-led academic activities, workshop tracking and hackathon registrations."
      />

      {view === "list" && (
        <>
          {/* ================= HEADER ================= */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 text-left">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-800 tracking-tight">Event Management</h1>
          <p className="text-slate-500 text-xs sm:text-sm mt-1 max-w-2xl font-medium leading-relaxed">
            Control center for all faculty-led academic activities.
          </p>
        </div>

        <div className="flex items-center gap-3 self-start md:self-center">
          <button
            onClick={() => alert("Exporting event records...")}
            className="flex items-center gap-2 justify-center px-4 py-2 border border-slate-200 text-slate-650 font-bold rounded-2xl hover:bg-slate-50 transition-all text-xs whitespace-nowrap bg-white"
          >
            <Download className="h-4 w-4" />
            Export
          </button>
          <button
            onClick={() => {
              setEditingEventId(null);
              setFormTitle("");
              setFormCategory("Workshop");
              setFormPrimaryTag("");
              setFormDescription("");
              setFormStartDate("");
              setFormEndDate("");
              setFormStartTime("");
              setFormEndTime("");
              setFormIsVirtual(true);
              setFormLocation("");
              setFormRegDeadline("");
              setFormMaxParticipants("");
              setFormEnableWaitlist(false);
              setFormPosterFilename("");
              setFormPosterPreview("");
              setFormVisibility("Public");
              setFormIsFeatured(false);
              setFormSendEmail(true);
              setFormStatus("Draft");
              setFormMinTeamSize("1");
              setFormMaxTeamSize("4");
              setFormRegistrationFee("0");

              setFormSpeakerName("");
              setFormSpeakerRole("");
              setFormSpeakerBio("");
              setFormSpeakerLinkedin("");
              setFormSpeakerTwitter("");
              setFormSpeakerImageFilename("");
              setFormSpeakerImagePreview("");
              setFormAgendaItems([
                { time: "09:00 AM - 10:30 AM", title: "Morning Keynote: The Future of Compute", description: "Opening session detailing next-gen silicon compute." },
                { time: "11:30 AM - 01:00 PM", title: "Workshop: Transformer Efficiency", description: "Hands-on FlashAttention, quantization, and sparse computation models." },
                { time: "03:00 PM - 04:30 PM", title: "Panel: Ethical Scaling", description: "A roundtable discussion with industry leaders on model deployment." }
              ]);
              setView("create");
            }}
            className="flex items-center gap-2 justify-center px-4 py-2 bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-bold rounded-2xl shadow-md shadow-blue-600/10 hover:shadow-lg transition-all text-xs whitespace-nowrap"
          >
            <Plus className="h-4 w-4" />
            Create New Event
          </button>
        </div>
      </div>

      {/* ================= METRICS CARDS ================= */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Events */}
        <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-[0_8px_30px_rgba(0,0,0,0.015)] flex flex-col justify-between text-left group hover:shadow-md transition-all duration-300">
          <div>
            <div className="flex justify-between items-start">
              <div className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600 shadow-inner">
                <Calendar className="h-4.5 w-4.5" />
              </div>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-600 border border-emerald-100 flex items-center gap-0.5">
                +12.5%
              </span>
            </div>
            <div className="mt-3">
              <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Total Events</span>
              <h3 className="text-2xl font-extrabold text-slate-800 tracking-tight mt-1">{events.length}</h3>
            </div>
          </div>
          {/* Sparkline chart bar visual */}
          <div className="flex items-end gap-1 h-6 mt-4 opacity-80">
            <div className="bg-blue-100/50 w-full h-2 rounded-sm"></div>
            <div className="bg-blue-100/50 w-full h-3 rounded-sm"></div>
            <div className="bg-blue-100/50 w-full h-2.5 rounded-sm"></div>
            <div className="bg-blue-200/60 w-full h-4 rounded-sm"></div>
            <div className="bg-[#2563EB] w-full h-6 rounded-sm"></div>
          </div>
        </div>

        {/* Registrations */}
        <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-[0_8px_30px_rgba(0,0,0,0.015)] flex flex-col justify-between text-left group hover:shadow-md transition-all duration-300">
          <div>
            <div className="flex justify-between items-start">
              <div className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600 shadow-inner">
                <Users className="h-4.5 w-4.5" />
              </div>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-600 border border-emerald-100 flex items-center gap-0.5">
                +8.2%
              </span>
            </div>
            <div className="mt-3">
              <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Registrations</span>
              <h3 className="text-2xl font-extrabold text-slate-800 tracking-tight mt-1">
                {events.reduce((sum, e) => sum + (e.currentReg || 0), 0).toLocaleString()}
              </h3>
            </div>
          </div>
          {/* Sparkline chart bar visual */}
          <div className="flex items-end gap-1 h-6 mt-4 opacity-80">
            <div className="bg-sky-100/50 w-full h-1.5 rounded-sm"></div>
            <div className="bg-sky-100/50 w-full h-2 rounded-sm"></div>
            <div className="bg-sky-200/50 w-full h-4 rounded-sm"></div>
            <div className="bg-sky-300/60 w-full h-3.5 rounded-sm"></div>
            <div className="bg-sky-400 w-full h-5.5 rounded-sm"></div>
          </div>
        </div>

        {/* Avg. Attendance */}
        <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-[0_8px_30px_rgba(0,0,0,0.015)] flex flex-col justify-between text-left group hover:shadow-md transition-all duration-300">
          <div>
            <div className="flex justify-between items-start">
              <div className="w-9 h-9 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600 shadow-inner">
                <TrendingUp className="h-4.5 w-4.5" />
              </div>
              <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-600 border border-emerald-100/30">
                High
              </span>
            </div>
            <div className="mt-3">
              <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Avg. Attendance</span>
              <h3 className="text-2xl font-extrabold text-slate-800 tracking-tight mt-1">94%</h3>
            </div>
          </div>
          <div className="mt-4 space-y-1">
            <div className="w-full bg-slate-100 rounded-full h-1.5">
              <div className="bg-emerald-500 h-1.5 rounded-full" style={{ width: "94%" }}></div>
            </div>
            <div className="text-[9px] text-slate-400 font-bold">Target reached: 90%</div>
          </div>
        </div>

        {/* Weekly Sessions */}
        <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-[0_8px_30px_rgba(0,0,0,0.015)] flex flex-col justify-between text-left group hover:shadow-md transition-all duration-300">
          <div>
            <div className="flex justify-between items-start">
              <div className="w-9 h-9 rounded-xl bg-amber-50 flex items-center justify-center text-amber-600 shadow-inner">
                <Clock className="h-4.5 w-4.5" />
              </div>
              <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-[#FEF3C7] text-[#D97706]">
                Steady
              </span>
            </div>
            <div className="mt-3">
              <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Weekly Sessions</span>
              <h3 className="text-2xl font-extrabold text-slate-800 tracking-tight mt-1">
                {String(events.filter(e => e.status === "Opened" || e.status === "Active").length).padStart(2, '0')}
              </h3>
            </div>
          </div>
          <div className="mt-4 text-[9px] text-slate-500 font-bold flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
            {events.filter(e => e.status === "Opened" || e.status === "Active").length} Scheduled for this week
          </div>
        </div>
      </div>

      {/* ================= CONTENT GRID ================= */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* LEFT COLUMN: Event Directory (100% / 12 grid cols) */}
        <div className="lg:col-span-12 space-y-6">
          <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden text-left">
            {/* Header / Filter row */}
            <div className="p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <h3 className="text-base font-bold text-slate-800 tracking-tight">Event Directory</h3>
              
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <div className="relative flex-1 sm:w-60">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search events..."
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value);
                      setCurrentPage(1);
                    }}
                    className="w-full pl-10 pr-4 py-1.5 bg-slate-50 border border-slate-200/80 rounded-xl text-slate-700 placeholder-slate-400 text-xs focus:outline-none focus:border-blue-500 focus:bg-white transition-all font-medium"
                  />
                </div>
                <button className="p-2 border border-slate-200 rounded-xl bg-white hover:bg-slate-50 text-slate-500 transition-colors">
                  <SlidersHorizontal className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Table Container */}
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-100 text-[10px] font-black uppercase text-slate-400 tracking-wider">
                    <th className="px-6 py-4">Event Details</th>
                    <th className="px-6 py-4">Category</th>
                    <th className="px-6 py-4">Status</th>
                    <th className="px-6 py-4">Progress</th>
                    <th className="px-6 py-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedEvents.length > 0 ? (
                    paginatedEvents.map((event) => {
                      const progressPercent = Math.min(100, Math.round(((event.currentReg || 0) / (event.maxReg || 50)) * 100));
                      return (
                        <tr 
                          key={event.id} 
                          className="border-b border-slate-150/40 hover:bg-slate-50/50 transition-colors group/row"
                        >
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <div className="w-12 h-12 rounded-xl bg-slate-55 overflow-hidden shrink-0 border border-slate-100 flex items-center justify-center">
                                <img
                                  src={event.image || sparkImg}
                                  alt={event.title}
                                  className="w-full h-full object-cover"
                                  onError={(e) => {
                                    (e.target as HTMLImageElement).src = sparkImg;
                                  }}
                                />
                              </div>
                              <div className="leading-tight">
                                <span className="font-extrabold text-slate-800 text-xs line-clamp-1">
                                  {event.title}
                                </span>
                                <div className="flex items-center gap-x-2 gap-y-0.5 mt-1.5 flex-wrap text-[9px] font-bold text-slate-450">
                                  <span className="flex items-center gap-1">
                                    <Calendar className="h-3 w-3 text-blue-500" />
                                    {event.date}
                                  </span>
                                  <span>•</span>
                                  <span className="flex items-center gap-1">
                                    <MapPin className="h-3 w-3 text-sky-500" />
                                    {event.location}
                                  </span>
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <span className={`px-2.5 py-1 rounded-full text-[9px] font-black tracking-widest uppercase border
                              ${event.category === "HACKATHONS" 
                                ? "bg-rose-50 text-rose-600 border-rose-100/50" 
                                : event.category === "LECTURES"
                                  ? "bg-amber-50 text-amber-600 border-amber-100/50"
                                  : "bg-blue-50 text-[#2563EB] border-blue-100/50"
                              }`}
                            >
                              {event.category || "WORKSHOPS"}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <select
                              value={event.status}
                              onChange={(e) => handleStatusChange(event.id, e.target.value as any)}
                              className={`px-2 py-0.5 rounded-full text-[9px] font-extrabold border bg-white focus:outline-none cursor-pointer tracking-wider uppercase
                                ${event.status === "Opened"
                                  ? "text-emerald-650 bg-emerald-50 border-emerald-100"
                                  : event.status === "Active"
                                    ? "text-[#2563EB] bg-blue-50 border-blue-100"
                                    : "text-slate-500 bg-slate-50 border-slate-200/60"
                                }`}
                            >
                              <option value="Draft">Draft</option>
                              <option value="Active">Active</option>
                              <option value="Opened">Opened</option>
                            </select>
                          </td>
                          <td className="px-6 py-4 w-44">
                            <div className="space-y-1.5">
                              <div className="flex justify-between items-center text-[9px] font-bold text-slate-400">
                                <span>{event.currentReg || 0} / {event.maxReg || 50}</span>
                                <span>{progressPercent}%</span>
                              </div>
                              <div className="w-full bg-slate-100 rounded-full h-1">
                                <div 
                                  className="bg-[#2563EB] h-1 rounded-full" 
                                  style={{ width: `${progressPercent}%` }}
                                ></div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-right">
                            <button
                              onClick={() => handleStartEditEvent(event.id)}
                              className="p-1.5 text-slate-400 hover:text-[#2563EB] hover:bg-blue-50 rounded-xl transition-all mr-1.5"
                              title="Edit Event"
                            >
                              <Pencil className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => handleDeleteEvent(event.id, event.title)}
                              className="p-1.5 text-slate-400 hover:text-red-650 hover:bg-red-50 rounded-xl transition-all"
                              title="Delete Event"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={5} className="px-6 py-10 text-center text-xs font-semibold text-slate-400">
                        No events found matching search query.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="p-4 border-t border-slate-150/50 bg-slate-50/40 flex items-center justify-end gap-2">
              <button
                onClick={handlePrevPage}
                disabled={currentPage === 1}
                className="p-1.5 border border-slate-200 rounded-lg bg-white text-slate-650 font-bold hover:bg-slate-50 transition-all disabled:opacity-40"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                onClick={handleNextPage}
                disabled={currentPage === totalPages}
                className="p-1.5 border border-slate-200 rounded-lg bg-white text-slate-655 font-bold hover:bg-slate-50 transition-all disabled:opacity-40"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>

      </div>
      </>
      )}
      {/* ================= CREATE EVENT FULL PAGE FORM ================= */}
      {view === "create" && (
        <div className="space-y-6 pb-12 text-left font-sans animate-in fade-in duration-200">
          <SEO 
            title="Create New Event - Faculty Portal" 
            description="Design and publish a new club activity, guest lecture, or student hackathon."
          />

          {/* BREADCRUMB & HEADER BAR */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-5">
            <div>
              <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                <span>Dashboard</span>
                <span>&gt;</span>
                <span>Events</span>
                <span>&gt;</span>
                <span className="text-[#2563EB]">{editingEventId ? "Edit" : "Create"}</span>
              </div>
              <h1 className="text-3xl font-extrabold text-slate-800 tracking-tight">{editingEventId ? "Edit Event" : "Create New Event"}</h1>
            </div>

            <div className="flex items-center gap-3 self-start md:self-center">
              <button
                type="button"
                onClick={() => {
                  setEditingEventId(null);
                  setView("list");
                }}
                className="px-5 py-2.5 border border-slate-200 text-slate-650 font-bold rounded-2xl hover:bg-slate-50 transition-all text-xs bg-white"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateEvent}
                className="px-5 py-2.5 bg-[#2563EB] hover:bg-blue-700 text-white font-bold rounded-2xl shadow-md shadow-blue-600/10 hover:shadow-lg transition-all text-xs"
              >
                {editingEventId ? "Save Changes" : "Publish Event"}
              </button>
            </div>
          </div>

          {/* TWO-COLUMN GRID */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
            {/* Left Panel: Form Input Fields (span 2) */}
            <div className="lg:col-span-2 space-y-6">
              
              {/* 1. Basic Information */}
              <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-[0_8px_30px_rgba(0,0,0,0.015)] space-y-4">
                <h3 className="text-sm font-bold text-slate-800 tracking-tight border-b border-slate-50 pb-3 flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-blue-50 flex items-center justify-center text-[#2563EB]">
                    <Info className="h-4 w-4" />
                  </div>
                  Basic Information
                </h3>
                
                <div className="space-y-3">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Event Title</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. AI Ethics & The Future Workshop"
                      value={formTitle}
                      onChange={(e) => setFormTitle(e.target.value)}
                      className="w-full px-4 py-2.5 border border-slate-200 rounded-2xl focus:outline-none focus:border-blue-500 font-medium text-sm text-slate-850 bg-slate-50/30 focus:bg-white transition-all"
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Category</label>
                      <select
                        value={formCategory}
                        onChange={(e) => setFormCategory(e.target.value as any)}
                        className="w-full px-4 py-2.5 border border-slate-200 rounded-2xl focus:outline-none focus:border-blue-500 font-medium text-sm text-slate-800 bg-slate-50/30 focus:bg-white transition-all cursor-pointer"
                      >
                        <option value="Workshop">Workshop</option>
                        <option value="Hackathon">Hackathon</option>
                        <option value="Seminar">Seminar</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Primary Tag</label>
                      <input
                        type="text"
                        placeholder="e.g. Artificial Intelligence"
                        value={formPrimaryTag}
                        onChange={(e) => setFormPrimaryTag(e.target.value)}
                        className="w-full px-4 py-2.5 border border-slate-200 rounded-2xl focus:outline-none focus:border-blue-500 font-medium text-sm text-slate-850 bg-slate-50/30 focus:bg-white transition-all"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Short Description</label>
                    <textarea
                      rows={4}
                      placeholder="A brief summary that will appear on the event list..."
                      value={formDescription}
                      onChange={(e) => setFormDescription(e.target.value)}
                      className="w-full px-4 py-2.5 border border-slate-200 rounded-2xl focus:outline-none focus:border-blue-500 font-medium text-sm text-slate-850 bg-slate-50/30 focus:bg-white transition-all resize-none"
                    />
                  </div>
                </div>
              </div>

              {/* 2. Date & Time */}
              <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-[0_8px_30px_rgba(0,0,0,0.015)] space-y-4">
                <h3 className="text-sm font-bold text-slate-800 tracking-tight border-b border-slate-50 pb-3 flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-blue-50 flex items-center justify-center text-[#2563EB]">
                    <Calendar className="h-4 w-4" />
                  </div>
                  Date & Time
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Start Date</label>
                    <input
                      type="date"
                      value={formStartDate}
                      onChange={(e) => setFormStartDate(e.target.value)}
                      className="w-full px-4 py-2.5 border border-slate-200 rounded-2xl focus:outline-none focus:border-blue-500 font-medium text-sm text-slate-800 bg-slate-50/30 focus:bg-white transition-all"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">End Date</label>
                    <input
                      type="date"
                      value={formEndDate}
                      onChange={(e) => setFormEndDate(e.target.value)}
                      className="w-full px-4 py-2.5 border border-slate-200 rounded-2xl focus:outline-none focus:border-blue-500 font-medium text-sm text-slate-800 bg-slate-50/30 focus:bg-white transition-all"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Start Time</label>
                    <input
                      type="time"
                      value={formStartTime}
                      onChange={(e) => setFormStartTime(e.target.value)}
                      className="w-full px-4 py-2.5 border border-slate-200 rounded-2xl focus:outline-none focus:border-blue-500 font-medium text-sm text-slate-800 bg-slate-50/30 focus:bg-white transition-all"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">End Time</label>
                    <input
                      type="time"
                      value={formEndTime}
                      onChange={(e) => setFormEndTime(e.target.value)}
                      className="w-full px-4 py-2.5 border border-slate-200 rounded-2xl focus:outline-none focus:border-blue-500 font-medium text-sm text-slate-800 bg-slate-50/30 focus:bg-white transition-all"
                    />
                  </div>
                </div>
              </div>

              {/* 3. Location */}
              <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-[0_8px_30px_rgba(0,0,0,0.015)] space-y-4">
                <div className="flex items-center justify-between border-b border-slate-50 pb-3">
                  <h3 className="text-sm font-bold text-slate-800 tracking-tight flex items-center gap-2">
                    <div className="w-8 h-8 rounded-xl bg-blue-50 flex items-center justify-center text-[#2563EB]">
                      <MapPin className="h-4 w-4" />
                    </div>
                    Location
                  </h3>
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-bold text-slate-500">Virtual Event</span>
                    <button
                      type="button"
                      onClick={() => setFormIsVirtual(!formIsVirtual)}
                      className={`w-9 h-5 rounded-full transition-colors relative flex items-center px-0.5 shrink-0 ${formIsVirtual ? "bg-[#2563EB]" : "bg-slate-200"}`}
                    >
                      <div 
                        className={`w-4 h-4 rounded-full bg-white shadow transition-all duration-200 transform ${formIsVirtual ? "translate-x-4" : "translate-x-0"}`}
                      />
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Venue / Platform Link</label>
                  <input
                    type="text"
                    placeholder="e.g. Main Auditorium or Zoom Link"
                    value={formLocation}
                    onChange={(e) => setFormLocation(e.target.value)}
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-2xl focus:outline-none focus:border-blue-500 font-medium text-sm text-slate-850 bg-slate-50/30 focus:bg-white transition-all"
                  />
                </div>
              </div>

              {/* 4. Registration Details */}
              <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-[0_8px_30px_rgba(0,0,0,0.015)] space-y-4">
                <h3 className="text-sm font-bold text-slate-800 tracking-tight border-b border-slate-50 pb-3 flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-blue-50 flex items-center justify-center text-[#2563EB]">
                    <SlidersHorizontal className="h-4 w-4" />
                  </div>
                  Registration Details
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Registration Deadline</label>
                    <input
                      type="date"
                      value={formRegDeadline}
                      onChange={(e) => setFormRegDeadline(e.target.value)}
                      className="w-full px-4 py-2.5 border border-slate-200 rounded-2xl focus:outline-none focus:border-blue-500 font-medium text-sm text-slate-800 bg-slate-50/30 focus:bg-white transition-all"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Max Participants</label>
                    <input
                      type="number"
                      placeholder="0 for unlimited"
                      value={formMaxParticipants}
                      onChange={(e) => setFormMaxParticipants(e.target.value)}
                      className="w-full px-4 py-2.5 border border-slate-200 rounded-2xl focus:outline-none focus:border-blue-500 font-medium text-sm text-slate-800 bg-slate-50/30 focus:bg-white transition-all"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Min Team Size</label>
                    <input
                      type="number"
                      placeholder="e.g. 1"
                      value={formMinTeamSize}
                      onChange={(e) => setFormMinTeamSize(e.target.value)}
                      className="w-full px-4 py-2.5 border border-slate-200 rounded-2xl focus:outline-none focus:border-blue-500 font-medium text-sm text-slate-800 bg-slate-50/30 focus:bg-white transition-all"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Max Team Size</label>
                    <input
                      type="number"
                      placeholder="e.g. 4"
                      value={formMaxTeamSize}
                      onChange={(e) => setFormMaxTeamSize(e.target.value)}
                      className="w-full px-4 py-2.5 border border-slate-200 rounded-2xl focus:outline-none focus:border-blue-500 font-medium text-sm text-slate-800 bg-slate-50/30 focus:bg-white transition-all"
                    />
                  </div>
                </div>

                <div className="mt-3">
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Registration Fee ($)</label>
                  <input
                    type="number"
                    placeholder="0 for Free"
                    value={formRegistrationFee}
                    onChange={(e) => setFormRegistrationFee(e.target.value)}
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-2xl focus:outline-none focus:border-blue-500 font-medium text-sm text-slate-800 bg-slate-50/30 focus:bg-white transition-all"
                  />
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-slate-50/60 mt-3">
                  <div className="text-left flex items-start gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-slate-50 text-slate-400 flex items-center justify-center mt-0.5 border border-slate-100">
                      <Clock className="h-4 w-4" />
                    </div>
                    <div>
                      <span className="text-xs font-bold text-slate-700 block">Enable Waitlist</span>
                      <span className="text-[10px] text-slate-400 font-semibold block leading-tight">Automatically add users to a waitlist when capacity is reached.</span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setFormEnableWaitlist(!formEnableWaitlist)}
                    className="w-9 h-5 rounded-full transition-colors relative flex items-center px-0.5 shrink-0 bg-slate-200"
                  >
                    <div 
                      className="w-4 h-4 rounded-full bg-white shadow transition-all duration-200 transform translate-x-0"
                    />
                  </button>
                </div>
              </div>

              {/* WhatsApp Integration Card */}
              <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-[0_8px_30px_rgba(0,0,0,0.015)] space-y-4 text-left">
                <h3 className="text-sm font-bold text-slate-800 tracking-tight border-b border-slate-50 pb-3 flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-green-50 flex items-center justify-center text-emerald-600">
                    <MessageSquare className="h-4 w-4" />
                  </div>
                  WhatsApp Group Link
                </h3>

                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">WhatsApp Group URL</label>
                  <input
                    type="url"
                    placeholder="https://chat.whatsapp.com/..."
                    value={formWhatsGroupLink}
                    onChange={(e) => setFormWhatsGroupLink(e.target.value)}
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-2xl focus:outline-none focus:border-green-500 font-medium text-sm text-slate-800 bg-slate-50/30 focus:bg-white transition-all"
                  />
                </div>
              </div>

              {/* 5. Media */}
              <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-[0_8px_30px_rgba(0,0,0,0.015)] space-y-4">
                <h3 className="text-sm font-bold text-slate-800 tracking-tight border-b border-slate-50 pb-3 flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-blue-50 flex items-center justify-center text-[#2563EB]">
                    <Upload className="h-4 w-4" />
                  </div>
                  Media
                </h3>
                
                <div 
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-slate-200 hover:border-blue-500 rounded-3xl p-6 flex flex-col items-center justify-center cursor-pointer transition-colors bg-slate-50/40 hover:bg-blue-50/10 group min-h-[160px] overflow-hidden"
                >
                  <input 
                    type="file" 
                    ref={fileInputRef} 
                    className="hidden" 
                    accept="image/*" 
                    onChange={handleFileChange} 
                    onClick={(e) => e.stopPropagation()} 
                  />
                  {formPosterPreview ? (
                    <div className="w-full space-y-3">
                      <div className="relative h-44 w-full rounded-2xl overflow-hidden border border-slate-100 shadow-sm bg-slate-50">
                        <img 
                          src={formPosterPreview} 
                          alt="Poster Preview" 
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute inset-0 bg-slate-900/10 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-all duration-200 backdrop-blur-[1px]">
                          <span className="bg-white text-slate-800 font-bold px-3 py-1.5 rounded-xl text-[10px] shadow-md flex items-center gap-1.5">
                            <Upload className="h-3.5 w-3.5" />
                            Change Image
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center justify-between text-xs font-bold text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-100/60 animate-in fade-in duration-200">
                        <span className="flex items-center gap-1.5 truncate">
                          <CheckSquare className="h-3.5 w-3.5 shrink-0" />
                          {formPosterFilename}
                        </span>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setFormPosterFilename("");
                            setFormPosterPreview("");
                          }}
                          className="text-red-500 hover:text-red-700 font-black ml-2 px-1.5 py-0.5 rounded hover:bg-red-50 transition-colors"
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="w-12 h-12 rounded-2xl bg-blue-50 text-[#2563EB] flex items-center justify-center transition-colors mb-3">
                        <Upload className="h-5 w-5" />
                      </div>
                      <span className="text-xs font-black text-slate-700 block">Upload Event Poster</span>
                      <span className="text-[10px] text-slate-450 font-semibold mt-1">Drag and drop your image here, or click to browse</span>
                      <span className="text-[9px] text-slate-400 mt-0.5 font-semibold">(Recommended: 1200x630px, Max 5MB)</span>
                      
                      <button 
                        type="button" 
                        className="mt-4 px-4 py-1.5 border border-slate-200 rounded-xl bg-white text-slate-650 hover:bg-slate-50 transition-all text-[11px] font-bold shadow-sm"
                      >
                        Browse Files
                      </button>
                    </>
                  )}
                </div>
              </div>

              {/* Speaker Information */}
              <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-[0_8px_30px_rgba(0,0,0,0.015)] space-y-4 text-left">
                <h3 className="text-sm font-bold text-slate-800 tracking-tight border-b border-slate-50 pb-3 flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-blue-50 flex items-center justify-center text-[#2563EB]">
                    <Users className="h-4 w-4" />
                  </div>
                  Speaker Information
                </h3>
                
                {/* Speaker Photo Upload Block */}
                <div className="flex items-center gap-4 border border-slate-100 bg-slate-50/20 p-4 rounded-2xl">
                  <div className="relative w-16 h-16 rounded-full overflow-hidden border border-slate-200 bg-white shadow-inner flex items-center justify-center shrink-0 group">
                    <input 
                      type="file" 
                      ref={speakerFileInputRef} 
                      className="hidden" 
                      accept="image/*" 
                      onChange={handleSpeakerFileChange} 
                      onClick={(e) => e.stopPropagation()} 
                    />
                    {formSpeakerImagePreview ? (
                      <img 
                        src={formSpeakerImagePreview} 
                        alt="Speaker Avatar" 
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <Users className="h-6 w-6 text-slate-350" />
                    )}
                  </div>
                  
                  <div className="space-y-1.5 text-left">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Speaker Photo</span>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => speakerFileInputRef.current?.click()}
                        className="px-3 py-1.5 bg-white border border-slate-250 rounded-xl text-slate-700 font-bold text-[10px] shadow-sm hover:bg-slate-50 transition-colors"
                      >
                        {formSpeakerImagePreview ? "Change Photo" : "Upload Photo"}
                      </button>
                      {formSpeakerImagePreview && (
                        <button
                          type="button"
                          onClick={() => {
                            setFormSpeakerImageFilename("");
                            setFormSpeakerImagePreview("");
                          }}
                          className="px-3 py-1.5 bg-red-50 text-red-650 border border-red-100 rounded-xl font-bold text-[10px] hover:bg-red-100/50 transition-colors"
                        >
                          Remove
                        </button>
                      )}
                    </div>
                    {formSpeakerImageFilename && (
                      <span className="text-[9px] font-bold text-emerald-600 block truncate max-w-[200px]">{formSpeakerImageFilename}</span>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Speaker Name</label>
                    <input
                      type="text"
                      placeholder="e.g. Dr. Elena Vos"
                      value={formSpeakerName}
                      onChange={(e) => setFormSpeakerName(e.target.value)}
                      className="w-full px-4 py-2.5 border border-slate-200 rounded-2xl focus:outline-none focus:border-blue-500 font-medium text-sm text-slate-850 bg-slate-50/30 focus:bg-white transition-all"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Speaker Role / Title</label>
                    <input
                      type="text"
                      placeholder="e.g. Lead Research Scientist"
                      value={formSpeakerRole}
                      onChange={(e) => setFormSpeakerRole(e.target.value)}
                      className="w-full px-4 py-2.5 border border-slate-200 rounded-2xl focus:outline-none focus:border-blue-500 font-medium text-sm text-slate-850 bg-slate-50/30 focus:bg-white transition-all"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Speaker Bio</label>
                  <textarea
                    rows={3}
                    placeholder="Short professional background summary..."
                    value={formSpeakerBio}
                    onChange={(e) => setFormSpeakerBio(e.target.value)}
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-2xl focus:outline-none focus:border-blue-500 font-medium text-sm text-slate-850 bg-slate-50/30 focus:bg-white transition-all resize-none"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">LinkedIn Profile URL</label>
                    <input
                      type="text"
                      placeholder="e.g. https://linkedin.com/in/username"
                      value={formSpeakerLinkedin}
                      onChange={(e) => setFormSpeakerLinkedin(e.target.value)}
                      className="w-full px-4 py-2.5 border border-slate-200 rounded-2xl focus:outline-none focus:border-blue-500 font-medium text-sm text-slate-850 bg-slate-50/30 focus:bg-white transition-all"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Twitter Profile URL</label>
                    <input
                      type="text"
                      placeholder="e.g. https://twitter.com/username"
                      value={formSpeakerTwitter}
                      onChange={(e) => setFormSpeakerTwitter(e.target.value)}
                      className="w-full px-4 py-2.5 border border-slate-200 rounded-2xl focus:outline-none focus:border-blue-500 font-medium text-sm text-slate-850 bg-slate-50/30 focus:bg-white transition-all"
                    />
                  </div>
                </div>
              </div>

              {/* Event Agenda */}
              <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-[0_8px_30px_rgba(0,0,0,0.015)] space-y-4 text-left">
                <h3 className="text-sm font-bold text-slate-800 tracking-tight border-b border-slate-50 pb-3 flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-blue-50 flex items-center justify-center text-[#2563EB]">
                    <SlidersHorizontal className="h-4 w-4" />
                  </div>
                  Event Agenda
                </h3>

                {formAgendaItems.map((item, index) => (
                  <div key={index} className="p-4 border border-slate-100 bg-slate-50/20 rounded-2xl space-y-3 relative">
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] font-black text-blue-600 block">AGENDA ITEM {index + 1}</span>
                      {formAgendaItems.length > 1 && (
                        <button
                          type="button"
                          onClick={() => {
                            setFormAgendaItems(prev => prev.filter((_, idx) => idx !== index));
                          }}
                          className="text-red-500 hover:text-red-700 font-bold text-[10px] hover:bg-red-50 px-2 py-1 rounded-lg transition-colors flex items-center gap-1"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          Remove
                        </button>
                      )}
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="md:col-span-1">
                        <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1">Time Block</label>
                        <input
                          type="text"
                          placeholder="e.g. 09:00 AM - 10:30 AM"
                          value={item.time}
                          onChange={(e) => {
                            const val = e.target.value;
                            setFormAgendaItems(prev => prev.map((it, idx) => idx === index ? { ...it, time: val } : it));
                          }}
                          className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:border-blue-500 font-semibold text-xs text-slate-850 bg-white"
                        />
                      </div>
                      <div className="md:col-span-2">
                        <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1">Session Title</label>
                        <input
                          type="text"
                          placeholder="e.g. Morning Keynote"
                          value={item.title}
                          onChange={(e) => {
                            const val = e.target.value;
                            setFormAgendaItems(prev => prev.map((it, idx) => idx === index ? { ...it, title: val } : it));
                          }}
                          className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:border-blue-500 font-semibold text-xs text-slate-855 bg-white"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1">Short Outline</label>
                      <input
                        type="text"
                        placeholder="Brief session outline..."
                        value={item.description}
                        onChange={(e) => {
                          const val = e.target.value;
                          setFormAgendaItems(prev => prev.map((it, idx) => idx === index ? { ...it, description: val } : it));
                        }}
                        className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:border-blue-500 font-medium text-xs text-slate-850 bg-white"
                      />
                    </div>
                  </div>
                ))}

                <button
                  type="button"
                  onClick={() => {
                    setFormAgendaItems(prev => [...prev, { time: "05:00 PM - 06:00 PM", title: "New Session", description: "Brief outline of the new session." }]);
                  }}
                  className="w-full py-2.5 border border-dashed border-slate-200 hover:border-blue-500 rounded-2xl text-slate-500 hover:text-blue-600 font-bold text-xs bg-slate-50/20 hover:bg-blue-50/10 flex items-center justify-center gap-1.5 transition-all shadow-sm"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Add Agenda Item
                </button>

              </div>

            </div>

            {/* Right Panel: Live Preview & Status Configuration (span 1) */}
            <div className="space-y-6">
              
              {/* 1. Publishing Settings */}
              <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm space-y-5 text-left">
                <h3 className="text-sm font-bold text-slate-800 tracking-tight border-b border-slate-50 pb-3 flex items-center gap-2">
                  <Settings2 className="h-4.5 w-4.5 text-[#2563EB]" />
                  Publishing Settings
                </h3>

                <div className="space-y-4">
                  {/* Visibility Button Segments */}
                  <div className="space-y-2">
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider">Visibility</label>
                    <div className="grid grid-cols-2 gap-2 border border-slate-100 bg-slate-50/50 p-1 rounded-2xl">
                      <button
                        type="button"
                        onClick={() => setFormVisibility("Public")}
                        className={`py-1.5 text-center text-[10px] font-bold rounded-xl transition-all ${formVisibility === "Public" ? "bg-[#2563EB] text-white shadow-sm" : "text-slate-500 hover:text-slate-800"}`}
                      >
                        Public
                      </button>
                      <button
                        type="button"
                        onClick={() => setFormVisibility("Internal Only")}
                        className={`py-1.5 text-center text-[10px] font-bold rounded-xl transition-all ${formVisibility === "Internal Only" ? "bg-[#2563EB] text-white shadow-sm" : "text-slate-500 hover:text-slate-800"}`}
                      >
                        Internal Only
                      </button>
                    </div>
                  </div>

                  {/* Status configuration segments */}
                  <div className="space-y-2">
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider">Status</label>
                    <div className="grid grid-cols-3 gap-1 border border-slate-100 bg-slate-50/50 p-1 rounded-2xl">
                      <button
                        type="button"
                        onClick={() => setFormStatus("Draft")}
                        className={`py-1.5 text-center text-[10px] font-bold rounded-xl transition-all ${formStatus === "Draft" ? "bg-[#2563EB] text-white shadow-sm" : "text-slate-500 hover:text-slate-800"}`}
                      >
                        Draft
                      </button>
                      <button
                        type="button"
                        onClick={() => setFormStatus("Active")}
                        className={`py-1.5 text-center text-[10px] font-bold rounded-xl transition-all ${formStatus === "Active" ? "bg-[#2563EB] text-white shadow-sm" : "text-slate-500 hover:text-slate-800"}`}
                      >
                        Active
                      </button>
                      <button
                        type="button"
                        onClick={() => setFormStatus("Opened")}
                        className={`py-1.5 text-center text-[10px] font-bold rounded-xl transition-all ${formStatus === "Opened" ? "bg-[#2563EB] text-white shadow-sm" : "text-slate-500 hover:text-slate-800"}`}
                      >
                        Opened
                      </button>
                    </div>
                  </div>

                  {/* Featured Event toggle */}
                  <div className="flex items-center justify-between pt-1">
                    <div className="text-left">
                      <span className="text-xs font-bold text-slate-700 block">Featured Event</span>
                      <span className="text-[9px] text-slate-450 font-semibold leading-none">Display at the top of the portal</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setFormIsFeatured(!formIsFeatured)}
                      className={`w-9 h-5 rounded-full transition-colors relative flex items-center px-0.5 shrink-0 ${formIsFeatured ? "bg-[#2563EB]" : "bg-slate-200"}`}
                    >
                      <div 
                        className={`w-4 h-4 rounded-full bg-white shadow transition-all duration-200 transform ${formIsFeatured ? "translate-x-4" : "translate-x-0"}`}
                      />
                    </button>
                  </div>

                  {/* Send Email Notifications toggle */}
                  <div className="flex items-center justify-between pt-1 border-t border-slate-50/50">
                    <div className="text-left">
                      <span className="text-xs font-bold text-slate-700 block">Send Email Notifications</span>
                      <span className="text-[9px] text-slate-450 font-semibold leading-none">Notify all registered members</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setFormSendEmail(!formSendEmail)}
                      className={`w-9 h-5 rounded-full transition-colors relative flex items-center px-0.5 shrink-0 ${formSendEmail ? "bg-[#2563EB]" : "bg-slate-200"}`}
                    >
                      <div 
                        className={`w-4 h-4 rounded-full bg-white shadow transition-all duration-200 transform ${formSendEmail ? "translate-x-4" : "translate-x-0"}`}
                      />
                    </button>
                  </div>
                </div>
              </div>

              {/* 2. Event Preview */}
              <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm space-y-4 text-left">
                <h3 className="text-sm font-bold text-slate-800 tracking-tight border-b border-slate-50 pb-3 flex justify-between items-center">
                  <span>Event Preview</span>
                  <span className="text-[9px] font-black text-[#2563EB] bg-blue-50 px-2 py-0.5 rounded uppercase tracking-wider">Live</span>
                </h3>

                {/* Event Card preview styling */}
                <div className="border border-slate-100 rounded-2xl overflow-hidden shadow-inner bg-slate-50/20">
                  <div className="relative h-32 bg-slate-150">
                    <img
                      src={formPosterPreview || (formCategory === "Hackathon" ? hackathonImg : formCategory === "Seminar" ? seminarImg : sparkImg)}
                      alt="Preview"
                      className="w-full h-full object-cover animate-in fade-in duration-200"
                    />
                    <div className="absolute top-2.5 right-2.5">
                      <span className={`inline-block px-2 py-0.5 rounded text-[8px] font-black tracking-wider uppercase text-white
                        ${formCategory === "Hackathon" ? "bg-[#2563EB]" : ""}
                        ${formCategory === "Seminar" ? "bg-sky-600" : ""}
                        ${formCategory === "Workshop" ? "bg-emerald-600" : ""}
                      `}>
                        {formCategory.toUpperCase()}
                      </span>
                    </div>
                  </div>

                  <div className="p-4 space-y-3.5">
                    <div>
                      <h4 className="font-extrabold text-slate-800 text-xs truncate">
                        {formTitle || "Event Title Preview..."}
                      </h4>
                      {formPrimaryTag && (
                        <span className="inline-block mt-1 text-[9px] font-semibold text-slate-400 bg-slate-100/60 px-2 py-0.5 rounded-full border border-slate-200/20">
                          #{formPrimaryTag}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center justify-between text-[9px] font-bold text-slate-400 border-t border-slate-100 pt-3">
                      <span className="flex items-center gap-0.5">
                        <Clock className="h-3 w-3 inline text-slate-350" />
                        {formStartDate ? new Date(formStartDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : "Oct 24, 2023"} {formStartTime && `• ${formStartTime}`}
                      </span>
                      <span className="flex items-center gap-0.5">
                        <MapPin className="h-3 w-3 inline text-slate-350" />
                        {formLocation || "Virtual Hub"}
                      </span>
                    </div>

                    <div className="flex justify-between items-center pt-2.5 border-t border-dashed border-slate-100/80">
                      {/* Registered Attendees Avatars Preview */}
                      <div className="flex -space-x-1.5 overflow-hidden">
                        <div className="w-5 h-5 rounded-full bg-slate-200 border border-white"></div>
                        <div className="w-5 h-5 rounded-full bg-slate-300 border border-white"></div>
                        <div className="w-5 h-5 rounded-full bg-slate-400 border border-white"></div>
                      </div>
                      <span className="text-[9px] font-black text-blue-600 border border-blue-100 px-2 py-0.5 rounded bg-blue-50/50 uppercase tracking-wider">
                        Register
                      </span>
                    </div>
                  </div>
                </div>
              </div>

            </div>
          </div>
        </div>
      )}

      {/* ================= SUPPORT MODAL ================= */}
      {isSupportModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-sm w-full shadow-2xl border border-slate-100 overflow-hidden text-left p-6 space-y-4 animate-in zoom-in-95 duration-200 font-sans">
            <div className="text-center space-y-2">
              <div className="w-12 h-12 rounded-full bg-blue-50 text-[#2563EB] flex items-center justify-center mx-auto shadow-inner">
                <HelpCircle className="h-6 w-6" />
              </div>
              <h3 className="text-lg font-bold text-slate-800">Support Ticket Opened</h3>
              <p className="text-xs text-slate-550 leading-relaxed font-semibold">
                Your concierge support request has been logged successfully. One of our event coordinators will contact you shortly via email.
              </p>
            </div>
            <button
              onClick={() => setIsSupportModalOpen(false)}
              className="w-full py-2.5 text-center text-xs font-bold bg-[#2563EB] hover:bg-blue-700 text-white rounded-xl shadow-md transition-all select-none"
            >
              Back to Dashboard
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default EventManagementPage;
