import React, { useState, useMemo, useEffect } from "react";
import SEO from "../../components/layout/SEO";
import Papa from "papaparse";
import { db } from "../../config/firebase";
import { collection, doc, getDocs, addDoc, deleteDoc, getDoc, setDoc, updateDoc, increment } from "firebase/firestore";
import { 
  Calendar, 
  Users, 
  UserPlus,
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
  MessageSquare,
  Eye,
  ExternalLink,
  Copy,
  Check,
  Sparkles,
  ShieldCheck,
  FileText,
  X
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
  category: "HACKATHONS" | "LECTURES" | "WORKSHOPS" | "TECH_EVENTS" | "ALUMNI_MEETUPS";
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
    const files = e.target.files;
    if (files && files.length > 0) {
      Array.from(files).forEach(file => {
        const reader = new FileReader();
        reader.onloadend = () => {
          setFormPosterImages(prev => [...prev, { filename: file.name, preview: reader.result as string }]);
        };
        reader.readAsDataURL(file);
      });
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

  const [allUsers, setAllUsers] = useState<any[]>([]);

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const querySnapshot = await getDocs(collection(db, "users"));
        const list: any[] = [];
        querySnapshot.forEach((doc) => {
          list.push({ id: doc.id, ...doc.data() });
        });
        setAllUsers(list);
      } catch (err) {
        console.error("Error fetching users:", err);
      }
    };
    fetchUsers();
  }, []);

  // States
  const [searchQuery, setSearchQuery] = useState("");
  const [view, setView] = useState<"list" | "create">("list");
  const [isSupportModalOpen, setIsSupportModalOpen] = useState(false);
  const [editingEventId, setEditingEventId] = useState<string | null>(null);

  // Event Details Modal State
  const [selectedEventDetails, setSelectedEventDetails] = useState<any | null>(null);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [copiedWhatsLink, setCopiedWhatsLink] = useState(false);
  const [activeImageLightbox, setActiveImageLightbox] = useState<string | null>(null);

  const handleOpenEventDetails = async (eventId: string) => {
    setIsDetailsModalOpen(true);
    setLoadingDetails(true);
    setCopiedWhatsLink(false);
    try {
      const docRef = doc(db, "events", eventId);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        setSelectedEventDetails({ id: docSnap.id, ...docSnap.data() });
      } else {
        const fallback = events.find(e => e.id === eventId);
        setSelectedEventDetails(fallback || null);
      }
    } catch (err) {
      console.error("Error fetching full event details:", err);
      const fallback = events.find(e => e.id === eventId);
      setSelectedEventDetails(fallback || null);
    } finally {
      setLoadingDetails(false);
    }
  };

  // New Detailed Event Form State
  const [formTitle, setFormTitle] = useState("");
  const [formCategory, setFormCategory] = useState<"Workshop" | "Hackathon" | "Seminar" | "Tech Event" | "Alumni Meetup">("Workshop");
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
  const [formPosterImages, setFormPosterImages] = useState<{filename: string, preview: string}[]>([]);
  const [formWhatsGroupLink, setFormWhatsGroupLink] = useState("");
  const [formFacultyCoordinator, setFormFacultyCoordinator] = useState("");
  const [formStudentCoordinator, setFormStudentCoordinator] = useState("");
  
  const [formVisibility, setFormVisibility] = useState<"Public" | "Internal Only">("Public");

  const [formSpeakerName, setFormSpeakerName] = useState("");
  const [formSpeakerRole, setFormSpeakerRole] = useState("");
  const [formSpeakerBio, setFormSpeakerBio] = useState("");
  const [formSpeakerLinkedin, setFormSpeakerLinkedin] = useState("");
  const [formSpeakerImageFilename, setFormSpeakerImageFilename] = useState("");
  const [formSpeakerImagePreview, setFormSpeakerImagePreview] = useState("");
  
  // Alumni Meetup Specific Fields
  const [formCompany, setFormCompany] = useState("");
  const [formBatch, setFormBatch] = useState("");
  const [formIsPastEvent, setFormIsPastEvent] = useState(false);

  // Add Bulk Registers Card States (for non-Hackathon events)
  const [formCustomRegLink, setFormCustomRegLink] = useState("");
  const [formRegType, setFormRegType] = useState("Open");
  const [formPreRegisteredEmails, setFormPreRegisteredEmails] = useState("");
  const [bulkRegCsvFilename, setBulkRegCsvFilename] = useState("");
  const [bulkRegCsvData, setBulkRegCsvData] = useState<any[]>([]);
  const bulkCsvFileInputRef = React.useRef<HTMLInputElement>(null);

  const handleDownloadBulkRegTemplate = () => {
    const headers = ["RollNumber", "Name", "CollegeEmailID", "Branch", "Section", "Year", "PhoneNumber"];
    const sampleRows = [
      "21A91A0501,Jane Doe,jane.doe@university.edu,CSE,A,3rd Year,9876543210",
      "21A91A0502,John Smith,john.smith@university.edu,AIML,B,3rd Year,9876543211"
    ];
    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...sampleRows].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "bulk_registers_template.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleBulkCsvFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setBulkRegCsvFilename(file.name);
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          if (results.data) {
            setBulkRegCsvData(results.data);
          }
        },
        error: (err) => {
          console.error("CSV parse error:", err);
          alert("Failed to parse CSV file. Please verify CSV format.");
        }
      });
    }
  };

  // Agenda States
  const [formHasAgenda, setFormHasAgenda] = useState(true);
  const [formAgendaItems, setFormAgendaItems] = useState<any[]>([
    { time: "09:00 AM - 10:30 AM", title: "Morning Keynote: The Future of Compute", description: "Opening session detailing next-gen silicon compute." },
    { time: "11:30 AM - 01:00 PM", title: "Workshop: Transformer Efficiency", description: "Hands-on FlashAttention, quantization, and sparse computation models." },
    { time: "03:00 PM - 04:30 PM", title: "Panel: Ethical Scaling", description: "A roundtable discussion with industry leaders on model deployment." }
  ]);
  const [formIsFeatured, setFormIsFeatured] = useState(false);
  const [formSendEmail, setFormSendEmail] = useState(true);
  const [formStatus, setFormStatus] = useState<"Draft" | "Active" | "Opened">("Draft");

  const getSpeakerSectionTitle = () => {
    if (formCategory === "Hackathon" || formCategory === "Tech Event") return "Jury Information";
    if (formCategory === "Workshop") return "Tech Speaker Information";
    return "Speaker Information";
  };

  const getSpeakerPrefix = () => {
    if (formCategory === "Hackathon" || formCategory === "Tech Event") return "Jury";
    if (formCategory === "Workshop") return "Tech Speaker";
    return "Speaker";
  };

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

    const mappedCategory = formCategory === "Workshop" ? "WORKSHOPS" : formCategory === "Hackathon" ? "HACKATHONS" : formCategory === "Seminar" ? "LECTURES" : formCategory === "Tech Event" ? "TECH_EVENTS" : "ALUMNI_MEETUPS";

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
      posterFilename: formPosterImages[0]?.filename || "",
      posterPreview: formPosterImages[0]?.preview || "",
      posterImages: formPosterImages,
      visibility: formVisibility,
      isFeatured: formIsFeatured,
      sendEmail: formSendEmail,
      speakerName: formSpeakerName,
      speakerRole: formSpeakerRole,
      speakerBio: formSpeakerBio,
      speakerLinkedin: formSpeakerLinkedin,
      speakerImagePreview: formSpeakerImagePreview,
      hasAgenda: formHasAgenda,
      agendaItems: formHasAgenda ? formAgendaItems : [],
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
      facultyCoordinator: formFacultyCoordinator,
      studentCoordinator: formStudentCoordinator,
      company: formCategory === "Alumni Meetup" ? formCompany : "",
      batch: formCategory === "Alumni Meetup" ? formBatch : "",
      customRegLink: formCategory !== "Hackathon" ? formCustomRegLink : "",
      regType: formCategory !== "Hackathon" ? formRegType : "Open",
      preRegisteredEmails: formCategory !== "Hackathon" ? formPreRegisteredEmails : "",
      bulkRegCsvFilename: formCategory !== "Hackathon" ? bulkRegCsvFilename : "",
      bulkRegCsvData: formCategory !== "Hackathon" ? bulkRegCsvData : [],
      isPastEvent: formIsPastEvent,
      createdAt: Date.now()
    };

    try {
        let targetEventId = editingEventId;
        if (editingEventId) {
          await setDoc(doc(db, "events", editingEventId), payload, { merge: true });
          const existingReg = events.find(e => e.id === editingEventId)?.currentReg || 0;
          const updatedEvent: EventItem = {
            id: editingEventId,
            title: formTitle,
            date: displayDate,
            location: formLocation || "Virtual Hub",
            category: mappedCategory,
            status: formStatus,
            currentReg: existingReg,
            maxReg: formMaxParticipants ? Number(formMaxParticipants) : 100,
            image: formPosterImages[0]?.preview || imageFile
          };
          setEvents(prev => prev.map(e => e.id === editingEventId ? { ...e, ...updatedEvent } : e));
          setEditingEventId(null);
        } else {
          const docRef = await addDoc(collection(db, "events"), payload);
          targetEventId = docRef.id;
          const newEvent: EventItem = {
            id: docRef.id,
            title: formTitle,
            date: displayDate,
            location: formLocation || "Virtual Hub",
            category: mappedCategory,
            status: formStatus,
            currentReg: 0,
            maxReg: formMaxParticipants ? Number(formMaxParticipants) : 100,
            image: formPosterImages[0]?.preview || imageFile
          };
          setEvents(prev => [newEvent, ...prev]);
        }

        // Process bulk CSV registrations into registrations collection in Firestore
        if (targetEventId && formCategory !== "Hackathon" && bulkRegCsvData && bulkRegCsvData.length > 0) {
          let addedCount = 0;
          for (const row of bulkRegCsvData) {
            const rollNo = (row["RollNumber"] || row["rollNumber"] || row["Roll Number"] || "").toString().trim();
            const name = (row["Name"] || row["name"] || row["Full Name"] || "").toString().trim();
            const email = (row["CollegeEmailID"] || row["collegeEmailID"] || row["Email"] || row["Email Address"] || "").toString().trim();
            const branch = (row["Branch"] || row["branch"] || "").toString().trim();
            const section = (row["Section"] || row["section"] || "").toString().trim();
            const year = (row["Year"] || row["year"] || "").toString().trim();
            const phone = (row["PhoneNumber"] || row["phoneNumber"] || row["Phone"] || "").toString().trim();

            if (name || email || rollNo) {
              const regPayload = {
                eventId: targetEventId,
                eventTitle: formTitle,
                groupName: rollNo ? `${name} (${rollNo})` : name || "Student Registrant",
                teamLeadName: name || "Student Registrant",
                teamLeadEmail: email,
                teamLeadStudentId: rollNo,
                phoneNumber: phone,
                branch: branch,
                section: section,
                year: year,
                teamSize: 1,
                members: [
                  {
                    name: name,
                    email: email,
                    studentId: rollNo,
                    phoneNumber: phone,
                    branch: branch,
                    section: section,
                    year: year
                  }
                ],
                status: "Confirmed",
                createdAt: Date.now()
              };
              const regDocRef = await addDoc(collection(db, "registrations"), regPayload);
              await setDoc(doc(db, "registrations", regDocRef.id), { qrCodeData: regDocRef.id }, { merge: true });
              addedCount++;
            }
          }

          if (addedCount > 0) {
            await updateDoc(doc(db, "events", targetEventId), {
              currentReg: increment(addedCount)
            });
            setEvents(prev => prev.map(e => e.id === targetEventId ? { ...e, currentReg: (e.currentReg || 0) + addedCount } : e));
          }
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
      setFormPosterImages([]);
      setFormVisibility("Public");
      setFormIsFeatured(false);
      setFormSendEmail(true);
      setFormStatus("Draft");
      setFormMinTeamSize("1");
      setFormMaxTeamSize("4");
      setFormRegistrationFee("0");
      setFormWhatsGroupLink("");
      setFormFacultyCoordinator("");
      setFormStudentCoordinator("");

      setFormSpeakerName("");
      setFormSpeakerRole("");
      setFormSpeakerBio("");
      setFormSpeakerLinkedin("");
      setFormSpeakerImageFilename("");
      setFormSpeakerImagePreview("");
      setFormCompany("");
      setFormBatch("");
      setFormCustomRegLink("");
      setFormRegType("Open");
      setFormPreRegisteredEmails("");
      setBulkRegCsvFilename("");
      setBulkRegCsvData([]);
      setFormIsPastEvent(false);
      setFormHasAgenda(true);
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
        
        let cat: "Workshop" | "Hackathon" | "Seminar" | "Tech Event" | "Alumni Meetup" = "Workshop";
        if (data.category === "HACKATHONS") cat = "Hackathon";
        else if (data.category === "LECTURES") cat = "Seminar";
        else if (data.category === "TECH_EVENTS") cat = "Tech Event";
        else if (data.category === "ALUMNI_MEETUPS") cat = "Alumni Meetup";
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
        setFormPosterImages(data.posterImages || (data.posterPreview ? [{ filename: data.posterFilename || "poster.png", preview: data.posterPreview }] : []));
        setFormVisibility(data.visibility || "Public");
        setFormIsFeatured(data.isFeatured || false);
        setFormSendEmail(data.sendEmail !== undefined ? data.sendEmail : true);
        setFormStatus(data.status || "Draft");
        setFormMinTeamSize(data.minTeamSize ? String(data.minTeamSize) : "1");
        setFormMaxTeamSize(data.maxTeamSize ? String(data.maxTeamSize) : "4");
        setFormRegistrationFee(data.registrationFee !== undefined ? String(data.registrationFee) : "0");
        setFormWhatsGroupLink(data.whatsGroupLink || "");
        setFormFacultyCoordinator(data.facultyCoordinator || "");
        setFormStudentCoordinator(data.studentCoordinator || "");
        
        setFormSpeakerName(data.speakerName || "");
        setFormSpeakerRole(data.speakerRole || "");
        setFormSpeakerBio(data.speakerBio || "");
        setFormSpeakerLinkedin(data.speakerLinkedin || "");
        setFormSpeakerImageFilename(data.speakerImageFilename || "");
        setFormSpeakerImagePreview(data.speakerImagePreview || "");
        setFormCompany(data.company || "");
        setFormBatch(data.batch || "");
        setFormCustomRegLink(data.customRegLink || "");
        setFormRegType(data.regType || "Open");
        setFormPreRegisteredEmails(data.preRegisteredEmails || "");
        setBulkRegCsvFilename(data.bulkRegCsvFilename || "");
        setBulkRegCsvData(data.bulkRegCsvData || []);
        setFormIsPastEvent(data.isPastEvent || false);
        setFormHasAgenda(data.hasAgenda !== false);
        
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
              setFormPosterImages([]);
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
              setFormSpeakerImageFilename("");
              setFormSpeakerImagePreview("");
              setFormCompany("");
              setFormBatch("");
              setFormIsPastEvent(false);
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
                          onClick={() => handleOpenEventDetails(event.id)}
                          className="border-b border-slate-150/40 hover:bg-blue-50/40 transition-colors group/row cursor-pointer"
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
                                <span className="font-extrabold text-slate-800 text-xs line-clamp-1 group-hover/row:text-[#2563EB] transition-colors">
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
                          <td className="px-6 py-4" onClick={(e) => e.stopPropagation()}>
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
                          <td className="px-6 py-4 text-right" onClick={(e) => e.stopPropagation()}>
                            <button
                              onClick={() => handleOpenEventDetails(event.id)}
                              className="p-1.5 text-slate-400 hover:text-[#2563EB] hover:bg-blue-50 rounded-xl transition-all mr-1"
                              title="View Information Modal"
                            >
                              <Eye className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => handleStartEditEvent(event.id)}
                              className="p-1.5 text-slate-400 hover:text-[#2563EB] hover:bg-blue-50 rounded-xl transition-all mr-1"
                              title="Edit Event Page"
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
                <div className="flex items-center justify-between border-b border-slate-50 pb-3">
                  <h3 className="text-sm font-bold text-slate-800 tracking-tight flex items-center gap-2">
                    <div className="w-8 h-8 rounded-xl bg-blue-50 flex items-center justify-center text-[#2563EB]">
                      <Info className="h-4 w-4" />
                    </div>
                    Basic Information
                  </h3>
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-bold text-slate-500">Past Event</span>
                    <button
                      type="button"
                      onClick={() => setFormIsPastEvent(!formIsPastEvent)}
                      className={`w-9 h-5 rounded-full transition-colors relative flex items-center px-0.5 shrink-0 ${formIsPastEvent ? "bg-[#2563EB]" : "bg-slate-200"}`}
                    >
                      <div 
                        className={`w-4 h-4 rounded-full bg-white shadow transition-all duration-200 transform ${formIsPastEvent ? "translate-x-4" : "translate-x-0"}`}
                      />
                    </button>
                  </div>
                </div>
                
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
                        <option value="Tech Event">Tech Event</option>
                        <option value="Alumni Meetup">Alumni Meetup</option>
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

                  {formCategory === "Alumni Meetup" && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Company</label>
                        <input
                          type="text"
                          placeholder="e.g. Google, Microsoft"
                          value={formCompany}
                          onChange={(e) => setFormCompany(e.target.value)}
                          className="w-full px-4 py-2.5 border border-slate-200 rounded-2xl focus:outline-none focus:border-blue-500 font-medium text-sm text-slate-850 bg-slate-50/30 focus:bg-white transition-all"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Batch</label>
                        <input
                          type="text"
                          placeholder="e.g. 2020-2024"
                          value={formBatch}
                          onChange={(e) => setFormBatch(e.target.value)}
                          className="w-full px-4 py-2.5 border border-slate-200 rounded-2xl focus:outline-none focus:border-blue-500 font-medium text-sm text-slate-850 bg-slate-50/30 focus:bg-white transition-all"
                        />
                      </div>
                    </div>
                  )}
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
              {!formIsPastEvent && (
                <>
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

                {formCategory === "Hackathon" && (
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
                )}

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

              {/* Faculty Coordinator Card */}
              <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-[0_8px_30px_rgba(0,0,0,0.015)] space-y-4 text-left">
                <h3 className="text-sm font-bold text-slate-800 tracking-tight border-b border-slate-50 pb-3 flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-purple-50 flex items-center justify-center text-purple-600">
                    <Users className="h-4 w-4" />
                  </div>
                  Set Faculty Coordinator
                </h3>

                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Coordinator Name</label>
                  <select
                    value={formFacultyCoordinator}
                    onChange={(e) => setFormFacultyCoordinator(e.target.value)}
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-2xl focus:outline-none focus:border-purple-500 font-medium text-sm text-slate-800 bg-slate-50/30 focus:bg-white transition-all cursor-pointer"
                  >
                    <option value="">Select Faculty Coordinator</option>
                    {allUsers.filter(u => u.role === "Faculty Coordinator").map(u => (
                      <option key={u.id} value={u.name || u.displayName || u.email}>{u.name || u.displayName || u.email}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Student Coordinator Card */}
              <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-[0_8px_30px_rgba(0,0,0,0.015)] space-y-4 text-left">
                <h3 className="text-sm font-bold text-slate-800 tracking-tight border-b border-slate-50 pb-3 flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-orange-50 flex items-center justify-center text-orange-600">
                    <Users className="h-4 w-4" />
                  </div>
                  Set Student Coordinator
                </h3>

                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Coordinator Name</label>
                  <select
                    value={formStudentCoordinator}
                    onChange={(e) => setFormStudentCoordinator(e.target.value)}
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-2xl focus:outline-none focus:border-orange-500 font-medium text-sm text-slate-800 bg-slate-50/30 focus:bg-white transition-all cursor-pointer"
                  >
                    <option value="">Select Student Coordinator</option>
                    {allUsers.filter(u => u.role !== "Faculty Coordinator").map(u => (
                      <option key={u.id} value={u.name || u.displayName || u.email}>{u.name || u.displayName || u.email}</option>
                    ))}
                  </select>
                </div>
              </div>
              </>
              )}

              {/* 5. Media */}
              <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-[0_8px_30px_rgba(0,0,0,0.015)] space-y-4">
                <h3 className="text-sm font-bold text-slate-800 tracking-tight border-b border-slate-50 pb-3 flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-blue-50 flex items-center justify-center text-[#2563EB]">
                    <Upload className="h-4 w-4" />
                  </div>
                  Media
                </h3>
                
                <div className="space-y-4">
                  <input 
                    type="file" 
                    ref={fileInputRef} 
                    className="hidden" 
                    accept="image/*" 
                    multiple
                    onChange={handleFileChange} 
                  />
                  
                  {formPosterImages.length > 0 ? (
                    <div className="space-y-4">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {formPosterImages.map((img, idx) => (
                          <div key={idx} className="relative w-full rounded-2xl overflow-hidden border border-slate-100 shadow-sm bg-slate-50 flex flex-col group">
                            <div className="relative w-full flex justify-center items-center h-44 bg-slate-100/50">
                              <img 
                                src={img.preview} 
                                alt={`Poster Preview ${idx + 1}`} 
                                className="w-full h-full object-contain p-2"
                              />
                            </div>
                            <div className="flex items-center justify-between text-xs font-bold text-emerald-600 bg-emerald-50 px-3 py-2 border-t border-emerald-100/60">
                              <span className="flex items-center gap-1.5 truncate max-w-[150px]">
                                <CheckSquare className="h-3.5 w-3.5 shrink-0" />
                                {img.filename}
                              </span>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setFormPosterImages(prev => prev.filter((_, i) => i !== idx));
                                }}
                                className="text-red-500 hover:text-red-700 font-black ml-2 px-1.5 py-0.5 rounded hover:bg-red-50 transition-colors"
                              >
                                Remove
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                      
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="w-full py-3 border-2 border-dashed border-slate-200 hover:border-blue-500 rounded-2xl text-slate-500 hover:text-blue-600 font-bold text-xs bg-slate-50/20 hover:bg-blue-50/10 flex items-center justify-center gap-2 transition-all shadow-sm"
                      >
                        <Plus className="h-4 w-4" />
                        Add More Images
                      </button>
                    </div>
                  ) : (
                    <div 
                      onClick={() => fileInputRef.current?.click()}
                      className="border-2 border-dashed border-slate-200 hover:border-blue-500 rounded-3xl p-6 flex flex-col items-center justify-center cursor-pointer transition-colors bg-slate-50/40 hover:bg-blue-50/10 group min-h-[160px] overflow-hidden"
                    >
                      <div className="w-12 h-12 rounded-2xl bg-blue-50 text-[#2563EB] flex items-center justify-center transition-colors mb-3">
                        <Upload className="h-5 w-5" />
                      </div>
                      <span className="text-xs font-black text-slate-700 block">Upload Event Poster</span>
                      <span className="text-[10px] text-slate-450 font-semibold mt-1">Drag and drop your image here, or click to browse</span>
                      <span className="text-[9px] text-slate-400 mt-0.5 font-semibold">(Any size, Max 5MB)</span>
                      
                      <button 
                        type="button" 
                        onClick={(e) => {
                          e.stopPropagation();
                          fileInputRef.current?.click();
                        }}
                        className="mt-4 px-4 py-1.5 border border-slate-200 rounded-xl bg-white text-slate-650 hover:bg-slate-50 transition-all text-[11px] font-bold shadow-sm"
                      >
                        Browse Files
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Speaker Information */}
              <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-[0_8px_30px_rgba(0,0,0,0.015)] space-y-4 text-left">
                <h3 className="text-sm font-bold text-slate-800 tracking-tight border-b border-slate-50 pb-3 flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-blue-50 flex items-center justify-center text-[#2563EB]">
                    <Users className="h-4 w-4" />
                  </div>
                  {getSpeakerSectionTitle()}
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
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">{getSpeakerPrefix()} Photo</span>
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
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">{getSpeakerPrefix()} Name</label>
                    <input
                      type="text"
                      placeholder="e.g. Dr. Elena Vos"
                      value={formSpeakerName}
                      onChange={(e) => setFormSpeakerName(e.target.value)}
                      className="w-full px-4 py-2.5 border border-slate-200 rounded-2xl focus:outline-none focus:border-blue-500 font-medium text-sm text-slate-850 bg-slate-50/30 focus:bg-white transition-all"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">{getSpeakerPrefix()} Role / Title</label>
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
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">{getSpeakerPrefix()} Bio</label>
                  <textarea
                    rows={3}
                    placeholder="Short professional background summary..."
                    value={formSpeakerBio}
                    onChange={(e) => setFormSpeakerBio(e.target.value)}
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-2xl focus:outline-none focus:border-blue-500 font-medium text-sm text-slate-850 bg-slate-50/30 focus:bg-white transition-all resize-none"
                  />
                </div>

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
              </div>

              {/* Add Bulk Registers Card (Shown for all categories EXCEPT Hackathon) */}
              {!formIsPastEvent && formCategory !== "Hackathon" && (
                <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-[0_8px_30px_rgba(0,0,0,0.015)] space-y-5 text-left">
                  <h3 className="text-sm font-bold text-slate-800 tracking-tight border-b border-slate-50 pb-3 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-xl bg-blue-50 flex items-center justify-center text-[#2563EB]">
                        <UserPlus className="h-4 w-4" />
                      </div>
                      Add Bulk Registers
                    </div>
                    <button
                      type="button"
                      onClick={handleDownloadBulkRegTemplate}
                      className="text-[11px] font-bold text-[#2563EB] hover:text-[#1D4ED8] bg-blue-50 hover:bg-blue-100/70 px-3 py-1.5 rounded-xl border border-blue-100/80 transition-all flex items-center gap-1.5 shadow-sm"
                    >
                      <Download className="h-3.5 w-3.5" />
                      Download CSV Template
                    </button>
                  </h3>

                  <div className="space-y-4">
                    <p className="text-xs text-slate-500 font-medium leading-relaxed">
                      Upload a CSV file containing participant details to pre-register members for this {formCategory || "event"}.
                    </p>

                    {/* CSV File Upload Section */}
                    <input 
                      type="file"
                      ref={bulkCsvFileInputRef}
                      className="hidden"
                      accept=".csv, text/csv, application/vnd.ms-excel"
                      onChange={handleBulkCsvFileChange}
                    />

                    {bulkRegCsvFilename ? (
                      <div className="p-4 border border-emerald-100 bg-emerald-50/40 rounded-2xl flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0 shadow-inner">
                            <FileText className="h-5 w-5" />
                          </div>
                          <div>
                            <span className="text-xs font-bold text-slate-800 block truncate max-w-[220px]">{bulkRegCsvFilename}</span>
                            <span className="text-[10px] font-semibold text-emerald-600 block mt-0.5">
                              {bulkRegCsvData.length} registrees loaded successfully
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => bulkCsvFileInputRef.current?.click()}
                            className="px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-slate-700 text-xs font-bold hover:bg-slate-50 transition-colors shadow-sm"
                          >
                            Replace
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setBulkRegCsvFilename("");
                              setBulkRegCsvData([]);
                              if (bulkCsvFileInputRef.current) bulkCsvFileInputRef.current.value = "";
                            }}
                            className="px-3 py-1.5 bg-red-50 text-red-600 border border-red-100 rounded-xl text-xs font-bold hover:bg-red-100 transition-colors"
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div 
                        onClick={() => bulkCsvFileInputRef.current?.click()}
                        className="border-2 border-dashed border-slate-200 hover:border-blue-500 rounded-2xl p-6 flex flex-col items-center justify-center cursor-pointer transition-colors bg-slate-50/40 hover:bg-blue-50/10 group text-center"
                      >
                        <div className="w-10 h-10 rounded-2xl bg-blue-50 text-[#2563EB] flex items-center justify-center transition-colors mb-2">
                          <Upload className="h-5 w-5" />
                        </div>
                        <span className="text-xs font-bold text-slate-700 block">Upload Registrations CSV File</span>
                        <span className="text-[10px] text-slate-450 font-semibold mt-1">Click to browse or drag & drop your CSV file here</span>
                        <span className="text-[9px] text-slate-400 mt-0.5 font-semibold">(Headers: RollNumber, Name, CollegeEmailID, Branch, Section, Year, PhoneNumber)</span>
                      </div>
                    )}


                  </div>
                </div>
              )}

              {/* Event Agenda */}
              {!formIsPastEvent && (
              <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-[0_8px_30px_rgba(0,0,0,0.015)] space-y-4 text-left">
                <h3 className="text-sm font-bold text-slate-800 tracking-tight border-b border-slate-50 pb-3 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-xl bg-blue-50 flex items-center justify-center text-[#2563EB]">
                      <SlidersHorizontal className="h-4 w-4" />
                    </div>
                    Event Agenda
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" className="sr-only peer" checked={formHasAgenda} onChange={(e) => setFormHasAgenda(e.target.checked)} />
                    <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                </h3>

                {formHasAgenda && (
                  <div className="space-y-4 pt-2 animate-in fade-in slide-in-from-top-2">
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
                        setFormAgendaItems(prev => [
                          ...prev,
                          { time: "", title: "", description: "" }
                        ]);
                      }}
                      className="w-full py-3 border-2 border-dashed border-slate-200 rounded-2xl text-slate-500 font-bold text-xs hover:border-blue-500 hover:text-blue-600 hover:bg-blue-50/50 transition-all flex items-center justify-center gap-2 mt-2"
                    >
                      <Plus className="h-4 w-4" /> Add Agenda Item
                    </button>
                  </div>
                )}
              </div>
              )}

            </div>

            {/* Right Panel: Live Preview & Status Configuration (span 1) */}
            {!formIsPastEvent && (
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
                  <div className="relative h-32 bg-slate-100/50">
                    {formPosterImages.length > 0 ? (
                      <img
                        src={formPosterImages[0].preview}
                        alt="Preview"
                        className="w-full h-full object-cover animate-in fade-in duration-200"
                      />
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center text-slate-400 bg-slate-50 border-b border-slate-100">
                        <span className="text-[10px] font-semibold">Update banner to preview</span>
                      </div>
                    )}
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
            )}
          </div>
        </div>
      )}

      {/* ================= TOTAL EVENT INFORMATION DETAILS MODAL (ULTRA PREMIUM RE-DESIGN) ================= */}
      {isDetailsModalOpen && (
        <div 
          onClick={() => setIsDetailsModalOpen(false)}
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-md p-3 sm:p-6 overflow-y-auto animate-in fade-in duration-300 font-sans cursor-pointer"
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className="bg-slate-50 rounded-[32px] max-w-5xl w-full shadow-2xl border border-white/20 overflow-hidden text-left relative my-auto max-h-[92vh] flex flex-col animate-in zoom-in-95 duration-200 cursor-default"
          >
            
            {/* 🌟 HERO BANNER HEADER */}
            <div className="relative bg-gradient-to-br from-slate-950 via-slate-900 to-blue-950 text-white p-6 sm:p-8 shrink-0 overflow-hidden">
              {/* Background Glow Blobs */}
              <div className="absolute top-0 right-1/4 w-96 h-96 bg-blue-600/15 rounded-full blur-3xl pointer-events-none"></div>
              <div className="absolute -bottom-10 left-10 w-72 h-72 bg-purple-600/15 rounded-full blur-3xl pointer-events-none"></div>
              
              {/* Close Button */}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsDetailsModalOpen(false);
                }}
                className="absolute top-5 right-5 w-10 h-10 rounded-full bg-white/10 hover:bg-white/30 text-white flex items-center justify-center transition-all backdrop-blur-md border border-white/20 shadow-xl z-30 cursor-pointer active:scale-90"
                aria-label="Close modal"
              >
                <X className="h-5 w-5 text-white" />
              </button>

              <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
                
                {/* Poster & Main Titles */}
                <div className="flex items-start sm:items-center gap-5 max-w-3xl">
                  {/* Event Thumbnail / Poster Preview */}
                  <div 
                    onClick={() => {
                      const src = selectedEventDetails?.posterPreview || selectedEventDetails?.image || sparkImg;
                      if (src) setActiveImageLightbox(src);
                    }}
                    className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl bg-slate-900/60 border border-white/20 overflow-hidden shrink-0 shadow-2xl flex items-center justify-center p-1 backdrop-blur-sm cursor-pointer group relative hover:border-blue-400/60 transition-all"
                    title="Click to view full poster"
                  >
                    <img
                      src={selectedEventDetails?.posterPreview || selectedEventDetails?.image || sparkImg}
                      alt={selectedEventDetails?.title || "Event Poster"}
                      className="w-full h-full object-contain rounded-xl"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = sparkImg;
                      }}
                    />
                    <div className="absolute inset-0 bg-slate-950/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center rounded-xl">
                      <Eye className="h-4 w-4 text-white drop-shadow-md" />
                    </div>
                  </div>

                  <div className="space-y-2">
                    {/* Category & Status Pills */}
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest bg-blue-500/25 text-blue-300 border border-blue-400/30 backdrop-blur-md shadow-sm">
                        {selectedEventDetails?.category || "EVENT"}
                      </span>
                      {selectedEventDetails?.status && (
                        <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border backdrop-blur-md flex items-center gap-1.5 ${
                          selectedEventDetails.status === "Opened" 
                            ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/40" 
                            : selectedEventDetails.status === "Active"
                            ? "bg-blue-500/20 text-blue-300 border-blue-500/40"
                            : "bg-slate-500/20 text-slate-300 border-slate-500/40"
                        }`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${selectedEventDetails.status === "Opened" ? "bg-emerald-400 animate-ping" : "bg-blue-400"}`}></span>
                          {selectedEventDetails.status}
                        </span>
                      )}
                      {selectedEventDetails?.visibility && (
                        <span className="px-3 py-1 rounded-full text-[10px] font-bold text-slate-300 bg-white/10 border border-white/10">
                          {selectedEventDetails.visibility}
                        </span>
                      )}
                      {selectedEventDetails?.primaryTag && (
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold text-blue-200 bg-blue-900/40 border border-blue-500/30">
                          #{selectedEventDetails.primaryTag}
                        </span>
                      )}
                    </div>

                    {/* Event Title */}
                    <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-white leading-tight">
                      {selectedEventDetails?.title || "Event Information"}
                    </h2>

                    {/* Sub-info bar */}
                    <div className="flex items-center gap-4 text-xs text-slate-300 font-medium flex-wrap pt-0.5">
                      <span className="flex items-center gap-1.5">
                        <Calendar className="h-3.5 w-3.5 text-blue-400" />
                        {selectedEventDetails?.startDate || selectedEventDetails?.date || "TBD"}
                      </span>
                      <span>•</span>
                      <span className="flex items-center gap-1.5">
                        <MapPin className="h-3.5 w-3.5 text-sky-400" />
                        {selectedEventDetails?.location || "Virtual Hub"}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Edit Event Action Button */}
                {selectedEventDetails && (
                  <div className="shrink-0 self-end md:self-center">
                    <button
                      onClick={() => {
                        setIsDetailsModalOpen(false);
                        handleStartEditEvent(selectedEventDetails.id);
                      }}
                      className="px-5 py-2.5 bg-white text-slate-900 hover:bg-blue-50 rounded-2xl text-xs font-black transition-all shadow-xl hover:shadow-blue-500/20 flex items-center gap-2 border border-white/40 active:scale-95"
                    >
                      <Pencil className="h-4 w-4 text-[#2563EB]" />
                      Edit Event
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* 📜 SCROLLABLE BODY */}
            <div className="p-6 sm:p-8 overflow-y-auto bg-slate-100/60 flex-grow">
              {loadingDetails ? (
                <div className="py-20 text-center space-y-4">
                  <div className="animate-spin rounded-full h-12 w-12 border-4 border-slate-200 border-t-[#2563EB] mx-auto shadow-md"></div>
                  <p className="text-xs font-bold text-slate-500 tracking-wide uppercase">Fetching Event Details...</p>
                </div>
              ) : selectedEventDetails ? (
                // 2-COLUMN GRID LAYOUT
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                  {/* LEFT MAIN CONTENT (2 COLUMNS) */}
                  <div className="lg:col-span-2 space-y-6">

                    {/* 1. Basic Overview & Description */}
                    <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-sm space-y-4 relative overflow-hidden">
                      <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                        <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-2">
                          <div className="w-7 h-7 rounded-xl bg-blue-50 text-[#2563EB] flex items-center justify-center shadow-inner">
                            <Info className="h-4 w-4" />
                          </div>
                          1. Event Overview
                        </h3>
                        <span className="text-[10px] font-bold text-slate-400 bg-slate-50 px-2.5 py-1 rounded-full uppercase">
                          ID: {selectedEventDetails?.id ? String(selectedEventDetails.id).substring(0, 8) : "N/A"}
                        </span>
                      </div>

                      {selectedEventDetails?.description && (
                        <div className="bg-slate-50/80 p-4 rounded-2xl border border-slate-150/60">
                          <p className="text-xs text-slate-700 leading-relaxed font-medium">
                            {selectedEventDetails.description}
                          </p>
                        </div>
                      )}

                      {(selectedEventDetails?.company || selectedEventDetails?.batch) && (
                        <div className="grid grid-cols-2 gap-4 pt-1">
                          {selectedEventDetails?.company && (
                            <div className="bg-blue-50/40 p-3 rounded-2xl border border-blue-100/50">
                              <span className="text-[10px] font-extrabold text-blue-600 uppercase block tracking-wider">Company</span>
                              <span className="text-xs font-bold text-slate-800">{selectedEventDetails.company}</span>
                            </div>
                          )}
                          {selectedEventDetails?.batch && (
                            <div className="bg-purple-50/40 p-3 rounded-2xl border border-purple-100/50">
                              <span className="text-[10px] font-extrabold text-purple-600 uppercase block tracking-wider">Batch</span>
                              <span className="text-xs font-bold text-slate-800">{selectedEventDetails.batch}</span>
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    {/* 2 & 3. Date, Time & Location (Grid) */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Date & Time Mini Card */}
                      <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-sm space-y-3">
                        <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-2 border-b border-slate-100 pb-2.5">
                          <div className="w-7 h-7 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                            <Calendar className="h-4 w-4" />
                          </div>
                          2. Date & Time
                        </h4>
                        <div className="space-y-2 text-xs">
                          <div className="flex justify-between items-center py-1 border-b border-slate-50">
                            <span className="text-[10px] font-bold text-slate-400 uppercase">Start Date</span>
                            <span className="font-extrabold text-slate-800">{selectedEventDetails?.startDate || selectedEventDetails?.date || "TBD"}</span>
                          </div>
                          <div className="flex justify-between items-center py-1 border-b border-slate-50">
                            <span className="text-[10px] font-bold text-slate-400 uppercase">End Date</span>
                            <span className="font-extrabold text-slate-800">{selectedEventDetails?.endDate || "N/A"}</span>
                          </div>
                          <div className="flex justify-between items-center py-1 border-b border-slate-50">
                            <span className="text-[10px] font-bold text-slate-400 uppercase">Time Slot</span>
                            <span className="font-extrabold text-slate-800">
                              {selectedEventDetails?.startTime ? `${selectedEventDetails.startTime} - ${selectedEventDetails.endTime || ""}` : "TBD"}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Location Mini Card */}
                      <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-sm space-y-3">
                        <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-2 border-b border-slate-100 pb-2.5">
                          <div className="w-7 h-7 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center">
                            <MapPin className="h-4 w-4" />
                          </div>
                          3. Venue & Location
                        </h4>
                        <div className="space-y-2 text-xs">
                          <div className="py-1">
                            <span className="text-[10px] font-bold text-slate-400 uppercase block">Venue / Link</span>
                            <span className="font-extrabold text-slate-800 line-clamp-2 mt-0.5">{selectedEventDetails?.location || "Virtual Hub"}</span>
                          </div>
                          <div className="pt-2">
                            <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${selectedEventDetails?.isVirtual ? "bg-sky-50 text-sky-700 border border-sky-200" : "bg-purple-50 text-purple-700 border border-purple-200"}`}>
                              {selectedEventDetails?.isVirtual ? "🌐 Virtual Event" : "📍 In-Person Event"}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* 4. Registration Details */}
                    <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-sm space-y-4">
                      <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-2 border-b border-slate-100 pb-3">
                        <div className="w-7 h-7 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                          <Users className="h-4 w-4" />
                        </div>
                        4. Registration Status & Rules
                      </h3>

                      {/* Progress Bar */}
                      <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 space-y-2">
                        <div className="flex justify-between items-center text-xs font-extrabold">
                          <span className="text-slate-600">Capacity Filled</span>
                          <span className="text-[#2563EB]">
                            {selectedEventDetails?.currentReg || 0} / {selectedEventDetails?.maxReg || "Unlimited"} Seats
                          </span>
                        </div>
                        <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
                          <div 
                            className="bg-[#2563EB] h-2 rounded-full transition-all duration-500"
                            style={{ width: `${Math.min(100, Math.round(((Number(selectedEventDetails?.currentReg) || 0) / (Number(selectedEventDetails?.maxReg) || 50)) * 100))}%` }}
                          ></div>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1 text-center">
                        <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100">
                          <span className="text-[9px] font-bold text-slate-400 uppercase block">Fee</span>
                          <span className="text-xs font-black text-emerald-600">
                            {selectedEventDetails?.registrationFee ? `₹${selectedEventDetails.registrationFee}` : "Free"}
                          </span>
                        </div>
                        <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100">
                          <span className="text-[9px] font-bold text-slate-400 uppercase block">Deadline</span>
                          <span className="text-xs font-bold text-slate-800 truncate block">{selectedEventDetails?.regDeadline || "N/A"}</span>
                        </div>
                        <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100">
                          <span className="text-[9px] font-bold text-slate-400 uppercase block">Waitlist</span>
                          <span className="text-xs font-bold text-slate-800">{selectedEventDetails?.enableWaitlist ? "Enabled" : "Disabled"}</span>
                        </div>
                        <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100">
                          <span className="text-[9px] font-bold text-slate-400 uppercase block">Team Size</span>
                          <span className="text-xs font-bold text-slate-800">
                            {selectedEventDetails?.minTeamSize || 1} - {selectedEventDetails?.maxTeamSize || 4}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* 5. WhatsApp Group Link */}
                    <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-sm space-y-3">
                      <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-2 border-b border-slate-100 pb-3">
                        <div className="w-7 h-7 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
                          <MessageSquare className="h-4 w-4" />
                        </div>
                        5. WhatsApp Community Link
                      </h3>
                      {selectedEventDetails?.whatsGroupLink ? (
                        <div className="bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 p-4 rounded-2xl text-white shadow-lg flex flex-col sm:flex-row items-center justify-between gap-3">
                          <div className="space-y-0.5 text-center sm:text-left">
                            <span className="text-[10px] font-bold uppercase text-emerald-200 tracking-wider">Official Group</span>
                            <p className="text-xs font-mono font-bold text-white truncate max-w-xs sm:max-w-md">
                              {selectedEventDetails.whatsGroupLink}
                            </p>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <button
                              onClick={() => {
                                if (selectedEventDetails?.whatsGroupLink) {
                                  navigator.clipboard.writeText(selectedEventDetails.whatsGroupLink);
                                  setCopiedWhatsLink(true);
                                  setTimeout(() => setCopiedWhatsLink(false), 2000);
                                }
                              }}
                              className="px-3.5 py-2 bg-white/20 hover:bg-white/30 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 backdrop-blur-md border border-white/20 active:scale-95"
                            >
                              {copiedWhatsLink ? <Check className="h-3.5 w-3.5 text-emerald-300" /> : <Copy className="h-3.5 w-3.5" />}
                              {copiedWhatsLink ? "Copied!" : "Copy"}
                            </button>
                            <a
                              href={selectedEventDetails.whatsGroupLink}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="px-4 py-2 bg-white text-emerald-800 rounded-xl text-xs font-black hover:bg-emerald-50 transition-all shadow flex items-center gap-1.5 active:scale-95"
                            >
                              <ExternalLink className="h-3.5 w-3.5" />
                              Join Group
                            </a>
                          </div>
                        </div>
                      ) : (
                        <p className="text-xs text-slate-400 italic p-3 bg-slate-50 rounded-xl border border-slate-100">
                          No WhatsApp group link configured for this event.
                        </p>
                      )}
                    </div>

                    {/* 8. Media & Posters */}
                    <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-sm space-y-4">
                      <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                        <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-2">
                          <div className="w-7 h-7 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                            <Upload className="h-4 w-4" />
                          </div>
                          8. Event Posters & Media
                        </h3>
                        <span className="text-[10px] font-extrabold text-blue-600 uppercase tracking-wider">
                          Full View Enabled
                        </span>
                      </div>

                      {Array.isArray(selectedEventDetails?.posterImages) && selectedEventDetails.posterImages.length > 0 ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          {selectedEventDetails.posterImages.map((img: any, idx: number) => {
                            const imgSrc = img.preview || img;
                            return (
                              <div 
                                key={idx}
                                onClick={() => setActiveImageLightbox(imgSrc)}
                                className="rounded-2xl overflow-hidden border border-slate-200 bg-slate-900/5 p-2 shadow-sm group relative flex items-center justify-center cursor-pointer hover:border-blue-300 transition-all"
                              >
                                <img
                                  src={imgSrc}
                                  alt={`Poster ${idx + 1}`}
                                  className="w-full max-h-[500px] object-contain rounded-xl transition-transform duration-300 group-hover:scale-[1.01]"
                                />
                                <div className="absolute inset-0 bg-slate-950/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center rounded-2xl backdrop-blur-[2px]">
                                  <span className="bg-white/95 text-slate-900 px-3.5 py-1.5 rounded-full text-xs font-black shadow-lg flex items-center gap-1.5">
                                    <Eye className="h-3.5 w-3.5 text-[#2563EB]" /> Click for Full Lightbox
                                  </span>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      ) : (selectedEventDetails?.posterPreview || selectedEventDetails?.image) ? (
                        <div 
                          onClick={() => setActiveImageLightbox(selectedEventDetails?.posterPreview || selectedEventDetails?.image || sparkImg)}
                          className="w-full rounded-2xl overflow-hidden border border-slate-200 bg-slate-900/5 p-3 shadow-sm flex flex-col items-center justify-center cursor-pointer group relative hover:border-blue-300 transition-all"
                        >
                          <img 
                            src={selectedEventDetails?.posterPreview || selectedEventDetails?.image || sparkImg} 
                            alt="Full Event Poster" 
                            className="w-full max-h-[550px] object-contain rounded-xl transition-transform duration-300 group-hover:scale-[1.01]"
                            onError={(e) => {
                              (e.target as HTMLImageElement).src = sparkImg;
                            }}
                          />
                          <div className="absolute inset-0 bg-slate-950/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center rounded-2xl backdrop-blur-[2px]">
                            <span className="bg-white/95 text-slate-900 px-4 py-2 rounded-full text-xs font-black shadow-xl flex items-center gap-2 border border-white/40">
                              <Eye className="h-4 w-4 text-[#2563EB]" /> Click to Expand Full Poster
                            </span>
                          </div>
                        </div>
                      ) : (
                        <p className="text-xs text-slate-400 italic p-3 bg-slate-50 rounded-xl border border-slate-100">No media uploaded.</p>
                      )}
                    </div>

                    {/* 9. Speaker Information */}
                    <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-sm space-y-4">
                      <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-2 border-b border-slate-100 pb-3">
                        <div className="w-7 h-7 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                          <Sparkles className="h-4 w-4" />
                        </div>
                        9. Speaker & Guest Information
                      </h3>
                      {selectedEventDetails?.speakerName ? (
                        <div className="flex items-start gap-4 p-4 rounded-2xl bg-gradient-to-r from-slate-50 to-blue-50/30 border border-slate-200/70">
                          {selectedEventDetails.speakerImagePreview ? (
                            <img src={selectedEventDetails.speakerImagePreview} alt={selectedEventDetails.speakerName} className="w-16 h-16 rounded-2xl object-cover border-2 border-white shadow-md shrink-0" />
                          ) : (
                            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-700 text-white flex items-center justify-center font-black text-lg shadow-md shrink-0">
                              {String(selectedEventDetails.speakerName).substring(0, 2).toUpperCase()}
                            </div>
                          )}
                          <div className="space-y-1 text-left">
                            <h4 className="text-sm font-black text-slate-900">{selectedEventDetails.speakerName}</h4>
                            {selectedEventDetails.speakerRole && (
                              <span className="text-xs font-bold text-blue-600 block">{selectedEventDetails.speakerRole}</span>
                            )}
                            {selectedEventDetails.speakerBio && (
                              <p className="text-xs text-slate-650 font-medium leading-relaxed pt-1">{selectedEventDetails.speakerBio}</p>
                            )}
                            {selectedEventDetails.speakerLinkedin && (
                              <a href={selectedEventDetails.speakerLinkedin} target="_blank" rel="noopener noreferrer" className="text-xs font-extrabold text-[#2563EB] hover:underline inline-flex items-center gap-1 pt-2">
                                <ExternalLink className="h-3 w-3" /> View LinkedIn Profile
                              </a>
                            )}
                          </div>
                        </div>
                      ) : (
                        <p className="text-xs text-slate-400 italic p-3 bg-slate-50 rounded-xl border border-slate-100">No speaker details provided.</p>
                      )}
                    </div>

                    {/* 10. Event Agenda */}
                    <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-sm space-y-4">
                      <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-2 border-b border-slate-100 pb-3">
                        <div className="w-7 h-7 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                          <Clock className="h-4 w-4" />
                        </div>
                        10. Event Agenda & Timeline
                      </h3>
                      {Array.isArray(selectedEventDetails?.agendaItems) && selectedEventDetails.agendaItems.length > 0 ? (
                        <div className="space-y-3 relative before:absolute before:inset-0 before:left-4 before:w-0.5 before:bg-slate-150 pl-2">
                          {selectedEventDetails.agendaItems.map((item: any, idx: number) => (
                            <div key={idx} className="flex items-start gap-4 p-4 rounded-2xl bg-slate-50 border border-slate-200/60 relative z-10">
                              <span className="px-3 py-1 bg-white text-blue-700 font-mono font-black text-[10px] rounded-xl border border-slate-200 shrink-0 shadow-sm">
                                {item.time}
                              </span>
                              <div className="space-y-0.5 text-left">
                                <h5 className="text-xs font-bold text-slate-900">{item.title}</h5>
                                {item.description && <p className="text-[11px] text-slate-500 font-medium leading-relaxed">{item.description}</p>}
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-xs text-slate-400 italic p-3 bg-slate-50 rounded-xl border border-slate-100">No agenda configured.</p>
                      )}
                    </div>

                  </div>

                  {/* RIGHT SIDEBAR (1 COLUMN) */}
                  <div className="space-y-6">

                    {/* 6 & 7. Coordinators Widget */}
                    <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-sm space-y-4">
                      <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider border-b border-slate-100 pb-3">
                        Coordinators
                      </h3>

                      {/* 6. Faculty Coordinator */}
                      <div className="bg-purple-50/50 p-4 rounded-2xl border border-purple-100 space-y-1">
                        <span className="text-[9px] font-black text-purple-600 uppercase tracking-wider block">
                          6. Faculty Coordinator
                        </span>
                        <span className="text-xs font-black text-slate-800 block">
                          {selectedEventDetails?.facultyCoordinator || "Not Assigned"}
                        </span>
                      </div>

                      {/* 7. Student Coordinator */}
                      <div className="bg-orange-50/50 p-4 rounded-2xl border border-orange-100 space-y-1">
                        <span className="text-[9px] font-black text-orange-600 uppercase tracking-wider block">
                          7. Student Coordinator
                        </span>
                        <span className="text-xs font-black text-slate-800 block">
                          {selectedEventDetails?.studentCoordinator || "Not Assigned"}
                        </span>
                      </div>
                    </div>

                    {/* Event Quick Settings Summary */}
                    <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-sm space-y-3">
                      <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider border-b border-slate-100 pb-3">
                        Event Metadata
                      </h3>
                      
                      <div className="space-y-2.5 text-xs">
                        <div className="flex justify-between items-center">
                          <span className="text-[10px] font-bold text-slate-400 uppercase">Visibility</span>
                          <span className="font-extrabold text-slate-800">{selectedEventDetails?.visibility || "Public"}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-[10px] font-bold text-slate-400 uppercase">Featured</span>
                          <span className="font-extrabold text-slate-800">{selectedEventDetails?.isFeatured ? "Yes ✨" : "No"}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-[10px] font-bold text-slate-400 uppercase">Email Notify</span>
                          <span className="font-extrabold text-slate-800">{selectedEventDetails?.sendEmail !== false ? "Enabled" : "Disabled"}</span>
                        </div>
                      </div>
                    </div>

                    {/* Quick Edit Action Banner */}
                    <div className="bg-gradient-to-br from-blue-900 to-indigo-950 p-6 rounded-3xl text-white space-y-3 shadow-xl">
                      <h4 className="text-xs font-black uppercase tracking-wider text-blue-200">Need to update this event?</h4>
                      <p className="text-xs text-slate-300 font-medium">Click below to open the complete Edit Form with live editing options.</p>
                      <button
                        onClick={() => {
                          setIsDetailsModalOpen(false);
                          if (selectedEventDetails?.id) {
                            handleStartEditEvent(selectedEventDetails.id);
                          }
                        }}
                        className="w-full py-3 bg-white text-slate-950 font-black rounded-2xl text-xs hover:bg-blue-50 transition-all shadow-lg active:scale-95 flex items-center justify-center gap-2"
                      >
                        <Pencil className="h-4 w-4 text-[#2563EB]" />
                        Open Edit Event Page
                      </button>
                    </div>

                  </div>

                </div>

              ) : (
                <div className="py-12 text-center text-slate-400 text-xs font-bold">
                  No details found for this event.
                </div>
              )}
            </div>

            {/* MODAL FOOTER */}
            <div className="p-4 sm:px-8 bg-white border-t border-slate-200 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2 text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">
                <ShieldCheck className="h-4 w-4 text-blue-600" />
                <span>AI Verse Event Portal • Read Only</span>
              </div>
              <button
                onClick={() => setIsDetailsModalOpen(false)}
                className="px-6 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold rounded-2xl text-xs transition-colors shadow-sm active:scale-95"
              >
                Close View
              </button>
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

      {/* ================= LIGHTBOX FULL POSTER PREVIEW MODAL ================= */}
      {activeImageLightbox && (
        <div 
          className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/85 backdrop-blur-md p-4 sm:p-8 animate-in fade-in duration-200 cursor-pointer"
          onClick={() => setActiveImageLightbox(null)}
        >
          <img 
            src={activeImageLightbox} 
            alt="Full Resolution Event Poster" 
            onClick={(e) => e.stopPropagation()}
            className="max-h-[90vh] max-w-full object-contain rounded-2xl shadow-2xl border border-white/20 bg-slate-900 cursor-default select-none"
          />
        </div>
      )}
    </div>
  );
};

export default EventManagementPage;
