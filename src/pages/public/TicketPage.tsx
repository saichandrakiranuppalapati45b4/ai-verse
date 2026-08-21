import React, { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { db } from "../../config/firebase";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import SEO from "../../components/layout/SEO";
import { 
   Download, 
   Loader2, 
   MessageSquare, 
   Home,
   Clock,
   ShieldCheck,
   Calendar,
   MapPin,
   Sparkles,
   Users
} from "lucide-react";

interface Teammate {
  name: string;
  email: string;
  studentId: string;
  role?: string;
}

interface RegistrationData {
  eventId: string;
  eventTitle: string;
  groupName: string;
  teamLeadName: string;
  teamLeadEmail: string;
  teamLeadPersonalEmail?: string;
  teamLeadCollegeEmail?: string;
  teamLeadStudentId: string;
  members: Teammate[];
  teamSize: number;
  qrCodeData?: string;
  status?: string;
  paymentStatus?: string;
  isPaidEvent?: boolean;
  totalFeePaid?: number;
}

interface EventData {
  title: string;
  date: string;
  time: string;
  location: string;
  whatsGroupLink?: string;
  registrationFee?: number;
  isPaidEvent?: boolean;
}

const TicketPage: React.FC = () => {
  const { registrationId } = useParams<{ registrationId: string }>();
  const [registration, setRegistration] = useState<RegistrationData | null>(null);
  const [event, setEvent] = useState<EventData | null>(null);
  const [loading, setLoading] = useState(true);



  useEffect(() => {
    const fetchData = async () => {
      if (!registrationId) {
        setLoading(false);
        return;
      }
      try {
        const regSnap = await getDoc(doc(db, "registrations", registrationId));
        if (regSnap.exists()) {
          const regData = regSnap.data() as RegistrationData;
          setRegistration(regData);

          // Save QR code details in the database if not present
          if (!regData.qrCodeData) {
            try {
              await updateDoc(doc(db, "registrations", registrationId), {
                qrCodeData: registrationId
              });
            } catch (updateErr) {
              console.error("Error writing qrCodeData to Firestore registrations:", updateErr);
            }
          }

          // Fetch event details
          if (regData.eventId) {
            const eventSnap = await getDoc(doc(db, "events", regData.eventId));
            if (eventSnap.exists()) {
              setEvent(eventSnap.data() as EventData);
            }
          }
        }
      } catch (err) {
        console.error("Error loading registration ticket:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [registrationId]);

  const handleDownloadQR = async () => {
    try {
      const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${registrationId || "mock_reg_123"}`;
      
      // Load QR code image asynchronously
      const qrImage = new Image();
      qrImage.crossOrigin = "anonymous";
      
      qrImage.onload = () => {
        const canvas = document.createElement("canvas");
        canvas.width = 600;
        canvas.height = 660;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        // 1. Draw Background Card
        ctx.fillStyle = "#FFFFFF";
        ctx.fillRect(0, 0, 600, 660);

        // Draw soft inner card border
        ctx.strokeStyle = "#E2E8F0";
        ctx.lineWidth = 4;
        ctx.strokeRect(20, 20, 560, 620);

        // 2. Draw Premium Top Header Band (Indigo Gradient)
        const gradient = ctx.createLinearGradient(20, 20, 580, 20);
        gradient.addColorStop(0, "#2563EB");
        gradient.addColorStop(1, "#4F46E5");
        ctx.fillStyle = gradient;
        
        ctx.beginPath();
        // Fallback for older environments without Canvas ctx.roundRect
        if (ctx.roundRect) {
          ctx.roundRect(22, 22, 556, 120, [16, 16, 0, 0]);
        } else {
          ctx.rect(22, 22, 556, 120);
        }
        ctx.fill();

        // Header Text
        ctx.fillStyle = "#FFFFFF";
        ctx.textAlign = "center";
        ctx.font = "bold 14px sans-serif";
        ctx.fillText("AI VERSE PORTAL", 300, 70);
        ctx.font = "900 24px sans-serif";
        ctx.fillText("ATTENDANCE TICKET", 300, 105);

        // 3. Draw Event Name
        ctx.fillStyle = "#1E293B";
        ctx.font = "900 28px sans-serif";
        const title = displayTitle.toUpperCase();
        if (title.length > 28) {
          ctx.fillText(title.substring(0, 28), 300, 200);
          ctx.fillText(title.substring(28), 300, 235);
        } else {
          ctx.fillText(title, 300, 210);
        }

        // 4. Draw Team Name
        ctx.fillStyle = "#2563EB";
        ctx.font = "bold 20px sans-serif";
        ctx.fillText(`TEAM: ${displayGroupName}`, 300, 280);

        // 5. Draw QR Code Frame Brackets & QR Code
        ctx.fillStyle = "#F8FAFC";
        ctx.fillRect(175, 330, 250, 250);
        ctx.drawImage(qrImage, 175, 330, 250, 250);

        // Viewfinder Brackets
        ctx.strokeStyle = "#2563EB";
        ctx.lineWidth = 3;
        const offset = 8;
        ctx.beginPath();
        ctx.moveTo(175 - offset, 330 - offset + 20);
        ctx.lineTo(175 - offset, 330 - offset);
        ctx.lineTo(175 - offset + 20, 330 - offset);
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(425 + offset - 20, 330 - offset);
        ctx.lineTo(425 + offset, 330 - offset);
        ctx.lineTo(425 + offset, 330 - offset + 20);
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(175 - offset, 580 + offset - 20);
        ctx.lineTo(175 - offset, 580 + offset);
        ctx.lineTo(175 - offset + 20, 580 + offset);
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(425 + offset - 20, 580 + offset);
        ctx.lineTo(425 + offset, 580 + offset);
        ctx.lineTo(425 + offset, 580 + offset - 20);
        ctx.stroke();

        // Instruction Text
        ctx.fillStyle = "#64748B";
        ctx.font = "bold 12px sans-serif";
        ctx.fillText("SCAN WITH MOBILE APP TO LOG ATTENDANCE", 300, 615);



        // Convert to data url and download
        const blobUrl = canvas.toDataURL("image/png");
        const link = document.createElement("a");
        link.href = blobUrl;
        
        const cleanGroupName = displayGroupName.toLowerCase().replace(/[^a-z0-9]+/g, "_");
        const cleanEventName = displayTitle.toLowerCase().replace(/[^a-z0-9]+/g, "_");
        link.download = `${cleanEventName}_${cleanGroupName}_ticket.png`;
        
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      };

      qrImage.onerror = (err) => {
        console.error("Failed to load QR image for canvas conversion", err);
        alert("Failed to compile ticket image. Please try again.");
      };

      qrImage.src = qrUrl;
    } catch (err) {
      console.error("Error downloading QR code ticket:", err);
      alert("Failed to download QR code ticket. Please try again.");
    }
  };

  // Fallback metadata if database record is missing or incomplete
  const displayTitle = event?.title || registration?.eventTitle || "Neural Hackathon 2024";
  const displayGroupName = registration?.groupName || "Team Cyberdyne";
  


  return (
    <div className="min-h-screen bg-slate-50/50 flex flex-col font-sans text-left">
      <SEO 
        title={`Registration Ticket - ${displayTitle} - AI Verse`}
        description="Your registration has been completed and is under review to confirm."
      />

      {/* ================= TICKET BODY ================= */}
      {loading ? (
        <div className="flex-1 flex flex-col items-center justify-center p-20">
          <Loader2 className="h-10 w-10 text-blue-600 animate-spin" />
          <p className="text-xs text-slate-400 mt-3 font-medium">Retrieving ticket details...</p>
        </div>
      ) : (
        <main className="max-w-4xl mx-auto px-4 sm:px-6 py-10 w-full flex-1 space-y-8">
          
          {/* Header section with Prominent Under Review Badge */}
          <div className="text-center space-y-3 max-w-2xl mx-auto">
            <div className="flex justify-center">
              <span className="bg-amber-50 text-amber-800 font-extrabold text-[11px] px-4 py-1.5 rounded-full uppercase tracking-wider border border-amber-200 shadow-2xs inline-flex items-center gap-2">
                <Clock className="w-4 h-4 text-amber-600 animate-pulse" />
                Under Review to Confirm
              </span>
            </div>
            
            <h1 className="text-3xl sm:text-4xl font-black text-slate-850 tracking-tight leading-tight">
              Registration Completed!
            </h1>
            
            <p className="text-slate-600 text-sm font-medium leading-relaxed">
              Your registration for <strong className="text-blue-600 font-bold">{displayTitle}</strong> was successfully submitted and <strong className="text-amber-700 font-bold">is under review to confirm</strong> by the event coordinators.
            </p>
          </div>

          {/* Under Review Notice Card */}
          <div className="max-w-2xl mx-auto w-full bg-gradient-to-r from-amber-50/80 via-white to-blue-50/50 border border-amber-200/90 rounded-3xl p-5 sm:p-6 shadow-xs flex items-start gap-4 text-left">
            <div className="w-10 h-10 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0 border border-amber-200 mt-0.5">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div className="space-y-1">
              <h4 className="text-sm font-black text-slate-800">
                Application Received & Verification in Progress
              </h4>
              <p className="text-xs text-slate-600 font-medium leading-relaxed">
                Our faculty and event organizing team are currently verifying your participant details and payment receipt. Once approved, you will receive an official confirmation notice and login credentials at your registered email.
              </p>
              {registration?.teamLeadEmail && (
                <div className="pt-1.5 text-[11px] text-slate-500 font-medium flex items-center gap-1.5">
                  <span>Registered updates email:</span>
                  <span className="font-mono font-bold text-slate-700">{registration.teamLeadEmail}</span>
                </div>
              )}
            </div>
          </div>

          {/* Main Grid: QR Ticket & Summary */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6 max-w-3xl mx-auto items-start">
            
            {/* Left/Center: QR Pass Card (span 7) */}
            <div className="md:col-span-7 bg-white border border-slate-200/80 rounded-3xl p-6 sm:p-7 flex flex-col items-center justify-center space-y-5 relative overflow-hidden shadow-xs text-center">
              <div className="w-full flex items-center justify-between pb-2 border-b border-slate-100">
                <span className="text-[10px] font-black text-blue-600 uppercase tracking-wider flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-blue-600" />
                  Provisional Entry Pass
                </span>
                <span className="text-[10px] font-bold text-slate-400 font-mono">
                  ID: #{registrationId?.slice(-6) || "REG-PASS"}
                </span>
              </div>

              {/* Outer Viewfinder Box */}
              <div className="w-48 h-48 rounded-2xl border-2 border-dashed border-blue-500/80 p-2.5 bg-slate-50 flex items-center justify-center relative overflow-hidden shadow-inner">
                {/* Laser animation line */}
                <div className="absolute top-0 left-0 w-full h-1 bg-blue-500 shadow-[0_0_8px_#3b82f6] animate-[bounce_2.5s_infinite]"></div>
                {/* QR Code image from dynamic registration ID */}
                <img 
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${registrationId || "mock_reg_123"}`} 
                  alt="Ticket QR Code" 
                  className="w-full h-full object-contain relative z-10 p-1" 
                />
              </div>

              {/* Attendance instruction */}
              <div className="space-y-1 text-center">
                <h3 className="text-base font-black text-slate-800 tracking-tight">
                  Check-in QR Code
                </h3>
                <p className="text-[11px] font-medium text-slate-500 leading-relaxed max-w-xs mx-auto">
                  Keep this QR code saved. Present it at the venue desk during event check-in once your registration is confirmed.
                </p>
              </div>

              {/* Action buttons */}
              <div className="flex flex-col sm:flex-row gap-2.5 pt-1 w-full">
                <button 
                  onClick={handleDownloadQR}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-black text-xs py-2.5 rounded-xl flex items-center justify-center gap-1.5 transition-all shadow-sm cursor-pointer"
                >
                  <Download className="h-4 w-4" />
                  Download Pass
                </button>

                <Link to="/" className="flex-1">
                  <button 
                    className="w-full bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs py-2.5 rounded-xl flex items-center justify-center gap-1.5 transition-all border border-slate-200 cursor-pointer"
                  >
                    <Home className="h-4 w-4 text-blue-600" />
                    Home
                  </button>
                </Link>
              </div>
            </div>

            {/* Right: Registration Summary Card (span 5) */}
            <div className="md:col-span-5 space-y-4">
              <div className="bg-white border border-slate-200/80 rounded-3xl p-5 space-y-4 shadow-xs text-left">
                <h4 className="text-xs font-black text-slate-700 uppercase tracking-wider flex items-center gap-1.5 pb-2 border-b border-slate-100">
                  <Users className="w-3.5 h-3.5 text-blue-600" />
                  Booking Summary
                </h4>

                <div className="space-y-2.5 text-xs">
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 block uppercase">Team / Group</span>
                    <span className="font-extrabold text-slate-800 block text-xs">{displayGroupName}</span>
                  </div>

                  {registration?.teamLeadName && (
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 block uppercase">Team Lead</span>
                      <span className="font-bold text-slate-750 block">{registration.teamLeadName}</span>
                    </div>
                  )}

                  {registration?.teamLeadStudentId && (
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 block uppercase">Student ID</span>
                      <span className="font-mono text-slate-650 block font-bold">{registration.teamLeadStudentId}</span>
                    </div>
                  )}

                  <div>
                    <span className="text-[10px] font-bold text-slate-400 block uppercase">Team Members</span>
                    <span className="font-bold text-slate-750 block">
                      {(registration?.members?.length || 0) + 1} Participant{registration?.members?.length ? "s" : ""}
                    </span>
                  </div>

                  {event?.date && (
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 block uppercase">Event Schedule</span>
                      <span className="font-semibold text-slate-700 block text-[11px] flex items-center gap-1 mt-0.5">
                        <Calendar className="w-3 h-3 text-blue-600" />
                        {event.date} {event.time ? `• ${event.time}` : ""}
                      </span>
                    </div>
                  )}

                  {event?.location && (
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 block uppercase">Venue</span>
                      <span className="font-semibold text-slate-700 block text-[11px] flex items-center gap-1 mt-0.5">
                        <MapPin className="w-3 h-3 text-blue-600" />
                        {event.location}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>

          </div>

          {/* WhatsApp Group Link Card */}
          <div className="max-w-3xl mx-auto w-full bg-white border border-slate-200/80 rounded-3xl p-5 sm:p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-xs text-left">
            <div className="flex items-center gap-3.5">
              <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100 shrink-0">
                <MessageSquare className="h-5 w-5" />
              </div>
              <div className="space-y-0.5">
                <h3 className="text-sm font-black text-slate-850 tracking-tight">Participant WhatsApp Group</h3>
                <p className="text-xs text-slate-500 font-medium leading-normal">Join the official WhatsApp group for instant announcements & verification updates.</p>
              </div>
            </div>
            <a 
              href={event?.whatsGroupLink || "https://chat.whatsapp.com/test-group"}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full sm:w-auto px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-[11px] uppercase tracking-wider rounded-xl transition-all shadow-sm flex items-center justify-center gap-1.5 shrink-0 cursor-pointer"
            >
              Join WhatsApp Group
            </a>
          </div>

        </main>
      )}

      {/* ================= PORTAL FOOTER ================= */}
      <footer className="bg-slate-900 border-t border-slate-800 px-6 py-6 text-slate-400 text-xs mt-auto">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <span>© 2024 AI Verse Club. Powered by Azure Intelligence.</span>
          <div className="flex gap-6 font-semibold">
            <span className="hover:text-white cursor-pointer">Privacy Policy</span>
            <span className="hover:text-white cursor-pointer">Terms of Service</span>
            <span className="hover:text-white cursor-pointer">Faculty Handbook</span>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default TicketPage;
