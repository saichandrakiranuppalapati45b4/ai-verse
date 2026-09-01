import React, { useState, useEffect, useRef } from "react";
import { useParams, Link } from "react-router-dom";
import { db } from "../../config/firebase";
import { doc, getDoc, updateDoc, onSnapshot } from "firebase/firestore";
import SEO from "../../components/layout/SEO";
import { 
  Download, 
  Printer, 
  Loader2, 
  MessageSquare, 
  Home, 
  Calendar, 
  Users, 
  CheckCircle2, 
  Sparkles, 
  RotateCw,
  Clock,
  ShieldCheck,
  MapPin
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
  registrationFee?: number;
  foodPreference?: string;
  createdAt?: number;
}

interface TicketDesignConfig {
  bgPreview?: string;
  bgFilename?: string;
  qrPosition?: "bottom-right" | "bottom-center" | "top-right" | "top-left" | "bottom-left" | "center" | "right-panel" | "custom" | string;
  qrX?: number;
  qrY?: number;
  qrWidthPercent?: number;
  qrBg?: "white" | "transparent" | "glow";
  showAttendeeText?: boolean;
  textX?: number;
  textY?: number;
  textColor?: string;
  template?: string;
  passLabel?: string;
  primaryColor?: string;
  showMembers?: boolean;
  showVenue?: boolean;
  showBarcode?: boolean;
}

interface EventData {
  title: string;
  date: string;
  time: string;
  location: string;
  whatsGroupLink?: string;
  registrationFee?: number;
  isPaidEvent?: boolean;
  category?: string;
  ticketDesign?: TicketDesignConfig;
}

const TicketPage: React.FC = () => {
  const { registrationId } = useParams<{ registrationId: string }>();
  const [registration, setRegistration] = useState<RegistrationData | null>(null);
  const [event, setEvent] = useState<EventData | null>(null);
  const [loading, setLoading] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  const [printKey, setPrintKey] = useState(0);
  const [isPrintingAnim, setIsPrintingAnim] = useState(true);
  const [printProgress, setPrintProgress] = useState(0);
  const [isTorn, setIsTorn] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState(0);
  const [dragStartY, setDragStartY] = useState(0);
  const [tearSuccessToast, setTearSuccessToast] = useState(false);
  const ticketRef = useRef<HTMLDivElement>(null);

  // Play realistic paper tear sound via Web Audio API
  const playTearSound = () => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const bufferSize = Math.floor(ctx.sampleRate * 0.3); // 300ms rip
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        // Fast crackling noise burst
        const decay = Math.exp(-i / (ctx.sampleRate * 0.08));
        data[i] = (Math.random() * 2 - 1) * decay * (Math.random() > 0.4 ? 1 : 0.2);
      }
      const noise = ctx.createBufferSource();
      noise.buffer = buffer;

      const filter = ctx.createBiquadFilter();
      filter.type = "bandpass";
      filter.frequency.setValueAtTime(2200, ctx.currentTime);
      filter.frequency.exponentialRampToValueAtTime(350, ctx.currentTime + 0.28);
      filter.Q.value = 2.5;

      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.25, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);

      noise.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);
      noise.start();
    } catch (e) {
      // ignore
    }
  };

  // Play subtle mechanical print & chime sounds via Web Audio API
  const playPrintAudio = () => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const now = ctx.currentTime;

      // Thermal motor ticking bursts
      for (let i = 0; i < 6; i++) {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "sawtooth";
        osc.frequency.setValueAtTime(140 + i * 18, now + i * 0.35);
        gain.gain.setValueAtTime(0.03, now + i * 0.35);
        gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.35 + 0.12);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + i * 0.35);
        osc.stop(now + i * 0.35 + 0.14);
      }

      // Celebratory completion chime at 2.4s
      setTimeout(() => {
        try {
          const chimeCtx = new AudioCtx();
          const chime = chimeCtx.createOscillator();
          const chimeGain = chimeCtx.createGain();
          chime.type = "sine";
          chime.frequency.setValueAtTime(659.25, chimeCtx.currentTime); // E5
          chime.frequency.exponentialRampToValueAtTime(880, chimeCtx.currentTime + 0.18); // A5
          chimeGain.gain.setValueAtTime(0.08, chimeCtx.currentTime);
          chimeGain.gain.exponentialRampToValueAtTime(0.001, chimeCtx.currentTime + 0.5);
          chime.connect(chimeGain);
          chimeGain.connect(chimeCtx.destination);
          chime.start(chimeCtx.currentTime);
          chime.stop(chimeCtx.currentTime + 0.5);
        } catch (e) {
          // ignore
        }
      }, 2300);
    } catch (e) {
      // Audio context policy fallback
    }
  };

  const handleTearOff = () => {
    if (isTorn || isPrintingAnim) return;
    setIsTorn(true);
    setDragOffset(0);
    setIsDragging(false);
    playTearSound();
    setTearSuccessToast(true);
    setTimeout(() => setTearSuccessToast(false), 4500);
    
    // Automatically trigger ticket image download
    handleDownloadTicketImage();
  };

  // Mouse & Touch Drag listeners
  const handleMouseDown = (e: React.MouseEvent) => {
    if (isPrintingAnim || isTorn) return;
    setIsDragging(true);
    setDragStartY(e.clientY);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    if (isPrintingAnim || isTorn) return;
    setIsDragging(true);
    setDragStartY(e.touches[0].clientY);
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging) return;
      const delta = e.clientY - dragStartY;
      if (delta > 0) {
        setDragOffset(Math.min(delta, 55));
        if (delta > 35) {
          handleTearOff();
        }
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (!isDragging) return;
      const delta = e.touches[0].clientY - dragStartY;
      if (delta > 0) {
        setDragOffset(Math.min(delta, 55));
        if (delta > 35) {
          handleTearOff();
        }
      }
    };

    const handleEnd = () => {
      if (!isDragging) return;
      if (dragOffset > 20) {
        handleTearOff();
      } else {
        setDragOffset(0);
      }
      setIsDragging(false);
    };

    if (isDragging) {
      window.addEventListener("mousemove", handleMouseMove);
      window.addEventListener("mouseup", handleEnd);
      window.addEventListener("touchmove", handleTouchMove);
      window.addEventListener("touchend", handleEnd);
    }

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleEnd);
      window.removeEventListener("touchmove", handleTouchMove);
      window.removeEventListener("touchend", handleEnd);
    };
  }, [isDragging, dragStartY, dragOffset, isTorn, isPrintingAnim]);

  useEffect(() => {
    if (!registrationId) {
      setLoading(false);
      return;
    }

    const unsub = onSnapshot(doc(db, "registrations", registrationId), async (regSnap) => {
      if (regSnap.exists()) {
        const regData = regSnap.data() as RegistrationData;
        setRegistration(regData);

        if (!regData.qrCodeData) {
          try {
            await updateDoc(doc(db, "registrations", registrationId), {
              qrCodeData: registrationId
            });
          } catch (updateErr) {
            console.error("Error writing qrCodeData to Firestore registrations:", updateErr);
          }
        }

        if (regData.eventId) {
          try {
            const eventSnap = await getDoc(doc(db, "events", regData.eventId));
            if (eventSnap.exists()) {
              setEvent(eventSnap.data() as EventData);
            }
          } catch (e) {
            console.error("Error fetching event for ticket:", e);
          }
        }
      }
      setLoading(false);
    }, (err) => {
      console.error("Error subscribing to registration ticket:", err);
      setLoading(false);
    });

    return () => unsub();
  }, [registrationId]);

  // Handle printing animation sequence on load or reprint
  useEffect(() => {
    if (loading) return;
    setIsPrintingAnim(true);
    setPrintProgress(0);
    playPrintAudio();

    const interval = setInterval(() => {
      setPrintProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          return 100;
        }
        return prev + 5;
      });
    }, 110);

    const timer = setTimeout(() => {
      setIsPrintingAnim(false);
      setPrintProgress(100);
    }, 2500);

    return () => {
      clearInterval(interval);
      clearTimeout(timer);
    };
  }, [loading, printKey]);

  const displayTitle = event?.title || registration?.eventTitle || "AI Verse Hackathon 2026";
  const displayGroupName = registration?.groupName || "CodeCrafters";
  const displayLeadName = registration?.teamLeadName || "Team Lead";
  const displayLeadEmail = registration?.teamLeadPersonalEmail || registration?.teamLeadCollegeEmail || registration?.teamLeadEmail || "leader@vishnu.edu.in";
  
  // Ticket Design Config from Event
  const ticketDesign = event?.ticketDesign || {};
  const ticketBgPreview = ticketDesign.bgPreview || "";
  const ticketQrPos = ticketDesign.qrPosition || "bottom-right";
  const ticketQrX = ticketDesign.qrX !== undefined ? ticketDesign.qrX : 75;
  const ticketQrY = ticketDesign.qrY !== undefined ? ticketDesign.qrY : 75;
  const ticketQrWidthPercent = ticketDesign.qrWidthPercent !== undefined ? ticketDesign.qrWidthPercent : 22;
  const ticketQrBg = ticketDesign.qrBg || "white";
  const ticketShowAttendeeText = ticketDesign.showAttendeeText || false;
  const ticketTextX = ticketDesign.textX !== undefined ? ticketDesign.textX : 20;
  const ticketTextY = ticketDesign.textY !== undefined ? ticketDesign.textY : 80;
  const ticketTextColor = ticketDesign.textColor || "#FFFFFF";
  const ticketTemplate = ticketDesign.template || "modern-blue";
  const ticketPassLabel = ticketDesign.passLabel || "OFFICIAL ACCESS PASS";
  const ticketPrimaryColor = ticketDesign.primaryColor || "#2563EB";
  const ticketShowMembers = ticketDesign.showMembers !== false;
  const ticketShowVenue = ticketDesign.showVenue !== false;
  const ticketShowBarcode = ticketDesign.showBarcode !== false;

  // Status check: whether the team registration is confirmed by coordinators
  const isConfirmed = 
    registration?.status?.toLowerCase() === "confirmed" || 
    registration?.status?.toLowerCase() === "approved" ||
    registration?.paymentStatus?.toLowerCase() === "confirmed" ||
    registration?.paymentStatus?.toLowerCase() === "approved";

  const allMembers = [
    { name: displayLeadName, email: displayLeadEmail, isLead: true },
    ...(registration?.members || []).map(m => ({ name: m.name || "Member", email: m.email || "", isLead: false }))
  ];

  const totalAmount = registration?.totalFeePaid !== undefined ? registration.totalFeePaid : (event?.registrationFee || 0);
  const isFree = totalAmount === 0;

  const orderNumber = registrationId 
    ? `W${registrationId.replace(/[^a-zA-Z0-9]/g, "").slice(-10).toUpperCase()}` 
    : "W984210491823";

  const formattedDateStr = registration?.createdAt
    ? new Date(registration.createdAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })
    : event?.date || "19 Aug 2026";

  const formattedTimeStr = registration?.createdAt
    ? new Date(registration.createdAt).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })
    : event?.time || "20:17";

  const handleReplayPrint = () => {
    setPrintKey(prev => prev + 1);
  };

  const handlePrintBrowser = () => {
    window.print();
  };

  const handleDownloadTicketImage = async () => {
    setIsExporting(true);
    try {
      const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=500x500&data=${registrationId || "mock_reg_123"}`;
      
      const logoImage = new Image();
      logoImage.crossOrigin = "anonymous";

      const qrImage = new Image();
      qrImage.crossOrigin = "anonymous";

      const bgImage = new Image();
      if (ticketBgPreview) {
        bgImage.crossOrigin = "anonymous";
      }

      let loaded = 0;
      const totalImagesToLoad = 2; // (bgImage or logoImage) + qrImage

      const renderCanvas = () => {
        loaded++;
        if (loaded < totalImagesToLoad) return;

        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          setIsExporting(false);
          return;
        }

        // ================= A. CUSTOM UPLOADED TICKET TEMPLATE EXPORT =================
        if (ticketBgPreview && bgImage.complete && bgImage.naturalWidth > 0) {
          const origW = bgImage.naturalWidth;
          const origH = bgImage.naturalHeight;
          canvas.width = origW;
          canvas.height = origH;

          // 1. Draw uploaded ticket template image
          ctx.drawImage(bgImage, 0, 0, origW, origH);

          // 2. Compute QR placeholder coordinates
          const qrWidth = origW * (ticketQrWidthPercent / 100);
          const qrHeight = qrWidth;
          const qrCenterX = origW * (ticketQrX / 100);
          const qrCenterY = origH * (ticketQrY / 100);
          const qrLeft = qrCenterX - qrWidth / 2;
          const qrTop = qrCenterY - qrHeight / 2;

          // 3. QR Background Container
          if (ticketQrBg === "white") {
            const pad = qrWidth * 0.08;
            ctx.fillStyle = "#FFFFFF";
            ctx.shadowColor = "rgba(0, 0, 0, 0.2)";
            ctx.shadowBlur = 16;
            if (ctx.roundRect) {
              ctx.beginPath();
              ctx.roundRect(qrLeft - pad, qrTop - pad, qrWidth + pad * 2, qrHeight + pad * 2, 16);
              ctx.fill();
            } else {
              ctx.fillRect(qrLeft - pad, qrTop - pad, qrWidth + pad * 2, qrHeight + pad * 2);
            }
            ctx.shadowColor = "transparent";
          } else if (ticketQrBg === "glow") {
            const pad = qrWidth * 0.08;
            ctx.fillStyle = "#0B0F19";
            ctx.strokeStyle = "#22D3EE";
            ctx.lineWidth = 4;
            if (ctx.roundRect) {
              ctx.beginPath();
              ctx.roundRect(qrLeft - pad, qrTop - pad, qrWidth + pad * 2, qrHeight + pad * 2, 16);
              ctx.fill();
              ctx.stroke();
            } else {
              ctx.fillRect(qrLeft - pad, qrTop - pad, qrWidth + pad * 2, qrHeight + pad * 2);
              ctx.strokeRect(qrLeft - pad, qrTop - pad, qrWidth + pad * 2, qrHeight + pad * 2);
            }
          }

          // 4. Draw attendee QR code
          ctx.drawImage(qrImage, qrLeft, qrTop, qrWidth, qrHeight);

          // 5. Optional Attendee Text Overlay
          if (ticketShowAttendeeText) {
            const textCenterX = origW * (ticketTextX / 100);
            const textCenterY = origH * (ticketTextY / 100);
            ctx.fillStyle = ticketTextColor;
            ctx.font = `bold ${Math.max(16, Math.round(origW * 0.024))}px sans-serif`;
            ctx.textAlign = "center";
            ctx.fillText(`${displayGroupName} • ID: AV-${registrationId?.slice(-6).toUpperCase() || "PASS"}`, textCenterX, textCenterY);
          }
        } else {
          // ================= B. FALLBACK DEFAULT TICKET PASS =================
          const scale = 2;
          const w = 440;
          const totalRows = ticketShowMembers ? allMembers.length : 0;
          const h = 760 + totalRows * 36;
          
          canvas.width = w * scale;
          canvas.height = h * scale;
          ctx.scale(scale, scale);

          ctx.fillStyle = "#F1F5F9";
          ctx.fillRect(0, 0, w, h);

          const margin = 14;
          const tw = w - margin * 2;
          const th = h - margin * 2 - 16;

          ctx.fillStyle = "#FFFFFF";
          ctx.shadowColor = "rgba(0, 0, 0, 0.12)";
          ctx.shadowBlur = 24;
          ctx.shadowOffsetY = 8;

          if (ctx.roundRect) {
            ctx.beginPath();
            ctx.roundRect(margin, margin, tw, th, [24, 24, 0, 0]);
            ctx.fill();
          } else {
            ctx.fillRect(margin, margin, tw, th);
          }
          ctx.shadowColor = "transparent";

          ctx.strokeStyle = "#E2E8F0";
          ctx.lineWidth = 1.5;
          if (ctx.roundRect) {
            ctx.beginPath();
            ctx.roundRect(margin, margin, tw, th, [24, 24, 0, 0]);
            ctx.stroke();
          }

          const logoSize = 44;
          ctx.drawImage(logoImage, w / 2 - logoSize / 2, 28, logoSize, logoSize);

          ctx.fillStyle = "#2563EB";
          ctx.font = "900 9px sans-serif";
          ctx.textAlign = "center";
          ctx.fillText("OFFICIAL ATTENDANCE PASS", w / 2, 86);

          ctx.fillStyle = "#0F172A";
          ctx.font = "900 17px sans-serif";
          ctx.fillText(displayTitle.length > 28 ? displayTitle.substring(0, 28) + "..." : displayTitle, w / 2, 108);

          ctx.fillStyle = "#64748B";
          ctx.font = "600 10px sans-serif";
          ctx.fillText("Innovate • Build • Inspire", w / 2, 124);

          ctx.fillStyle = isConfirmed ? "#ECFDF5" : "#FEF3C7";
          const pillWidth = 145;
          const pillHeight = 22;
          if (ctx.roundRect) {
            ctx.beginPath();
            ctx.roundRect(w / 2 - pillWidth / 2, 134, pillWidth, pillHeight, 11);
            ctx.fill();
          } else {
            ctx.fillRect(w / 2 - pillWidth / 2, 134, pillWidth, pillHeight);
          }

          ctx.fillStyle = isConfirmed ? "#059669" : "#D97706";
          ctx.font = "800 9.5px sans-serif";
          ctx.fillText(isConfirmed ? "✓  TEAM CONFIRMED" : "⏱  UNDER REVIEW", w / 2, 149);

          ctx.strokeStyle = "rgba(148, 163, 184, 0.25)";
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(30, 172);
          ctx.lineTo(w - 30, 172);
          ctx.stroke();

          ctx.textAlign = "left";
          ctx.fillStyle = "#64748B";
          ctx.font = "800 8.5px sans-serif";
          ctx.fillText("ORDER NO", 32, 192);
          ctx.fillText("AMOUNT", w / 2 + 15, 192);

          ctx.fillStyle = "#0F172A";
          ctx.font = "800 12px sans-serif";
          ctx.fillText(orderNumber, 32, 209);
          ctx.fillText(isFree ? "FREE ENTRY" : `₹${totalAmount}.00`, w / 2 + 15, 209);

          ctx.fillStyle = "#64748B";
          ctx.font = "800 8.5px sans-serif";
          ctx.fillText("DATE & TIME", 32, 235);
          ctx.fillText("STATUS", w / 2 + 15, 235);

          ctx.fillStyle = "#0F172A";
          ctx.font = "800 11.5px sans-serif";
          ctx.fillText(`${formattedDateStr} • ${formattedTimeStr}`, 32, 252);
          ctx.fillStyle = isConfirmed ? "#059669" : "#D97706";
          ctx.fillText(isConfirmed ? "Confirmed Pass" : "Under Review", w / 2 + 15, 252);

          // Details Section
          let currY = 300;
          ctx.fillStyle = "#2563EB";
          ctx.font = "800 8px sans-serif";
          ctx.fillText("EVENT NAME", 68, currY - 2);
          ctx.fillStyle = "#0F172A";
          ctx.font = "800 11.5px sans-serif";
          ctx.fillText(displayTitle.length > 32 ? displayTitle.substring(0, 32) + "..." : displayTitle, 68, currY + 12);

          currY += 46;
          ctx.fillStyle = "#2563EB";
          ctx.font = "800 8px sans-serif";
          ctx.fillText("TEAM NAME", 68, currY - 2);
          ctx.fillStyle = "#0F172A";
          ctx.font = "800 11.5px sans-serif";
          ctx.fillText(displayGroupName, 68, currY + 12);
          ctx.fillStyle = "#64748B";
          ctx.font = "600 9.5px sans-serif";
          ctx.fillText(`Team ID: AV-${registrationId?.slice(-6).toUpperCase() || "PASS"}`, 68, currY + 24);

          // QR Code
          currY += 56;
          const qrPixelSize = 120;
          ctx.drawImage(qrImage, w / 2 - qrPixelSize / 2, currY, qrPixelSize, qrPixelSize);

          currY += qrPixelSize + 18;
          ctx.textAlign = "center";
          ctx.fillStyle = "#64748B";
          ctx.font = "800 9px sans-serif";
          ctx.fillText("SCAN TO VERIFY OFFICIAL TICKET", w / 2, currY);

          // Sawtooth cut teeth
          const teethCount = 18;
          const toothWidth = tw / teethCount;
          const bottomY = margin + th;

          ctx.fillStyle = "#F1F5F9";
          ctx.beginPath();
          ctx.moveTo(margin, bottomY);
          for (let i = 0; i < teethCount; i++) {
            const toothX = margin + i * toothWidth;
            ctx.arc(toothX + toothWidth / 2, bottomY, toothWidth / 2 - 1, 0, Math.PI, true);
          }
          ctx.lineTo(margin + tw, bottomY + 20);
          ctx.lineTo(margin, bottomY + 20);
          ctx.closePath();
          ctx.fill();
        }

        // Download canvas
        const blobUrl = canvas.toDataURL("image/png");
        const link = document.createElement("a");
        link.href = blobUrl;
        
        const cleanGroupName = displayGroupName.toLowerCase().replace(/[^a-z0-9]+/g, "_");
        const cleanEventName = displayTitle.toLowerCase().replace(/[^a-z0-9]+/g, "_");
        link.download = `${cleanEventName}_${cleanGroupName}_ticket.png`;
        
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        setIsExporting(false);
      };

      if (ticketBgPreview) {
        bgImage.onload = renderCanvas;
        bgImage.onerror = () => renderCanvas();
        bgImage.src = ticketBgPreview;
      } else {
        logoImage.onload = renderCanvas;
        logoImage.onerror = () => renderCanvas();
        logoImage.src = "/ai_verse.png";
      }

      qrImage.onload = renderCanvas;
      qrImage.onerror = (err) => {
        console.error("Failed to load QR image for canvas download", err);
        alert("Failed to render ticket image. Please try using Print Ticket instead.");
        setIsExporting(false);
      };
      qrImage.src = qrUrl;
    } catch (err) {
      console.error("Error downloading ticket image:", err);
      setIsExporting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-100 via-indigo-50/20 to-slate-200 flex flex-col font-sans text-left selection:bg-indigo-500 selection:text-white print:bg-white print:p-0">
      <SEO 
        title={`Event Ticket • ${displayTitle} • AI Verse`}
        description={`Your official event ticket pass for ${displayTitle}.`}
      />

      {/* Embedded CSS for Thermal Printer Feed Animation */}
      <style>{`
        @keyframes thermalPrintFeed {
          0% {
            transform: translateY(-100%);
          }
          18% {
            transform: translateY(-75%);
          }
          42% {
            transform: translateY(-45%);
          }
          70% {
            transform: translateY(-18%);
          }
          90% {
            transform: translateY(-3%);
          }
          100% {
            transform: translateY(0);
          }
        }

        @keyframes laserScan {
          0%, 100% {
            opacity: 0.4;
            transform: scaleX(0.7);
          }
          50% {
            opacity: 1;
            transform: scaleX(1);
          }
        }

        @keyframes confettiBurst {
          0% {
            transform: translateY(0) rotate(0deg) scale(0.6);
            opacity: 0;
          }
          20% {
            opacity: 1;
          }
          100% {
            transform: translateY(-80px) rotate(360deg) scale(1.1);
            opacity: 0;
          }
        }

        @keyframes paperTearFall {
          0% {
            transform: translateY(0) rotate(0deg);
          }
          35% {
            transform: translateY(28px) rotate(3deg) scale(0.99);
          }
          70% {
            transform: translateY(16px) rotate(-1.2deg) scale(0.995);
          }
          100% {
            transform: translateY(22px) rotate(1deg) scale(1);
          }
        }

        .animate-thermal-feed {
          animation: thermalPrintFeed 2.3s cubic-bezier(0.22, 1, 0.36, 1) forwards;
          transform-origin: top center;
        }

        .animate-paper-tear {
          animation: paperTearFall 0.85s cubic-bezier(0.25, 1, 0.5, 1) forwards;
        }

        .animate-laser-line {
          animation: laserScan 0.8s ease-in-out infinite;
        }

        .confetti-piece {
          animation: confettiBurst 1.9s ease-out infinite;
        }

        /* Serrated Receipt Cutout Teeth */
        .receipt-serrated-edge {
          background-image: radial-gradient(circle at 10px 0, transparent 9px, #ffffff 10px);
          background-size: 20px 20px;
          background-repeat: repeat-x;
        }

        @media print {
          body {
            background: white !important;
          }
          .no-print {
            display: none !important;
          }
          .print-container {
            margin: 0 !important;
            padding: 0 !important;
            max-width: 100% !important;
          }
          .animate-thermal-feed,
          .animate-paper-tear {
            animation: none !important;
            transform: none !important;
          }
        }
      `}</style>

      {/* Top Navigation Bar */}
      <header className="no-print border-b border-slate-200/80 bg-white/80 backdrop-blur-md sticky top-0 z-40 px-4 sm:px-8 py-3 flex items-center justify-between shadow-2xs">
        <div className="flex items-center gap-3">
          <Link to="/" className="flex items-center gap-2.5 group">
            <img 
              src="/ai_verse.png" 
              alt="AI Verse Logo" 
              className="w-8 h-8 object-contain group-hover:scale-105 transition-transform" 
            />
            <span className="font-extrabold text-sm text-slate-850 tracking-tight">AI Verse</span>
          </Link>
          <span className="text-slate-300">/</span>
          <span className="text-xs font-bold text-slate-500 truncate max-w-[200px] sm:max-w-xs">
            {displayTitle}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              setIsTorn(false);
              setDragOffset(0);
              handleReplayPrint();
            }}
            title="Replay Printing Animation"
            className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 hover:text-slate-900 transition-colors flex items-center gap-1.5 text-xs font-bold cursor-pointer"
          >
            <RotateCw className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Reprint</span>
          </button>
          <Link to="/">
            <button className="px-3.5 py-1.5 rounded-xl bg-blue-50 text-blue-700 hover:bg-blue-100 transition-colors text-xs font-black flex items-center gap-1 cursor-pointer">
              <Home className="w-3.5 h-3.5" />
              <span>Portal</span>
            </button>
          </Link>
        </div>
      </header>

      {/* Floating Tear Success Toast */}
      {tearSuccessToast && (
        <div className="fixed top-18 left-1/2 -translate-x-1/2 z-50 bg-slate-900 text-white px-5 py-2.5 rounded-full shadow-2xl flex items-center gap-2.5 border border-slate-700 animate-bounce text-xs font-black no-print">
          <span className="text-base">✂️</span>
          <span>Ticket Torn Off! Download started...</span>
        </div>
      )}

      {/* ================= FLOATING CORNER NOTICE WIDGET (Corner of the page on Desktop) ================= */}
      <aside className="no-print hidden lg:block fixed top-20 right-5 xl:right-8 w-80 xl:w-[340px] z-30 text-left">
        <div className={`bg-white/95 backdrop-blur-md border rounded-3xl p-5 shadow-xl space-y-4 relative overflow-hidden transition-all ${
          isConfirmed 
            ? "border-emerald-200/90 shadow-emerald-500/10" 
            : "border-amber-200/90 shadow-amber-500/10"
        }`}>
          
          {/* Status Bar */}
          <div className={`flex items-center justify-between pb-2.5 border-b ${
            isConfirmed ? "border-emerald-100/90" : "border-amber-100/90"
          }`}>
            {isConfirmed ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 font-black text-[10px] uppercase tracking-wider">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                Team Confirmed
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 border border-amber-200 text-amber-800 font-black text-[10px] uppercase tracking-wider">
                <Clock className="w-3.5 h-3.5 text-amber-600 animate-pulse" />
                Under Review
              </span>
            )}
            <span className="text-[10px] font-bold text-slate-400 font-mono">
              ORDER #{orderNumber}
            </span>
          </div>

          {/* Main Notice Banner */}
          <div className="space-y-2.5">
            <div className="flex items-start gap-2.5">
              <div className={`w-9 h-9 rounded-2xl flex items-center justify-center shrink-0 border mt-0.5 ${
                isConfirmed 
                  ? "bg-emerald-100 text-emerald-700 border-emerald-200" 
                  : "bg-amber-100 text-amber-700 border-amber-200"
              }`}>
                <ShieldCheck className={`w-4.5 h-4.5 ${isConfirmed ? "text-emerald-700" : "text-amber-700"}`} />
              </div>
              <div>
                <h3 className="text-sm font-black text-slate-900 tracking-tight leading-tight">
                  {isConfirmed ? "Team Confirmed" : "Registration Completed"}
                </h3>
                <p className={`text-[11px] font-bold mt-0.5 ${isConfirmed ? "text-emerald-700" : "text-amber-700"}`}>
                  {isConfirmed ? "Status: Team Confirmed" : "Status: Currently Under Review"}
                </p>
              </div>
            </div>

            {/* Highlighted Notice Text */}
            {isConfirmed ? (
              <div className="p-3.5 rounded-2xl bg-emerald-50/80 border border-emerald-200/90 text-xs text-emerald-950 font-medium leading-relaxed space-y-1.5">
                <p>
                  🎉 Team <strong>"{displayGroupName}"</strong> is <strong>officially confirmed</strong> for {displayTitle}.
                </p>
                <p className="text-emerald-900 font-semibold">
                  Access pass is active. Official confirmation and credentials have been verified.
                </p>
              </div>
            ) : (
              <div className="p-3.5 rounded-2xl bg-amber-50/80 border border-amber-200/90 text-xs text-amber-950 font-medium leading-relaxed space-y-1.5">
                <p>
                  Your registration was completed and is currently <strong>under review</strong>.
                </p>
                <p className="text-amber-900">
                  After your registration review is completed, you will receive an official <strong>confirmation email</strong>.
                </p>
              </div>
            )}
          </div>

          {/* Step-by-Step Status Roadmap */}
          <div className="space-y-2.5 pt-1">
            <h4 className="text-[9.5px] font-black text-slate-400 uppercase tracking-wider">
              Registration Roadmap
            </h4>

            <div className="space-y-2 text-xs">
              {/* Step 1 */}
              <div className="flex items-start gap-2.5">
                <div className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5">
                  ✓
                </div>
                <div className="leading-tight">
                  <span className="font-extrabold text-slate-850 block text-[11.5px]">Details Submitted</span>
                  <span className="text-[10px] text-slate-500 font-medium block mt-0.5">
                    Team details & payment proof recorded.
                  </span>
                </div>
              </div>

              {/* Step 2 */}
              <div className="flex items-start gap-2.5">
                {isConfirmed ? (
                  <div className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5">
                    ✓
                  </div>
                ) : (
                  <div className="w-5 h-5 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5 animate-pulse">
                    2
                  </div>
                )}
                <div className="leading-tight">
                  <span className={`font-extrabold block text-[11.5px] ${isConfirmed ? "text-emerald-900" : "text-amber-900"}`}>
                    {isConfirmed ? "Team Confirmed" : "Coordinator Review"}
                  </span>
                  <span className="text-[10px] text-slate-500 font-medium block mt-0.5">
                    {isConfirmed ? "Roster & payment verified by coordinators." : "Verifying transaction and participant roster."}
                  </span>
                </div>
              </div>

              {/* Step 3 */}
              <div className="flex items-start gap-2.5">
                <div className={`w-5 h-5 rounded-full flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5 ${
                  isConfirmed ? "bg-emerald-100 text-emerald-700" : "bg-blue-100 text-blue-700"
                }`}>
                  {isConfirmed ? "✓" : "3"}
                </div>
                <div className="leading-tight">
                  <span className="font-extrabold text-slate-850 block text-[11.5px]">
                    {isConfirmed ? "Confirmation Dispatched" : "Confirmation Email"}
                  </span>
                  <span className="text-[10px] text-slate-500 font-medium block mt-0.5">
                    {isConfirmed ? "Official confirmation delivered to:" : "Official email will be delivered to:"}
                  </span>
                  <span className="font-mono font-bold text-blue-600 text-[10px] block mt-1 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-100 truncate max-w-[240px]">
                    {displayLeadEmail}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* WhatsApp Button */}
          {event?.whatsGroupLink && (
            <a
              href={event.whatsGroupLink}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full py-2 px-3 rounded-xl bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-800 font-extrabold text-[10.5px] uppercase tracking-wider flex items-center justify-center gap-1.5 transition-colors block text-center"
            >
              <MessageSquare className="w-3.5 h-3.5 text-emerald-600" />
              <span>Join WhatsApp Group</span>
            </a>
          )}

        </div>
      </aside>

      {/* ================= MAIN CENTERED TICKET CONTAINER ================= */}
      {loading ? (
        <div className="flex-1 flex flex-col items-center justify-center p-20">
          <Loader2 className="h-10 w-10 text-blue-600 animate-spin" />
          <p className="text-xs text-slate-500 mt-3 font-semibold">Initializing thermal printer...</p>
        </div>
      ) : (
        <main className="max-w-xl mx-auto px-4 sm:px-6 py-8 w-full flex-1 flex flex-col items-center justify-center space-y-6 print-container">
          
          {/* Header Status Bar (no-print) */}
          <div className="text-center space-y-2 max-w-lg mx-auto no-print">
            {isPrintingAnim ? (
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-blue-50 border border-blue-200 text-blue-800 text-[11px] font-black uppercase tracking-wider shadow-2xs animate-pulse">
                <Loader2 className="w-3.5 h-3.5 text-blue-600 animate-spin" />
                <span>Printing Ticket Pass... ({printProgress}%)</span>
              </div>
            ) : isTorn ? (
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-[11px] font-black uppercase tracking-wider shadow-2xs">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                <span>Ticket Detached & Saved to Downloads!</span>
              </div>
            ) : (
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-[11px] font-black uppercase tracking-wider shadow-2xs">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                <span>{isConfirmed ? "Team Registration Confirmed & Verified" : "Official Entry Pass Verified"}</span>
              </div>
            )}
            
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
              Your Attendance Ticket
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 font-medium">
              Save or download this receipt pass. Present the QR code upon check-in at the venue desk.
            </p>
          </div>

          {/* ================= CENTERED THERMAL RECEIPT PRINTER MACHINE ================= */}
          <div className="relative w-full max-w-[420px] flex flex-col items-center">

            {/* Confetti Particles Layer (Triggered above dispenser) */}
            <div className="absolute -top-10 left-1/2 -translate-x-1/2 w-80 h-24 pointer-events-none z-30 no-print overflow-visible">
              {[
                { left: "14%", color: "bg-pink-500", delay: "0s", size: "w-2.5 h-2" },
                { left: "26%", color: "bg-blue-500", delay: "0.2s", size: "w-2 h-3" },
                { left: "38%", color: "bg-amber-400", delay: "0.4s", size: "w-3 h-2" },
                { left: "52%", color: "bg-emerald-400", delay: "0.1s", size: "w-2.5 h-2.5" },
                { left: "64%", color: "bg-purple-500", delay: "0.3s", size: "w-2 h-2.5" },
                { left: "78%", color: "bg-cyan-400", delay: "0.5s", size: "w-3 h-2" },
                { left: "20%", color: "bg-red-400", delay: "0.6s", size: "w-2 h-2" },
                { left: "72%", color: "bg-yellow-400", delay: "0.25s", size: "w-2.5 h-2" }
              ].map((c, i) => (
                <div
                  key={i}
                  className={`absolute bottom-1 rounded-xs confetti-piece ${c.color} ${c.size}`}
                  style={{ left: c.left, animationDelay: c.delay }}
                />
              ))}
            </div>

            {/* Metallic Dispenser Device Header (z-20) */}
            <div className="relative w-full z-20">
              <div className="w-full h-15 bg-gradient-to-b from-slate-200 via-slate-300 to-slate-400 rounded-3xl p-1.5 shadow-[0_12px_24px_rgba(0,0,0,0.15)] border-t border-white/95 border-b border-slate-400 relative">
                <div className="w-full h-full bg-gradient-to-r from-slate-300 via-slate-100 to-slate-300 rounded-2xl flex items-center justify-center px-4 relative overflow-hidden">
                  
                  {/* Subtle machine screws */}
                  <div className="absolute left-3.5 w-2 h-2 rounded-full bg-slate-400 border border-slate-500/50 shadow-inner"></div>
                  <div className="absolute right-3.5 w-2 h-2 rounded-full bg-slate-400 border border-slate-500/50 shadow-inner"></div>

                  {/* Dispenser Mouth Slot */}
                  <div className="w-4/5 h-3.5 bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 rounded-full border border-slate-800 shadow-[inset_0_2px_5px_rgba(0,0,0,0.9)] flex items-center justify-center relative overflow-hidden">
                    {/* Glowing printing laser line at the slit */}
                    {isPrintingAnim ? (
                      <div className="w-full h-1 bg-gradient-to-r from-transparent via-cyan-400 to-transparent shadow-[0_0_12px_#38bdf8] animate-laser-line"></div>
                    ) : (
                      <div className="w-3/4 h-0.5 bg-slate-800/40 rounded-full"></div>
                    )}
                  </div>

                  {/* LED indicator */}
                  <div className="absolute right-8 flex items-center gap-1.5">
                    {isPrintingAnim ? (
                      <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-ping shadow-[0_0_10px_#22d3ee]"></span>
                    ) : (
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 shadow-[0_0_8px_#34d399]"></span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* ================= TICKET PAPER FEED MASK CONTAINER ================= */}
            <div className="w-full -mt-3.5 overflow-hidden z-10 pt-3.5 pb-2 flex flex-col items-center">
              <div 
                key={printKey} 
                ref={ticketRef}
                style={{
                  transform: !isPrintingAnim && isDragging ? `translateY(${dragOffset}px) rotate(${dragOffset * 0.1}deg)` : undefined,
                  backgroundImage: ticketBgPreview ? `url(${ticketBgPreview})` : undefined,
                  backgroundSize: "cover",
                  backgroundPosition: "center",
                  borderColor: ticketPrimaryColor
                }}
                className={`w-[94%] pt-5 pb-3 px-6 sm:px-7 rounded-t-2xl shadow-[0_20px_50px_rgba(0,0,0,0.12)] relative transition-all ${
                  ticketTemplate === "cyberpunk"
                    ? "bg-slate-950 text-slate-100 border-2 border-cyan-500/80 shadow-[0_20px_60px_rgba(6,182,212,0.15)]"
                    : ticketTemplate === "golden-vip"
                    ? "bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 text-amber-100 border-2 border-amber-500/80 shadow-[0_20px_60px_rgba(245,158,11,0.15)]"
                    : ticketTemplate === "minimal-clean"
                    ? "bg-white text-slate-900 border-2 border-slate-900 shadow-xl"
                    : ticketTemplate === "thermal-pass"
                    ? "bg-white text-slate-900 border-x border-slate-300 font-mono"
                    : "bg-white text-slate-900 border-x border-slate-200/90 shadow-[0_20px_50px_rgba(0,0,0,0.12)]"
                } ${
                  isPrintingAnim 
                    ? "animate-thermal-feed" 
                    : isTorn 
                    ? "animate-paper-tear" 
                    : ""
                }`}
              >
                {/* Left & Right Side Cutout Notches */}
                <div className="absolute top-[270px] -left-3.5 w-7 h-7 rounded-full bg-slate-100 border-r border-slate-200/90 shadow-inner"></div>
                <div className="absolute top-[270px] -right-3.5 w-7 h-7 rounded-full bg-slate-100 border-l border-slate-200/90 shadow-inner"></div>

                {/* ================= INTERACTIVE TEAR BAR (Red Box Region) ================= */}
                <div
                  onMouseDown={handleMouseDown}
                  onTouchStart={handleTouchStart}
                  onClick={handleTearOff}
                  className={`no-print w-full py-2 px-3 mb-3.5 rounded-xl border-2 border-dashed transition-all select-none flex items-center justify-center gap-2 cursor-grab active:cursor-grabbing ${
                    isTorn
                      ? "bg-emerald-50 border-emerald-300 text-emerald-800"
                      : isDragging
                      ? "bg-blue-100 border-blue-500 text-blue-800 scale-[0.99]"
                      : "bg-blue-50/70 hover:bg-blue-100/90 border-blue-300/80 hover:border-blue-500 text-blue-700 shadow-2xs hover:shadow-xs"
                  }`}
                  title="Click or Drag Down to Tear Off Ticket & Download"
                >
                  <span className={`text-sm ${isDragging ? "animate-spin" : "animate-bounce"}`}>✂️</span>
                  <span className="text-[10.5px] font-black uppercase tracking-wider">
                    {isTorn 
                      ? "✓ Ticket Torn & Saved!" 
                      : isDragging 
                      ? "Release to Tear & Download..." 
                      : "Click or Drag to Tear & Download"}
                  </span>
                  <span className="text-xs opacity-75 hidden sm:inline">⬇️</span>
                </div>

                {/* ================= TICKET CONTENT ================= */}
                {ticketBgPreview ? (
                  /* Custom Uploaded Ticket Template Layout */
                  <div className="w-full relative select-none rounded-xl overflow-hidden shadow-2xl border border-slate-700/50 bg-slate-950 my-1">
                    {/* Uploaded Ticket Template Image */}
                    <img 
                      src={ticketBgPreview} 
                      alt="Official Event Ticket" 
                      className="w-full h-auto object-contain block"
                    />

                    {/* Dynamic Attendee QR Code Stamped at Organizer's Coordinates */}
                    <div 
                      style={{
                        left: `${ticketQrX}%`,
                        top: `${ticketQrY}%`,
                        width: `${ticketQrWidthPercent}%`,
                        transform: "translate(-50%, -50%)"
                      }}
                      className={`absolute z-20 aspect-square flex items-center justify-center p-1.5 rounded-xl transition-all ${
                        ticketQrBg === "white"
                          ? "bg-white shadow-[0_4px_20px_rgba(0,0,0,0.35)] border border-slate-200/80"
                          : ticketQrBg === "glow"
                          ? "bg-slate-950/90 shadow-[0_0_20px_#22d3ee] border-2 border-cyan-400 backdrop-blur-xs"
                          : "bg-transparent"
                      }`}
                    >
                      <img 
                        src={`https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${registrationId || "mock_reg_123"}`} 
                        alt="Attendance QR"
                        className="w-full h-full object-contain"
                      />
                    </div>

                    {/* Optional Attendee Text Overlay */}
                    {ticketShowAttendeeText && (
                      <div
                        style={{
                          left: `${ticketTextX}%`,
                          top: `${ticketTextY}%`,
                          color: ticketTextColor,
                          transform: "translate(-50%, -50%)"
                        }}
                        className="absolute z-20 text-center font-black tracking-wide text-xs sm:text-sm drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] pointer-events-none whitespace-nowrap"
                      >
                        {displayGroupName} • AV-{registrationId?.slice(-6).toUpperCase() || "PASS"}
                      </div>
                    )}
                  </div>
                ) : (
                  /* Standard Thermal Pass Layout */
                  <>
                    {/* 1. Header Logo & Event Badge */}
                    <div className="flex flex-col items-center text-center space-y-2 pb-3.5 relative">
                      {ticketQrPos === "top-right" && (
                        <div className="absolute top-0 right-0 z-10 p-1.5 rounded-xl bg-white border border-slate-200 shadow-md">
                          <img 
                            src={`https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=${registrationId || "mock_reg_123"}`} 
                            alt="Attendance QR Code"
                            className="w-14 h-14 object-contain"
                          />
                        </div>
                      )}

                      {/* Official AI Verse Logo */}
                      <div className="w-16 h-16 rounded-2xl flex items-center justify-center p-1 relative">
                        <img 
                          src="/ai_verse.png" 
                          alt="AI Verse Logo" 
                          className="w-full h-full object-contain drop-shadow-sm" 
                        />
                      </div>

                      <div className="space-y-0.5 pt-1">
                        <span 
                          style={{ backgroundColor: `${ticketPrimaryColor}20`, color: ticketPrimaryColor }}
                          className="text-[9px] font-black px-2.5 py-0.5 rounded-full border uppercase tracking-wider inline-block mb-1"
                        >
                          {ticketPassLabel}
                        </span>
                        <h2 className="text-lg sm:text-xl font-black tracking-tight leading-tight">
                          {displayTitle}
                        </h2>
                        <p className="text-[11px] opacity-70 font-bold uppercase tracking-wider">
                          Innovate • Build • Inspire
                        </p>
                      </div>

                      {/* Status Pill */}
                      <div className="pt-1">
                        <span className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-emerald-50 text-emerald-700 font-extrabold text-[10.5px] border border-emerald-200/70 shadow-2xs">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                          {isConfirmed ? "Team Confirmed" : "Payment Confirmed"}
                        </span>
                      </div>
                    </div>

                    {/* 2. Order Metadata Grid */}
                    <div className="border-t border-slate-200/40 py-3.5 space-y-2.5">
                      <div className="grid grid-cols-2 gap-3 text-left">
                        <div>
                          <span className="text-[9px] font-bold opacity-60 uppercase tracking-wider block">Order No</span>
                          <span className="text-xs font-black font-mono block mt-0.5">{orderNumber}</span>
                        </div>
                        <div>
                          <span className="text-[9px] font-bold opacity-60 uppercase tracking-wider block">Amount</span>
                          <span className="text-xs font-black block mt-0.5">
                            {isFree ? "FREE PASS" : `₹${totalAmount}.00`}
                          </span>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3 text-left pt-1">
                        <div>
                          <span className="text-[9px] font-bold opacity-60 uppercase tracking-wider block">Date & Time</span>
                          <span className="text-[11px] font-extrabold block mt-0.5">
                            {formattedDateStr} • {formattedTimeStr}
                          </span>
                        </div>
                        <div>
                          <span className="text-[9px] font-bold opacity-60 uppercase tracking-wider block">Status</span>
                          <span className="text-[11px] font-extrabold text-emerald-600 block mt-0.5">
                            {isConfirmed ? "Team Confirmed" : (isFree ? "Free Verified" : "Paid In Full")}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Dotted Divider */}
                    <div className="border-t border-dashed border-slate-200/50 my-1"></div>

                    {/* 3. Detailed Information Cards */}
                    <div className="py-3 space-y-3.5 text-left">
                      
                      {/* Event Name Item */}
                      <div className="flex items-start gap-3">
                        <div 
                          style={{ backgroundColor: `${ticketPrimaryColor}20`, color: ticketPrimaryColor }}
                          className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0 border border-slate-200/40 mt-0.5"
                        >
                          <Calendar className="w-4 h-4" />
                        </div>
                        <div className="leading-tight">
                          <span style={{ color: ticketPrimaryColor }} className="text-[9px] font-extrabold uppercase tracking-wider block">Event Name</span>
                          <span className="text-xs font-black block mt-0.5">{displayTitle}</span>
                          <span className="text-[10px] opacity-70 font-semibold block mt-0.5">
                            {event?.category || "HACKATHONS"}
                          </span>
                        </div>
                      </div>

                      {/* Venue Location Item */}
                      {ticketShowVenue && (
                        <div className="flex items-start gap-3">
                          <div 
                            style={{ backgroundColor: `${ticketPrimaryColor}20`, color: ticketPrimaryColor }}
                            className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0 border border-slate-200/40 mt-0.5"
                          >
                            <MapPin className="w-4 h-4" />
                          </div>
                          <div className="leading-tight">
                            <span style={{ color: ticketPrimaryColor }} className="text-[9px] font-extrabold uppercase tracking-wider block">Venue / Hall</span>
                            <span className="text-xs font-black block mt-0.5">{event?.location || "Virtual Hub / Main Hall"}</span>
                          </div>
                        </div>
                      )}

                      {/* Team Name Item */}
                      <div className="flex items-start gap-3">
                        <div 
                          style={{ backgroundColor: `${ticketPrimaryColor}20`, color: ticketPrimaryColor }}
                          className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0 border border-slate-200/40 mt-0.5"
                        >
                          <Users className="w-4 h-4" />
                        </div>
                        <div className="leading-tight">
                          <span style={{ color: ticketPrimaryColor }} className="text-[9px] font-extrabold uppercase tracking-wider block">Team Name</span>
                          <span className="text-xs font-black block mt-0.5">{displayGroupName}</span>
                          <span className="text-[10px] opacity-70 font-mono font-semibold block mt-0.5">
                            Team ID: AV-{registrationId?.slice(-6).toUpperCase() || "PASS"}
                          </span>
                        </div>
                      </div>

                      {/* Team Members List */}
                      {ticketShowMembers && (
                        <div className="flex items-start gap-3">
                          <div 
                            style={{ backgroundColor: `${ticketPrimaryColor}20`, color: ticketPrimaryColor }}
                            className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0 border border-slate-200/40 mt-0.5"
                          >
                            <Users className="w-4 h-4" />
                          </div>
                          <div className="leading-tight flex-1">
                            <span style={{ color: ticketPrimaryColor }} className="text-[9px] font-extrabold uppercase tracking-wider block mb-1">Team Members</span>
                            <div className="space-y-2">
                              {allMembers.map((m, idx) => (
                                <div key={idx} className="text-left leading-tight">
                                  <span className="text-xs font-black block">
                                    {idx + 1}. {m.name} {m.isLead ? <span style={{ color: ticketPrimaryColor }} className="font-extrabold text-[10px]">(Team Lead)</span> : ""}
                                  </span>
                                  <span className="text-[10px] opacity-70 font-medium block pl-3.5 mt-0.5 truncate">
                                    {m.email}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      )}

                    </div>

                    {/* Dotted Divider */}
                    <div className="border-t border-dashed border-slate-200/50 my-1"></div>

                    {/* 4. QR Code & Attendance Instruction (Bottom Placements) */}
                    {ticketQrPos === "bottom-center" && (
                      <div className="py-4 flex flex-col items-center text-center space-y-2">
                        <div className={`p-2.5 rounded-2xl ${
                          ticketQrBg === "white"
                            ? "bg-white border border-slate-200 shadow-inner"
                            : ticketQrBg === "glow"
                            ? "bg-slate-900 border-2 border-cyan-400 shadow-[0_0_12px_#22d3ee]"
                            : "bg-transparent"
                        } inline-block`}>
                          <img 
                            src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${registrationId || "mock_reg_123"}`} 
                            alt="Attendance QR Code"
                            className="w-32 h-32 object-contain"
                          />
                        </div>
                        <span className="text-[9.5px] font-black opacity-60 uppercase tracking-widest block pt-1">
                          Scan to Verify Official Pass
                        </span>
                      </div>
                    )}

                    {ticketQrPos === "bottom-right" && (
                      <div className="py-3 flex items-center justify-between">
                        <div className="space-y-1 text-left">
                          <span className="text-[9px] opacity-60 font-bold uppercase tracking-wider block">Official Check-In</span>
                          <span className="text-xs font-black block">ADMIT {allMembers.length} PERSON(S)</span>
                          <span className="text-[9.5px] text-emerald-600 font-extrabold block">✓ VERIFIED BADGE</span>
                        </div>
                        <div className={`p-2 rounded-xl ${
                          ticketQrBg === "white" ? "bg-white border border-slate-200 shadow-inner" : "bg-transparent"
                        }`}>
                          <img 
                            src={`https://api.qrserver.com/v1/create-qr-code/?size=140x140&data=${registrationId || "mock_reg_123"}`} 
                            alt="Attendance QR Code"
                            className="w-24 h-24 object-contain"
                          />
                        </div>
                      </div>
                    )}

                    {ticketQrPos === "right-panel" && (
                      <div className="py-3 flex items-center justify-between border-t border-slate-200/40">
                        <div className="space-y-1 text-left">
                          <span className="text-[9px] opacity-60 font-bold uppercase tracking-wider block">Boarding Pass Voucher</span>
                          <span className="text-xs font-black block">SECTOR: MAIN AUDITORIUM</span>
                        </div>
                        <div className="p-2 bg-white rounded-xl border border-slate-200 shadow-sm">
                          <img 
                            src={`https://api.qrserver.com/v1/create-qr-code/?size=140x140&data=${registrationId || "mock_reg_123"}`} 
                            alt="Attendance QR Code"
                            className="w-22 h-22 object-contain"
                          />
                        </div>
                      </div>
                    )}

                    {/* Barcode Strip if enabled */}
                    {ticketShowBarcode && (
                      <div className="mt-2 pt-2 border-t border-dashed border-slate-200/40 flex justify-between items-center text-[9px] opacity-60 font-mono">
                        <span>||| || |||| | ||||| ||||</span>
                        <span>PASS-AV-{registrationId?.slice(-6).toUpperCase() || "2026"}</span>
                      </div>
                    )}

                    {/* 5. Realistic Serrated Cut Teeth Edge at Bottom */}
                    <div className="w-full h-4 receipt-serrated-edge mt-2 -mb-2"></div>
                  </>
                )}
              </div>
            </div>

          </div>

          {/* ================= ACTION BUTTONS (Visible & accessible below ticket) ================= */}
          <div className="w-full max-w-[420px] space-y-3 no-print pt-2">
            
            {/* Primary Download Ticket Button */}
            <button
              onClick={handleDownloadTicketImage}
              disabled={isExporting || isPrintingAnim}
              className="w-full py-3.5 px-6 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg shadow-blue-600/25 hover:shadow-xl transition-all cursor-pointer disabled:opacity-75"
            >
              {isExporting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Download className="w-4 h-4" />
              )}
              <span>Download Ticket Pass (PNG)</span>
            </button>

            <div className="grid grid-cols-2 gap-3">
              {/* Print Ticket Button */}
              <button
                onClick={handlePrintBrowser}
                disabled={isPrintingAnim}
                className="py-3 px-4 rounded-2xl bg-white hover:bg-slate-50 border border-slate-200 text-slate-750 font-bold text-xs flex items-center justify-center gap-2 shadow-2xs hover:shadow-xs transition-all cursor-pointer disabled:opacity-75"
              >
                <Printer className="w-4 h-4 text-blue-600" />
                <span>Print Ticket</span>
              </button>

              {/* Re-print animation button */}
              <button
                onClick={handleReplayPrint}
                className="py-3 px-4 rounded-2xl bg-white hover:bg-slate-50 border border-slate-200 text-slate-750 font-bold text-xs flex items-center justify-center gap-2 shadow-2xs hover:shadow-xs transition-all cursor-pointer"
              >
                <Sparkles className="w-4 h-4 text-amber-500" />
                <span>Re-print Pass</span>
              </button>
            </div>

            {/* Mobile-only Notice Card */}
            <div className={`lg:hidden bg-white border rounded-3xl p-5 shadow-md text-left space-y-3 mt-4 ${
              isConfirmed ? "border-emerald-200/90" : "border-amber-200/90"
            }`}>
              <div className={`flex items-center justify-between pb-2 border-b ${
                isConfirmed ? "border-emerald-100" : "border-amber-100"
              }`}>
                {isConfirmed ? (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 font-black text-[10px] uppercase tracking-wider">
                    <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                    Team Confirmed
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-50 border border-amber-200 text-amber-800 font-black text-[10px] uppercase tracking-wider">
                    <Clock className="w-3 h-3 text-amber-600" />
                    Under Review
                  </span>
                )}
                <span className="text-[10px] font-bold text-slate-400 font-mono">ORDER #{orderNumber}</span>
              </div>
              {isConfirmed ? (
                <p className="text-xs text-emerald-950 font-medium leading-relaxed">
                  🎉 Team <strong>"{displayGroupName}"</strong> is <strong>officially confirmed</strong> for {displayTitle}. Access pass is active.
                </p>
              ) : (
                <p className="text-xs text-amber-950 font-medium leading-relaxed">
                  Your registration was completed and is currently <strong>under review</strong>. After your registration review is completed, you will receive an official <strong>confirmation email</strong>.
                </p>
              )}
            </div>

            {/* WhatsApp Community Link */}
            {event?.whatsGroupLink && (
              <a
                href={event.whatsGroupLink}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full py-3 px-4 rounded-2xl bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-800 font-extrabold text-xs flex items-center justify-center gap-2 transition-all shadow-2xs cursor-pointer block"
              >
                <MessageSquare className="w-4 h-4 text-emerald-600" />
                <span>Join Official WhatsApp Group</span>
              </a>
            )}

            {/* Return to portal */}
            <div className="text-center pt-2">
              <Link to="/" className="text-xs font-bold text-slate-400 hover:text-blue-600 transition-colors">
                ← Return to AI Verse Portal
              </Link>
            </div>

          </div>

        </main>
      )}

      {/* Footer */}
      <footer className="no-print bg-slate-900 border-t border-slate-800 px-6 py-6 text-slate-400 text-xs mt-auto">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <span>© 2026 AI Verse Club. Official Event Ticket Voucher.</span>
          <div className="flex gap-6 font-semibold">
            <span className="hover:text-white cursor-pointer">Verification Guide</span>
            <span className="hover:text-white cursor-pointer">Contact Support</span>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default TicketPage;
