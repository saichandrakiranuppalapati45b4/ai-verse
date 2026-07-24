import React, { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { db } from "../../config/firebase";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import SEO from "../../components/layout/SEO";
import { 
   Download, 
   Loader2,
   MessageSquare
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
  teamLeadStudentId: string;
  members: Teammate[];
  teamSize: number;
  qrCodeData?: string;
}

interface EventData {
  title: string;
  date: string;
  time: string;
  location: string;
  whatsGroupLink?: string;
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
        title={`${displayTitle} Ticket - AI Verse`}
        description="Verify your attendance check-in code and track your team status."
      />



      {/* ================= TICKET BODY ================= */}
      {loading ? (
        <div className="flex-1 flex flex-col items-center justify-center p-20">
          <Loader2 className="h-10 w-10 text-blue-600 animate-spin" />
          <p className="text-xs text-slate-400 mt-3 font-medium">Retrieving ticket details...</p>
        </div>
      ) : (
        <main className="max-w-6xl mx-auto px-6 py-12 w-full flex-1 space-y-12">
          
          {/* Header section */}
          <div className="text-center space-y-2">
            <div className="flex justify-center">
              <span className="bg-blue-50 text-blue-600 font-extrabold text-[10px] px-3.5 py-1 rounded-full uppercase tracking-wider border border-blue-100/50 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-ping shrink-0"></span>
                Live Attendance Event
              </span>
            </div>
            <h1 className="text-3xl md:text-4xl font-black text-slate-800 tracking-tight leading-none pt-1">
              {displayTitle}
            </h1>
            <p className="text-slate-500 text-xs font-semibold leading-relaxed">
              Confirming participation for <strong className="text-blue-600 font-extrabold">{displayGroupName}</strong>. Scan below to log your status.
            </p>
          </div>

          {/* Ticket & QR Scanner card (centered, max-w-xl) */}
          <div className="max-w-xl mx-auto w-full bg-white border border-slate-100 rounded-3xl p-8 flex flex-col items-center justify-center space-y-6 relative overflow-hidden shadow-[0_8px_30px_rgba(0,0,0,0.015)] text-center">
            
            {/* Outer Viewfinder Box */}
            <div className="w-52 h-52 rounded-3xl border-2 border-dashed border-blue-500/80 p-3 bg-slate-50 flex items-center justify-center relative overflow-hidden shadow-inner">
              {/* Laser animation line */}
              <div className="absolute top-0 left-0 w-full h-1 bg-blue-500 shadow-[0_0_8px_#3b82f6] animate-[bounce_2.5s_infinite]"></div>
              {/* Real QR Code image from dynamic registration ID */}
              <img 
                src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${registrationId || "mock_reg_123"}`} 
                alt="Ticket QR Code" 
                className="w-full h-full object-contain relative z-10 p-2" 
              />
            </div>

            {/* Attendance instruction */}
            <div className="space-y-2">
              <h3 className="text-xl font-black text-slate-800 tracking-tight leading-none">
                Scan to Mark Attendance
              </h3>
              <p className="text-xs font-semibold text-slate-500 leading-relaxed max-w-md">
                Team members must use the AI Verse Portal mobile app to scan this unique identifier to log attendance.
              </p>
            </div>

            {/* Action buttons */}
            <div className="flex flex-col sm:flex-row gap-3 pt-2 w-full max-w-xs">
              <button 
                onClick={handleDownloadQR}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs py-3 rounded-2xl flex items-center justify-center gap-1.5 transition-all shadow-md shadow-blue-600/15"
              >
                <Download className="h-4.5 w-4.5" />
                Download QR
              </button>
            </div>

          </div>

          {/* WhatsApp Group Link Card */}
          <div className="max-w-xl mx-auto w-full bg-white border border-slate-100 rounded-3xl p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-[0_8px_30px_rgba(0,0,0,0.015)] text-left animate-in fade-in slide-in-from-bottom-2 duration-200">
            <div className="flex items-center gap-3.5">
              <div className="w-10 h-10 rounded-2xl bg-green-50 text-emerald-600 flex items-center justify-center border border-green-100/30 shrink-0">
                <MessageSquare className="h-5 w-5" />
              </div>
              <div className="space-y-0.5">
                <h3 className="text-sm font-black text-slate-800 tracking-tight">WhatsApp Group Link</h3>
                <p className="text-[10px] text-slate-450 font-semibold leading-normal">Join the WhatsApp group to get updates for this event.</p>
              </div>
            </div>
            <a 
              href={event?.whatsGroupLink || "https://chat.whatsapp.com/test-group"}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full sm:w-auto px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-[10px] uppercase tracking-wider rounded-xl transition-all shadow-md shadow-emerald-600/10 flex items-center justify-center gap-1.5 shrink-0"
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
