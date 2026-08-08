import React, { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import {
  Calendar,
  Clock,
  MapPin,
  ArrowRight,
  ArrowLeft,
  Check,
  Users,
  Info,
  ShieldAlert,
  Loader2,
  Trash2,
  ClipboardList,
  Send
} from "lucide-react";
import SEO from "../../components/layout/SEO";
import Button from "../../components/ui/Button";
import { db } from "../../config/firebase";
import { doc, getDoc, collection, addDoc, updateDoc, increment } from "firebase/firestore";

interface Teammate {
  name: string;
  email: string;
  studentId: string;
  phone?: string;
}

interface EventData {
  id: string;
  title: string;
  date: string;
  time: string;
  location: string;
  minTeamSize: number;
  maxTeamSize: number;
  currentReg: number;
  maxReg: number;
  posterPreview?: string;
  registrationFee?: number;
  category?: string;
}

const RegistrationPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();

  const [event, setEvent] = useState<EventData | null>(null);
  const [loading, setLoading] = useState(true);
  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [createdRegId, setCreatedRegId] = useState("");

  // Step 1 Form States
  const [groupName, setGroupName] = useState("");
  const [leadName, setLeadName] = useState("");
  const [leadEmail, setLeadEmail] = useState("");
  const [leadStudentId, setLeadStudentId] = useState("");
  const [leadPhone, setLeadPhone] = useState("");

  // Step 2 Form States (Additional Members)
  const [members, setMembers] = useState<Teammate[]>([]);
  const [agreedTerms, setAgreedTerms] = useState(false);
  const [confirmedInfo, setConfirmedInfo] = useState(false);

  useEffect(() => {
    const fetchEvent = async () => {
      if (!id) return;
      try {
        const docRef = doc(db, "events", id);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const data = docSnap.data();
          const minT = data.minTeamSize || 1;
          const maxT = data.maxTeamSize || 1;

          let timeText = data.time || "10:00 AM";
          if (data.startTime) {
            timeText = data.startTime;
            if (data.endTime) timeText += ` - ${data.endTime}`;
          }

          setEvent({
            id: docSnap.id,
            title: data.title || "",
            date: data.date || "Oct 24",
            time: timeText,
            location: data.location || "Virtual Hub",
            minTeamSize: minT,
            maxTeamSize: maxT,
            currentReg: Math.max(0, Number(data.currentReg) || 0),
            maxReg: data.maxReg || 100,
            posterPreview: data.posterPreview || "",
            registrationFee: data.registrationFee !== undefined ? data.registrationFee : 0,
            category: data.category || "Workshop"
          });

          // Initialize members array to satisfy minTeamSize (excluding lead)
          const initialTeammatesCount = Math.max(0, minT - 1);
          const initialMembers = Array.from({ length: initialTeammatesCount }, () => ({
            name: "",
            email: "",
            studentId: ""
          }));
          setMembers(initialMembers);
        }
      } catch (err) {
        console.error("Error loading event for registration:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchEvent();
  }, [id]);

  const handleAddTeammate = () => {
    if (event && members.length < event.maxTeamSize - 1) {
      setMembers([...members, { name: "", email: "", studentId: "" }]);
    }
  };

  const handleRemoveTeammate = (index: number) => {
    if (event && members.length > event.minTeamSize - 1) {
      setMembers(members.filter((_, idx) => idx !== index));
    }
  };

  const handleMemberChange = (index: number, field: keyof Teammate, value: string) => {
    setMembers(prev => prev.map((m, idx) => idx === index ? { ...m, [field]: value } : m));
  };

  const validateStep1 = () => {
    if (event && event.maxTeamSize > 1 && !groupName.trim()) {
      alert("Please enter a Group/Team Name.");
      return false;
    }
    if (!leadName.trim()) {
      alert("Please enter the Team Lead's name.");
      return false;
    }
    if (!leadEmail.trim() || !leadEmail.includes("@")) {
      alert("Please enter a valid Team Lead email address.");
      return false;
    }
    if (!leadStudentId.trim()) {
      alert("Please enter the Team Lead's Student ID.");
      return false;
    }
    if (!leadPhone.trim()) {
      alert("Please enter the Team Lead's Phone Number.");
      return false;
    }
    return true;
  };

  const validateStep2 = () => {
    for (let i = 0; i < members.length; i++) {
      const member = members[i];
      if (!member.name.trim()) {
        alert(`Please enter a name for Member ${i + 1}.`);
        return false;
      }
      if (!member.email.trim() || !member.email.includes("@")) {
        alert(`Please enter a valid email for Member ${i + 1}.`);
        return false;
      }
      if (!member.studentId.trim()) {
        alert(`Please enter a Student ID for Member ${i + 1}.`);
        return false;
      }
    }
    return true;
  };

  const handleSubmit = async () => {
    if (!id || !event) return;
    setSubmitting(true);
    try {
      const payload = {
        eventId: id,
        eventTitle: event.title,
        groupName: event.maxTeamSize > 1 ? groupName : "Individual RSVP",
        teamLeadName: leadName,
        teamLeadEmail: leadEmail,
        teamLeadStudentId: leadStudentId,
        teamLeadPhone: leadPhone,
        phoneNumber: leadPhone,
        members: members,
        teamSize: members.length + 1,
        createdAt: Date.now()
      };

      // Add document to registrations collection
      const regDocRef = await addDoc(collection(db, "registrations"), payload);
      await updateDoc(doc(db, "registrations", regDocRef.id), {
        qrCodeData: regDocRef.id
      });
      setCreatedRegId(regDocRef.id);

      // Increment registrations counter on event
      const docRef = doc(db, "events", id);
      await updateDoc(docRef, {
        currentReg: increment(members.length + 1)
      });

      setSuccess(true);
    } catch (err) {
      console.error("Error submitting registration:", err);
      alert("Failed to submit registration. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex flex-col items-center justify-center font-sans">
        <Loader2 className="h-8 w-8 text-blue-600 animate-spin mb-4" />
        <p className="text-sm font-semibold text-slate-500">Loading registration guidelines...</p>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex flex-col items-center justify-center font-sans text-center px-4">
        <ShieldAlert className="h-10 w-10 text-red-500 mb-4" />
        <h2 className="text-xl font-bold text-slate-800">Event Not Found</h2>
        <p className="text-xs text-slate-500 mt-1 max-w-sm">The event you are attempting to register for could not be found in the database.</p>
        <Link to="/events" className="mt-5">
          <Button variant="outline" className="rounded-xl text-xs">Back to Events</Button>
        </Link>
      </div>
    );
  }

  const isHackathon =
    event.category === "HACKATHONS" ||
    event.category === "Hackathon" ||
    event.category?.toLowerCase()?.includes("hackathon");

  if (!isHackathon) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex flex-col items-center justify-center font-sans text-center px-4">
        <Info className="h-10 w-10 text-blue-600 mb-4" />
        <h2 className="text-xl font-bold text-slate-800">No Registration Required</h2>
        <p className="text-xs text-slate-500 mt-1 max-w-md leading-relaxed font-medium">
          Registration is only required for Hackathons. The event <span className="font-bold text-slate-700">"{event.title}"</span> is an open public event with no registration required.
        </p>
        <Link to={`/events/${event.id}`} className="mt-5">
          <Button variant="gradient" className="rounded-xl text-xs font-bold px-6 py-2.5">View Event Details</Button>
        </Link>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex flex-col items-center justify-center font-sans text-center px-4 py-16">
        <SEO title="Registration Confirmed" description="Success screen confirming your event booking." />

        {/* Success Checkmark Badge */}
        <div className="w-16 h-16 rounded-full bg-white border border-slate-100 flex items-center justify-center text-blue-600 shadow-[0_8px_30px_rgba(37,99,235,0.15)] mb-6 animate-bounce">
          <Check className="h-8 w-8 stroke-[3]" />
        </div>

        {/* Successful Headline */}
        <h1 className="text-4xl font-black text-slate-800 tracking-tight leading-none">
          Registration <span className="text-[#2563EB]">Successful!</span>
        </h1>

        {/* Subtitle description */}
        <p className="text-slate-500 text-sm mt-3 max-w-xl font-semibold leading-relaxed">
          Welcome aboard. Your spot is reserved for the next frontier of intelligence. Get ready to push the boundaries of what's possible.
        </p>

        {/* Details Grid Container */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start w-full max-w-5xl mt-12">
          {/* Left Column (span 7) */}
          <div className="lg:col-span-7 space-y-6 text-left">

            {/* Confirmed Registration card */}
            <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-[0_8px_30px_rgba(0,0,0,0.015)] border-l-4 border-l-[#2563EB] flex items-center gap-4">
              <div className="w-11 h-11 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                <Users className="h-5 w-5" />
              </div>
              <div className="leading-normal">
                <span className="text-[9px] font-black text-[#2563EB] tracking-widest uppercase block">Confirmed Registration</span>
                <span className="text-sm font-black text-slate-800 mt-0.5 block">{groupName || leadName}</span>
                <span className="text-[10px] text-slate-450 font-semibold block mt-0.5">Part of the <span className="font-bold text-slate-750">{event.title}</span></span>
              </div>
            </div>

            {/* What's Next card */}
            <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-100 shadow-[0_8px_30px_rgba(0,0,0,0.015)] space-y-6">
              <h3 className="text-base font-extrabold text-slate-850 leading-tight">What's Next?</h3>
              <div className="space-y-6">

                {/* Step 1 */}
                <div className="flex gap-4">
                  <div className="w-7 h-7 rounded-full bg-blue-50/50 text-blue-600 border border-blue-100/50 flex items-center justify-center font-bold text-xs shrink-0">
                    1
                  </div>
                  <div className="leading-normal text-left">
                    <h4 className="text-xs font-black text-slate-850">Check your inbox</h4>
                    <p className="text-[10px] text-slate-500 font-semibold mt-0.5 leading-relaxed">
                      A confirmation email and digital receipt have been dispatched to your registered address.
                    </p>
                  </div>
                </div>

                {/* Step 2 */}
                <div className="flex gap-4">
                  <div className="w-7 h-7 rounded-full bg-blue-50/50 text-blue-600 border border-blue-100/50 flex items-center justify-center font-bold text-xs shrink-0">
                    2
                  </div>
                  <div className="leading-normal text-left">
                    <h4 className="text-xs font-black text-slate-855">Invite your team</h4>
                    <p className="text-[10px] text-slate-500 font-semibold mt-0.5 leading-relaxed">
                      Share the private access link with your fellow researchers to sync your portal experience.
                    </p>
                  </div>
                </div>

                {/* Step 3 */}
                <div className="flex gap-4">
                  <div className="w-7 h-7 rounded-full bg-blue-50/50 text-blue-600 border border-blue-100/50 flex items-center justify-center font-bold text-xs shrink-0">
                    3
                  </div>
                  <div className="leading-normal text-left">
                    <h4 className="text-xs font-black text-slate-850">Review pre-event materials</h4>
                    <p className="text-[10px] text-slate-500 font-semibold mt-0.5 leading-relaxed">
                      Access the 'Neural Foundations' whitepaper in your dashboard to prepare for the workshop.
                    </p>
                  </div>
                </div>

              </div>
            </div>
          </div>

          {/* Right Column (span 5) */}
          <div className="lg:col-span-5 space-y-6 text-left">
            {/* Event Logistics card */}
            <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-[0_8px_30px_rgba(0,0,0,0.015)] space-y-4">
              {/* Image banner with "In Person" badge */}
              <div className="relative rounded-2xl overflow-hidden h-32 bg-slate-150 border border-slate-100 flex items-center justify-center">
                {event.posterPreview ? (
                  <img
                    src={event.posterPreview}
                    alt={event.title}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <>
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-900/80 to-transparent z-10" />
                    <div className="absolute inset-0 bg-[radial-gradient(#ffffff_1px,transparent_1px)] [background-size:12px_12px] opacity-10" />
                    <span className="absolute bottom-3 left-4 right-4 z-20 text-[10px] font-bold text-white uppercase tracking-wider block truncate">
                      {event.title}
                    </span>
                  </>
                )}
                <span className="absolute top-3 right-3 z-20 px-2.5 py-0.5 bg-emerald-50 text-emerald-700 font-bold border border-emerald-100 rounded-full text-[9px] flex items-center gap-1">
                  <span className="w-1.5 h-1.5 bg-emerald-600 rounded-full animate-pulse"></span>
                  In Person
                </span>
              </div>

              <h3 className="text-sm font-black text-slate-850 leading-tight">Event Logistics</h3>

              <div className="space-y-3.5 text-xs text-slate-550 font-semibold pt-1 border-t border-slate-50">
                <div className="flex items-center gap-2.5">
                  <Calendar className="h-4.5 w-4.5 text-blue-600 shrink-0" />
                  <span>{event.date}</span>
                </div>
                <div className="flex items-center gap-2.5">
                  <Clock className="h-4.5 w-4.5 text-blue-600 shrink-0" />
                  <span>{event.time}</span>
                </div>
                <div className="flex items-center gap-2.5">
                  <MapPin className="h-4.5 w-4.5 text-blue-600 shrink-0" />
                  <div className="leading-tight">
                    <span>{event.location}</span>
                    <span className="text-[10px] text-slate-400 font-medium block mt-0.5">Silicon Plaza, Tech District</span>
                  </div>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-50/60">
                <button onClick={() => alert("Loading directions map...")} className="w-full py-2 bg-slate-50 border border-slate-200 text-slate-650 hover:bg-slate-100 font-bold rounded-2xl text-[10px] flex items-center justify-center gap-1.5 transition-colors">
                  <MapPin className="h-3.5 w-3.5 text-blue-600" />
                  View on Map
                </button>
              </div>
            </div>

            {/* Actions layout button mapping */}
            <div className="space-y-2">
              <Link to={`/ticket/${createdRegId}`}>
                <Button variant="gradient" className="w-full rounded-2xl py-3.5 font-bold text-xs flex items-center justify-center gap-1.5 shadow-md shadow-blue-600/10">
                  View Ticket
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            </div>
          </div>

        </div>

      </div>
    );
  }

  return (
    <div className="bg-[#F8FAFC] pb-24 text-left font-sans pt-24 min-h-screen">
      <SEO
        title={`Register for ${event.title} - AI Verse`}
        description={`Complete registration details to secure your spot for ${event.title}.`}
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

        {/* ================= STEPPER ================= */}
        <div className="max-w-3xl mx-auto mb-10">
          <div className="flex items-center justify-between relative">
            {/* Background progress track */}
            <div className="absolute left-0 right-0 top-1/2 h-[2px] bg-slate-200 -translate-y-1/2 -z-10" />
            <div
              className="absolute left-0 top-1/2 h-[2px] bg-blue-600 -translate-y-1/2 -z-10 transition-all duration-300"
              style={{ width: `${((step - 1) / 2) * 100}%` }}
            />

            {/* Step 1 Node */}
            <div className="flex flex-col items-center">
              <div className={`w-8 h-8 rounded-full border-2 font-black text-xs flex items-center justify-center shadow-sm transition-all duration-300
                ${step > 1 ? "bg-blue-600 border-blue-600 text-white" : "bg-white border-blue-600 text-blue-600"}
              `}>
                {step > 1 ? <Check className="h-4 w-4 stroke-[3]" /> : 1}
              </div>
              <span className={`text-[10px] font-bold mt-2 uppercase tracking-wide
                ${step >= 1 ? "text-blue-600" : "text-slate-400"}
              `}>
                Group Info
              </span>
            </div>

            {/* Step 2 Node */}
            <div className="flex flex-col items-center">
              <div className={`w-8 h-8 rounded-full border-2 font-black text-xs flex items-center justify-center shadow-sm transition-all duration-300
                ${step > 2 ? "bg-blue-600 border-blue-600 text-white" : step === 2 ? "bg-blue-600 border-blue-600 text-white" : "bg-white border-slate-200 text-slate-400"}
              `}>
                {step > 2 ? <Check className="h-4 w-4 stroke-[3]" /> : 2}
              </div>
              <span className={`text-[10px] font-bold mt-2 uppercase tracking-wide
                ${step >= 2 ? "text-blue-600" : "text-slate-400"}
              `}>
                Group Members
              </span>
            </div>

            {/* Step 3 Node */}
            <div className="flex flex-col items-center">
              <div className={`w-8 h-8 rounded-full border-2 font-black text-xs flex items-center justify-center shadow-sm transition-all duration-300
                ${step >= 3 ? "bg-blue-600 border-blue-600 text-white" : "bg-white border-slate-200 text-slate-400"}
              `}>
                3
              </div>
              <span className={`text-[10px] font-bold mt-2 uppercase tracking-wide
                ${step >= 3 ? "text-blue-600" : "text-slate-400"}
              `}>
                Review & Submit
              </span>
            </div>
          </div>
        </div>

        {/* Title */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-black text-slate-800 tracking-tight">Event Registration</h1>
          <p className="text-slate-500 text-xs sm:text-sm mt-1.5 font-semibold">
            {step === 1 && "Complete the first step to secure your spot. Start by forming your innovation group."}
            {step === 2 && "Add the members who will be joining your group."}
            {step === 3 && "Review all registration details before committing final submission details."}
          </p>
        </div>

        {step === 1 && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start animate-in fade-in duration-200">
            {/* Left Main Workspace (span 8) */}
            <div className="lg:col-span-8 space-y-6">
              <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-100 shadow-[0_8px_30px_rgba(0,0,0,0.015)] space-y-6">
                {event.maxTeamSize > 1 && (
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Group Name</label>
                    <input
                      type="text"
                      placeholder="e.g. Neural Nexus Alpha"
                      value={groupName}
                      onChange={(e) => setGroupName(e.target.value)}
                      className="w-full px-4 py-2.5 border border-slate-200 rounded-2xl focus:outline-none focus:border-blue-500 font-medium text-sm text-slate-855 bg-slate-50/30 focus:bg-white transition-all"
                    />
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Team Lead Name</label>
                    <input
                      type="text"
                      placeholder="Full legal name"
                      value={leadName}
                      onChange={(e) => setLeadName(e.target.value)}
                      className="w-full px-4 py-2.5 border border-slate-200 rounded-2xl focus:outline-none focus:border-blue-500 font-medium text-sm text-slate-850 bg-slate-50/30 focus:bg-white transition-all"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Team Lead Student ID</label>
                    <input
                      type="text"
                      placeholder="24pa******"
                      value={leadStudentId}
                      onChange={(e) => setLeadStudentId(e.target.value)}
                      className="w-full px-4 py-2.5 border border-slate-200 rounded-2xl focus:outline-none focus:border-blue-500 font-medium text-sm text-slate-850 bg-slate-50/30 focus:bg-white transition-all"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Team Lead Email</label>
                    <input
                      type="email"
                      placeholder="student@vishnu.edu.in"
                      value={leadEmail}
                      onChange={(e) => setLeadEmail(e.target.value)}
                      className="w-full px-4 py-2.5 border border-slate-200 rounded-2xl focus:outline-none focus:border-blue-500 font-medium text-sm text-slate-850 bg-slate-50/30 focus:bg-white transition-all"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Lead Phone Number</label>
                    <input
                      type="tel"
                      placeholder="1234567890"
                      value={leadPhone}
                      onChange={(e) => setLeadPhone(e.target.value)}
                      className="w-full px-4 py-2.5 border border-slate-200 rounded-2xl focus:outline-none focus:border-blue-500 font-medium text-sm text-slate-850 bg-slate-50/30 focus:bg-white transition-all"
                    />
                  </div>
                </div>

                <div className="pt-4 flex justify-end">
                  <Button
                    variant="gradient"
                    onClick={() => {
                      if (validateStep1()) {
                        if (event.maxTeamSize > 1) {
                          setStep(2);
                        } else {
                          setStep(3); // Skip step 2 for individual events
                        }
                      }
                    }}
                    className="rounded-2xl px-6 py-3 font-bold text-xs flex items-center gap-1.5"
                  >
                    Proceed to Member Details
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>

            {/* Right Metadata Sidebar (span 4) */}
            <div className="lg:col-span-4 space-y-6">
              <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-[0_8px_30px_rgba(0,0,0,0.015)] space-y-5 text-left">
                <h3 className="text-sm font-black text-slate-400 uppercase tracking-wider pb-3 border-b border-slate-50">
                  Event Details
                </h3>
                <div className="space-y-4">
                  <h4 className="text-base font-extrabold text-slate-800 leading-snug">{event.title}</h4>
                  <div className="space-y-3 text-xs text-slate-550 font-semibold pt-1 border-t border-slate-50 mt-1">
                    <div className="flex items-center gap-2.5">
                      <Calendar className="h-4.5 w-4.5 text-blue-600 shrink-0" />
                      <span>{event.date}</span>
                    </div>
                    <div className="flex items-center gap-2.5">
                      <Clock className="h-4.5 w-4.5 text-blue-600 shrink-0" />
                      <span>{event.time}</span>
                    </div>
                    <div className="flex items-center gap-2.5">
                      <MapPin className="h-4.5 w-4.5 text-blue-600 shrink-0" />
                      <span>{event.location}</span>
                    </div>
                  </div>
                </div>
              </div>

              {event.maxTeamSize > 1 && (
                <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-[0_8px_30px_rgba(0,0,0,0.015)] space-y-4 text-left">
                  <h3 className="text-sm font-black text-slate-400 uppercase tracking-wider pb-3 border-b border-slate-50">
                    Requirements
                  </h3>
                  <div className="space-y-3.5">
                    <div className="flex items-center gap-2">
                      <div className="w-5 h-5 rounded-full bg-emerald-50 text-emerald-600 border border-emerald-100 flex items-center justify-center shrink-0">
                        <Check className="h-3 w-3 stroke-[2.5]" />
                      </div>
                      <span className="text-xs text-slate-650 font-semibold">Minimum <span className="font-extrabold text-slate-800">{event.minTeamSize} members</span></span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-5 h-5 rounded-full bg-emerald-50 text-emerald-600 border border-emerald-100 flex items-center justify-center shrink-0">
                        <Check className="h-3 w-3 stroke-[2.5]" />
                      </div>
                      <span className="text-xs text-slate-650 font-semibold">Maximum <span className="font-extrabold text-slate-800">{event.maxTeamSize} members</span></span>
                    </div>
                  </div>
                </div>
              )}

              <div className="bg-amber-50/50 p-4 rounded-2xl border border-amber-100/40 text-left flex gap-2.5">
                <Info className="h-4.5 w-4.5 text-amber-600 shrink-0 mt-0.5" />
                <p className="text-[10px] text-slate-500 font-semibold leading-relaxed">
                  "Ensure your student ID is correct. This is used for verification and issuing digital certificates."
                </p>
              </div>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-8 animate-in fade-in duration-200">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
              {/* Left Column (span 4): Registration Summary */}
              <div className="lg:col-span-4 space-y-6">
                {/* Registration Summary */}
                <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-[0_8px_30px_rgba(0,0,0,0.015)] space-y-4 text-left">
                  <h3 className="text-xs font-black text-slate-400 uppercase tracking-wider pb-3 border-b border-slate-50 flex items-center gap-2">
                    <ClipboardList className="h-4 w-4 text-blue-600" />
                    Registration Summary
                  </h3>

                  {event.maxTeamSize > 1 && (
                    <div className="space-y-1 bg-slate-50/50 p-3.5 rounded-2xl border border-slate-100/50">
                      <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Group Name</span>
                      <span className="text-xs font-extrabold text-slate-800 block truncate">{groupName}</span>
                    </div>
                  )}

                  <div className="bg-slate-50/50 p-3.5 rounded-2xl border border-slate-100/50 space-y-2">
                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Team Lead</span>
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-[10px] shrink-0 uppercase">
                        {leadName ? leadName.substring(0, 2).toUpperCase() : "TL"}
                      </div>
                      <div className="leading-tight text-left truncate">
                        <span className="text-[10px] font-extrabold text-slate-850 block">{leadName}</span>
                        <span className="text-[8px] font-bold text-slate-450 block mt-0.5">{leadEmail}</span>
                      </div>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-slate-50/60 text-xs font-bold text-slate-400 text-left">
                    <span>Event: {event.title}</span>
                  </div>
                </div>
              </div>

              {/* Right Column (span 8): Member Details form */}
              <div className="lg:col-span-8 space-y-6 text-left">
                <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-100 shadow-[0_8px_30px_rgba(0,0,0,0.015)] space-y-6">

                  <div className="flex justify-between items-center border-b border-slate-50 pb-3">
                    <div>
                      <h3 className="text-base font-extrabold text-slate-855 leading-tight">Member Details</h3>
                      <p className="text-[10px] text-slate-450 font-semibold mt-0.5">Add the members who will be joining your group.</p>
                    </div>
                    <span className="px-2.5 py-1 bg-blue-50 text-blue-700 font-black rounded-full text-[9px] border border-blue-100/30">
                      {members.length === 1 ? "1 Member Added" : `${members.length} Members Added`}
                    </span>
                  </div>

                  <div className="space-y-4 max-h-[450px] overflow-y-auto pr-1">
                    {members.map((member, idx) => (
                      <div key={idx} className="p-4 border border-slate-100 bg-slate-50/10 rounded-2xl space-y-3.5 relative">
                        <div className="flex justify-between items-center">
                          <span className="text-[9px] font-black text-blue-600 tracking-wider">TEAM MEMBER #{idx + 2}</span>
                          {members.length > event.minTeamSize - 1 && (
                            <button
                              type="button"
                              onClick={() => handleRemoveTeammate(idx)}
                              className="text-red-500 hover:text-red-750 font-bold text-[9px] hover:bg-red-50 px-2 py-1 rounded-lg transition-colors flex items-center gap-1"
                            >
                              <Trash2 className="h-3 w-3" />
                              Remove
                            </button>
                          )}
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1">Full Name</label>
                            <input
                              type="text"
                              placeholder="e.g. Sarah Jenkins"
                              value={member.name}
                              onChange={(e) => handleMemberChange(idx, "name", e.target.value)}
                              className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:border-blue-500 font-semibold text-xs text-slate-800 bg-white"
                            />
                          </div>
                          <div>
                            <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1">University Email</label>
                            <input
                              type="email"
                              placeholder="s.jenkins@univ.edu"
                              value={member.email}
                              onChange={(e) => handleMemberChange(idx, "email", e.target.value)}
                              className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:border-blue-500 font-semibold text-xs text-slate-800 bg-white"
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1">Student ID</label>
                            <input
                              type="text"
                              placeholder="24pa******"
                              value={member.studentId}
                              onChange={(e) => handleMemberChange(idx, "studentId", e.target.value)}
                              className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:border-blue-500 font-semibold text-xs text-slate-800 bg-white"
                            />
                          </div>
                          <div>
                            <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1">Phone Number</label>
                            <input
                              type="tel"
                              placeholder="1234567890"
                              value={member.phone || ""}
                              onChange={(e) => handleMemberChange(idx, "phone", e.target.value)}
                              className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:border-blue-500 font-semibold text-xs text-slate-800 bg-white"
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {members.length < event.maxTeamSize - 1 && (
                    <button
                      type="button"
                      onClick={handleAddTeammate}
                      className="w-full py-2.5 border border-dashed border-slate-200 hover:border-blue-500 rounded-2xl text-slate-500 hover:text-blue-600 font-bold text-xs bg-slate-50/20 hover:bg-blue-50/10 flex items-center justify-center gap-1.5 transition-all shadow-sm"
                    >
                      <Users className="h-3.5 w-3.5" />
                      Add Another Member
                    </button>
                  )}

                  <div className="pt-4 flex justify-between">
                    <button
                      onClick={() => setStep(1)}
                      className="rounded-2xl px-5 py-2.5 font-bold text-xs bg-white text-slate-700 flex items-center gap-1.5 border border-slate-200 hover:bg-slate-50 transition-colors"
                    >
                      <ArrowLeft className="h-4 w-4" />
                      Previous Step
                    </button>
                    <Button
                      variant="gradient"
                      onClick={() => {
                        if (validateStep2()) {
                          setStep(3);
                        }
                      }}
                      className="rounded-2xl px-6 py-3 font-bold text-xs flex items-center gap-1.5"
                    >
                      Proceed to Review
                      <ArrowRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </div>

            {/* Requirements Card (Moved to the very bottom of the page) */}
            {event.maxTeamSize > 1 && (
              <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-[0_8px_30px_rgba(0,0,0,0.015)] space-y-3 text-left">
                <h3 className="text-xs font-black text-[#2563EB] uppercase tracking-wider pb-2 border-b border-slate-50">
                  Requirements
                </h3>

                <div className="space-y-2 text-xs text-slate-600 font-semibold leading-relaxed">
                  <p>Minimum <span className="text-slate-800 font-bold">{event.minTeamSize} members</span>, maximum <span className="text-slate-800 font-bold">{event.maxTeamSize} members</span> allowed per group. Ensure all emails are official university IDs.</p>
                </div>
              </div>
            )}
          </div>
        )}

        {step === 3 && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start animate-in fade-in duration-200">
            {/* Left Column (span 8): Group Identity + Team Roster */}
            <div className="lg:col-span-8 space-y-6">

              {/* Group Identity Card */}
              <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-100 shadow-[0_8px_30px_rgba(0,0,0,0.015)] space-y-6 text-left">
                <div className="flex justify-between items-center border-b border-slate-55 pb-3">
                  <h3 className="text-sm font-black text-slate-800 tracking-tight flex items-center gap-2">
                    <Users className="h-4.5 w-4.5 text-blue-600" />
                    Group Identity
                  </h3>
                  <button
                    onClick={() => setStep(1)}
                    className="text-xs text-blue-600 hover:text-blue-700 font-bold"
                  >
                    Edit
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-y-5 gap-x-8">
                  {event.maxTeamSize > 1 && (
                    <div className="space-y-1">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Group Name</span>
                      <span className="text-xs font-black text-slate-800 block">{groupName || "Individual RSVP"}</span>
                    </div>
                  )}
                  <div className="space-y-1">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Team Lead Name</span>
                    <span className="text-xs font-black text-slate-800 block">{leadName}</span>
                  </div>
                  <div className="space-y-1">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Lead Email</span>
                    <span className="text-xs font-black text-slate-800 block">{leadEmail}</span>
                  </div>
                  <div className="space-y-1">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Lead Student ID</span>
                    <span className="text-xs font-black text-slate-800 block">{leadStudentId}</span>
                  </div>
                </div>
              </div>

              {/* Team Roster Card */}
              {members.length > 0 && (
                <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-100 shadow-[0_8px_30px_rgba(0,0,0,0.015)] space-y-6 text-left">
                  <div className="flex justify-between items-center border-b border-slate-55 pb-3">
                    <h3 className="text-sm font-black text-slate-800 tracking-tight flex items-center gap-2">
                      <ClipboardList className="h-4.5 w-4.5 text-blue-600" />
                      Team Roster
                    </h3>
                    <button
                      onClick={() => setStep(2)}
                      className="text-xs text-blue-600 hover:text-blue-700 font-bold"
                    >
                      Edit
                    </button>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs text-slate-650">
                      <thead>
                        <tr className="border-b border-slate-100 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                          <th className="pb-3 pr-4 font-bold text-left">Name</th>
                          <th className="pb-3 px-4 font-bold text-left">Email</th>
                          <th className="pb-3 px-4 font-bold text-left">Phone Number</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50 font-medium text-slate-750">
                        {members.map((m, idx) => (
                          <tr key={idx} className="hover:bg-slate-50/20">
                            <td className="py-3.5 pr-4 font-bold text-slate-800">{m.name}</td>
                            <td className="py-3.5 px-4 font-semibold text-slate-550">{m.email}</td>
                            <td className="py-3.5 px-4 text-slate-500 font-bold">{m.phone || "N/A"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

            </div>

            {/* Right Column (span 4): Event Recap + Terms Checkbox & Submit */}
            <div className="lg:col-span-4 space-y-6">

              {/* Event Recap Card */}
              <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-[0_8px_30px_rgba(0,0,0,0.015)] space-y-4 text-left">
                <h3 className="text-sm font-black text-slate-800 tracking-tight pb-3 border-b border-slate-50">
                  Event Recap
                </h3>

                <div className="space-y-4">
                  {/* Premium illustration or map badge banner */}
                  <div className="relative rounded-2xl overflow-hidden h-28 bg-slate-150 border border-slate-100 flex items-center justify-center">
                    {event.posterPreview ? (
                      <img
                        src={event.posterPreview}
                        alt={event.title}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <>
                        <div className="absolute inset-0 bg-gradient-to-t from-slate-900/80 to-transparent z-10" />
                        <div className="absolute inset-0 bg-[radial-gradient(#ffffff_1px,transparent_1px)] [background-size:12px_12px] opacity-10" />
                        <span className="absolute bottom-3 left-4 right-4 z-20 text-[10px] font-bold text-white uppercase tracking-wider block truncate">
                          {event.title}
                        </span>
                      </>
                    )}
                  </div>

                  <div className="space-y-3.5 text-xs text-slate-550 font-semibold pt-1 border-t border-slate-50">
                    <div className="flex items-center gap-2.5">
                      <Calendar className="h-4.5 w-4.5 text-blue-600 shrink-0" />
                      <span>{event.date}</span>
                    </div>
                    <div className="flex items-center gap-2.5">
                      <Clock className="h-4.5 w-4.5 text-blue-600 shrink-0" />
                      <span>{event.time}</span>
                    </div>
                    <div className="flex items-center gap-2.5">
                      <MapPin className="h-4.5 w-4.5 text-blue-600 shrink-0" />
                      <span>{event.location}</span>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-slate-100/80 space-y-2 text-[11px] font-bold text-slate-400">
                    <div className="flex justify-between items-center">
                      <span>Group Registration Fee</span>
                      <span className="text-slate-800">
                        {event.registrationFee && event.registrationFee > 0 ? `$${event.registrationFee.toFixed(2)}` : "Free"}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span>Members ({members.length + 1})</span>
                      <span className="text-slate-800">Included</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Confirm Card */}
              <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-[0_8px_30px_rgba(0,0,0,0.015)] space-y-5 text-left">
                <div className="space-y-3.5">
                  <label className="flex gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={agreedTerms}
                      onChange={(e) => setAgreedTerms(e.target.checked)}
                      className="mt-0.5 h-4 w-4 rounded border-slate-350 text-blue-600 focus:ring-blue-500 cursor-pointer"
                    />
                    <span className="text-[10px] font-semibold text-slate-500 leading-normal select-none cursor-pointer">
                      I agree to the <span className="text-blue-600 hover:underline font-bold">Terms and Conditions</span> of the AI Innovation Club.
                    </span>
                  </label>

                  <label className="flex gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={confirmedInfo}
                      onChange={(e) => setConfirmedInfo(e.target.checked)}
                      className="mt-0.5 h-4 w-4 rounded border-slate-350 text-blue-600 focus:ring-blue-500 cursor-pointer"
                    />
                    <span className="text-[10px] font-semibold text-slate-500 leading-normal select-none cursor-pointer">
                      I confirm all provided information is accurate and final.
                    </span>
                  </label>
                </div>

                <div className="space-y-2 pt-2">
                  <Button
                    variant="gradient"
                    onClick={handleSubmit}
                    disabled={submitting || !agreedTerms || !confirmedInfo}
                    className="w-full rounded-2xl py-3 font-bold text-xs flex items-center justify-center gap-1.5 shadow-md shadow-blue-600/10 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {submitting ? (
                      <>
                        <Loader2 className="h-4.5 w-4.5 animate-spin" />
                        Submitting...
                      </>
                    ) : (
                      <>
                        Submit Registration
                        <Send className="h-4 w-4" />
                      </>
                    )}
                  </Button>

                  <button
                    onClick={() => setStep(2)}
                    className="w-full py-2.5 bg-white border border-slate-200 text-slate-550 hover:bg-slate-50 font-bold rounded-2xl text-[10px] flex items-center justify-center gap-1.5 transition-colors"
                  >
                    <ArrowLeft className="h-4 w-4" />
                    Back to Members
                  </button>
                </div>
              </div>
            </div>

          </div>
        )}

      </div>
    </div>
  );
};

export default RegistrationPage;
