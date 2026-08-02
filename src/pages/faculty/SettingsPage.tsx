import React, { useState, useEffect } from "react";
import SEO from "../../components/layout/SEO";
import Button from "../../components/ui/Button";
import { db } from "../../config/firebase";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { 
  Globe, 
  Palette, 
  Settings, 
  Share2, 
  Bell, 
  AlertCircle, 
  X, 
  Upload, 
  Lock, 
  Save, 
  Archive,
  CheckCircle2,
  Trash2,
  Settings2,
  FileArchive,
  ChevronDown
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface ToastMessage {
  id: string;
  text: string;
  type: "success" | "info" | "warning" | "error";
}

interface PortalConfig {
  websiteName: string;
  tagline: string;
  contactEmail: string;
  officeLocation: string;
  logoFilename: string;
  primaryColor: string;
  fontFamily: string;
  maintenanceMode: boolean;
  publicRegistration: boolean;
  pinnedAnnouncements: boolean;
  twitter: string;
  github: string;
  linkedin: string;
  discord: string;
  notifyNewRegistrations: boolean;
  notifyEventSubmissions: boolean;
  notifySecurityThresholds: boolean;
  availableRoles: string[];
}

const SettingsPage: React.FC = () => {
  // Saved default configurations (to support Discard & Reset)
  const defaultConfigs: PortalConfig = {
    websiteName: "AI Excellence Club Portal",
    tagline: "Empowering Innovation",
    contactEmail: "contact@aiexcellence.edu",
    officeLocation: "Innovation Hub, Room 402, North Campus Engineering Block",
    logoFilename: "ai_excellence_logo_v2.png",
    primaryColor: "#0B4AC6",
    fontFamily: "Plus Jakarta Sans (Modern)",
    maintenanceMode: false,
    publicRegistration: true,
    pinnedAnnouncements: false,
    twitter: "twitter.com/aiexcellence",
    github: "github.com/aiexcellence-club",
    linkedin: "linkedin.com/school/ai-excellence",
    discord: "discord.gg/invite_code",
    notifyNewRegistrations: true,
    notifyEventSubmissions: true,
    notifySecurityThresholds: true,
    availableRoles: ["Faculty Coordinator", "Student Lead", "Organizer", "Volunteer"]
  };

  // State configurations
  const [savedConfig, setSavedConfig] = useState<PortalConfig>(defaultConfigs);
  const [currentConfig, setCurrentConfig] = useState<PortalConfig>(defaultConfigs);
  
  // Interactive UI states
  const [toastQueue, setToastQueue] = useState<ToastMessage[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [isDiscarding, setIsDiscarding] = useState(false);
  
  // Modals state
  const [isArchiveModalOpen, setIsArchiveModalOpen] = useState(false);
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);
  const [isArchiving, setIsArchiving] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [newRoleInput, setNewRoleInput] = useState("");
  const [isRoleDropdownOpen, setIsRoleDropdownOpen] = useState(false);

  // Toast trigger helper
  const addToast = (text: string, type: ToastMessage["type"] = "success") => {
    const id = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    setToastQueue(prev => [...prev, { id, text, type }]);
    setTimeout(() => {
      setToastQueue(prev => prev.filter(t => t.id !== id));
    }, 4000);
  };

  // Fetch settings from Firestore on mount
  useEffect(() => {
    const fetchPortalSettings = async () => {
      try {
        const docRef = doc(db, "settings", "portal_config");
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const fetchedData = docSnap.data() as PortalConfig;
          const mergedConfig = { ...defaultConfigs, ...fetchedData };
          setSavedConfig(mergedConfig);
          setCurrentConfig(mergedConfig);
        } else {
          // If document does not exist, save the default config to Firestore
          await setDoc(docRef, defaultConfigs);
          setSavedConfig(defaultConfigs);
          setCurrentConfig(defaultConfigs);
        }
      } catch (err) {
        console.error("Error loading settings from Firestore:", err);
        addToast("Failed to load settings from database. Using local defaults.", "warning");
      }
    };

    fetchPortalSettings();
  }, []);

  // Form value change handler
  const handleChange = (key: keyof PortalConfig, value: any) => {
    setCurrentConfig(prev => ({ ...prev, [key]: value }));
  };

  // Toggle switch handler with immediate Toast feedback
  const handleToggle = (key: keyof PortalConfig, label: string) => {
    const nextVal = !currentConfig[key];
    handleChange(key, nextVal);
    addToast(
      `${label} is now ${nextVal ? "ENABLED" : "DISABLED"}.`,
      nextVal ? "success" : "warning"
    );
  };

  const handleAddRole = () => {
    const trimmed = newRoleInput.trim();
    if (!trimmed) return;
    const currentRoles = currentConfig.availableRoles || ["Faculty Coordinator", "Student Lead", "Organizer", "Volunteer"];
    if (currentRoles.includes(trimmed)) {
      addToast("Role already exists!", "warning");
      return;
    }
    handleChange("availableRoles", [...currentRoles, trimmed]);
    setNewRoleInput("");
    addToast(`"${trimmed}" added. Save Changes to apply!`, "info");
  };

  const handleRemoveRole = (roleToRemove: string) => {
    if (window.confirm(`Are you sure you want to delete the role: "${roleToRemove}"?`)) {
      const currentRoles = currentConfig.availableRoles || ["Faculty Coordinator", "Student Lead", "Organizer", "Volunteer"];
      const nextRoles = currentRoles.filter(r => r !== roleToRemove);
      handleChange("availableRoles", nextRoles);
      addToast(`"${roleToRemove}" removed.`, "warning");
    }
  };

  // Save Portal Configurations
  const handleSaveConfig = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    
    // Validate email
    if (!currentConfig.contactEmail.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
      addToast("Please enter a valid contact email address", "error");
      return;
    }

    setIsSaving(true);
    addToast("Saving portal configurations to Firestore...", "info");

    try {
      const docRef = doc(db, "settings", "portal_config");
      await setDoc(docRef, currentConfig);
      setSavedConfig(currentConfig);
      addToast("Portal configurations updated successfully!");
    } catch (err) {
      console.error("Error writing settings to Firestore:", err);
      addToast("Failed to save configurations to Firestore.", "error");
    } finally {
      setIsSaving(false);
    }
  };

  // Discard Changes
  const handleDiscardChanges = () => {
    setIsDiscarding(true);
    addToast("Reverting current modifications...", "info");

    setTimeout(() => {
      setCurrentConfig(savedConfig);
      setIsDiscarding(false);
      addToast("Form changes discarded successfully.", "info");
    }, 800);
  };

  // Archive Semester Simulation
  const handleArchiveSemester = () => {
    setIsArchiving(true);
    addToast("Freezing Fall 2023 semester historical records...", "info");

    setTimeout(() => {
      setIsArchiving(false);
      setIsArchiveModalOpen(false);
      addToast("Fall 2023 semester data frozen & archived successfully!");
    }, 1500);
  };

  // Reset Portal Configuration to system defaults
  const handleResetPortal = async () => {
    setIsResetting(true);
    addToast("Restoring settings to factory defaults in Firestore...", "info");

    try {
      const docRef = doc(db, "settings", "portal_config");
      await setDoc(docRef, defaultConfigs);
      setCurrentConfig(defaultConfigs);
      setSavedConfig(defaultConfigs);
      addToast("All configurations restored to system defaults.");
    } catch (err) {
      console.error("Error resetting settings in Firestore:", err);
      addToast("Failed to reset configurations in Firestore.", "error");
    } finally {
      setIsResetting(false);
      setIsResetModalOpen(false);
    }
  };

  // Simulate Logo Upload
  const handleLogoUploadClick = () => {
    addToast("Selecting new club logo file...", "info");
    setTimeout(() => {
      const mockLogoName = `logo_excellence_${Math.floor(Math.random() * 900) + 100}.png`;
      handleChange("logoFilename", mockLogoName);
      addToast(`Logo file "${mockLogoName}" uploaded successfully.`);
    }, 1000);
  };

  return (
    <div className="space-y-6 text-left relative">
      <SEO 
        title="Portal Configuration - Settings Dashboard" 
        description="Configure general settings, brand visual identity, operation modes, notifications toggles, and Superadmin danger zone credentials." 
        keywords="AI Verse settings portal, brand customizers, database archivers"
      />

      {/* Toast Notification Container */}
      <div className="fixed top-5 right-5 z-[9999] flex flex-col gap-2 max-w-sm">
        <AnimatePresence>
          {toastQueue.map(toast => (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, y: -20, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.2 } }}
              className={`p-4 rounded-xl shadow-lg flex items-center gap-3 border text-sm font-semibold 
                ${toast.type === "success" ? "bg-green-50 border-green-200 text-green-800" : ""}
                ${toast.type === "info" ? "bg-blue-50 border-blue-200 text-blue-800" : ""}
                ${toast.type === "warning" ? "bg-yellow-50 border-yellow-200 text-yellow-800" : ""}
                ${toast.type === "error" ? "bg-red-50 border-red-200 text-red-800" : ""}`}
            >
              <CheckCircle2 className="h-4.5 w-4.5 shrink-0" />
              <span>{toast.text}</span>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Header section with Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-800 tracking-tight font-sans">Settings</h1>
          <p className="text-slate-500 text-sm mt-1 font-medium">
            Manage global parameters and visual identity of the AI Excellence Club portal.
          </p>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <Button 
            variant="outline" 
            size="md" 
            onClick={handleDiscardChanges}
            disabled={isSaving || isDiscarding}
            className="border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-bold"
          >
            Discard Changes
          </Button>
          <Button 
            variant="primary" 
            size="md" 
            onClick={() => handleSaveConfig()}
            isLoading={isSaving}
            className="bg-[#2563EB] hover:bg-blue-700 text-white flex items-center gap-1.5"
          >
            <Save className="h-4 w-4" />
            Save Changes
          </Button>
        </div>
      </div>

      {/* Main Grid: Portal Configuration (Two Columns) */}
      <form onSubmit={(e) => { e.preventDefault(); handleSaveConfig(); }} className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* LEFT COLUMN: General, Operations, Notifications (7 / 12) */}
        <div className="lg:col-span-7 space-y-6">
          
          {/* Card 1: General Settings */}
          <div className="bg-white p-6 rounded-card border border-slate-100 shadow-card text-left space-y-5">
            <div className="flex items-center gap-3 border-b border-slate-50 pb-3">
              <div className="p-2 bg-blue-50 text-blue-600 rounded-xl">
                <Globe className="h-5 w-5" />
              </div>
              <h2 className="text-base font-bold text-slate-800">General Settings</h2>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Website Name */}
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Website Name</label>
                  <input
                    type="text"
                    required
                    value={currentConfig.websiteName}
                    onChange={(e) => handleChange("websiteName", e.target.value)}
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-semibold text-slate-700 bg-slate-50"
                  />
                </div>

                {/* Tagline */}
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Tagline</label>
                  <input
                    type="text"
                    required
                    value={currentConfig.tagline}
                    onChange={(e) => handleChange("tagline", e.target.value)}
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-semibold text-slate-700 bg-slate-50"
                  />
                </div>
              </div>

              {/* Contact Email Address */}
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Contact Email Address</label>
                <input
                  type="email"
                  required
                  value={currentConfig.contactEmail}
                  onChange={(e) => handleChange("contactEmail", e.target.value)}
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-semibold text-slate-700 bg-slate-50"
                />
              </div>

              {/* Office Location */}
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Office Location</label>
                <textarea
                  rows={2}
                  required
                  value={currentConfig.officeLocation}
                  onChange={(e) => handleChange("officeLocation", e.target.value)}
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-semibold text-slate-700 bg-slate-50 resize-none"
                />
              </div>
            </div>
          </div>

          {/* Card 2: Operations */}
          <div className="bg-white p-6 rounded-card border border-slate-100 shadow-card text-left space-y-5">
            <div className="flex items-center gap-3 border-b border-slate-50 pb-3">
              <div className="p-2 bg-blue-50 text-blue-600 rounded-xl">
                <Settings className="h-5 w-5" />
              </div>
              <h2 className="text-base font-bold text-slate-800">Operations</h2>
            </div>

            <div className="space-y-4">
              {/* Maintenance Mode */}
              <div className="flex items-center justify-between py-1 hover:bg-slate-50/50 rounded-lg transition-colors px-2">
                <div className="text-left leading-tight">
                  <h4 className="text-xs font-bold text-slate-800">Maintenance Mode</h4>
                  <p className="text-[10px] text-slate-400 font-semibold mt-0.5">
                    Show maintenance page to public
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => handleToggle("maintenanceMode", "Maintenance Mode")}
                  className={`w-9 h-5.5 flex items-center rounded-full p-1 transition-colors cursor-pointer outline-none
                    ${currentConfig.maintenanceMode ? "bg-[#2563EB]" : "bg-slate-200"}`}
                >
                  <div className={`bg-white w-3.5 h-3.5 rounded-full shadow transform transition-transform duration-200 
                    ${currentConfig.maintenanceMode ? "translate-x-3.5" : "translate-x-0"}`} 
                  />
                </button>
              </div>

              {/* Public Registration */}
              <div className="flex items-center justify-between py-1 hover:bg-slate-50/50 rounded-lg transition-colors px-2">
                <div className="text-left leading-tight">
                  <h4 className="text-xs font-bold text-slate-800">Public Registration</h4>
                  <p className="text-[10px] text-slate-400 font-semibold mt-0.5">
                    Allow new students to sign up
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => handleToggle("publicRegistration", "Public Registration")}
                  className={`w-9 h-5.5 flex items-center rounded-full p-1 transition-colors cursor-pointer outline-none
                    ${currentConfig.publicRegistration ? "bg-[#2563EB]" : "bg-slate-200"}`}
                >
                  <div className={`bg-white w-3.5 h-3.5 rounded-full shadow transform transition-transform duration-200 
                    ${currentConfig.publicRegistration ? "translate-x-3.5" : "translate-x-0"}`} 
                  />
                </button>
              </div>

              {/* Pinned Announcements */}
              <div className="flex items-center justify-between py-1 hover:bg-slate-50/50 rounded-lg transition-colors px-2">
                <div className="text-left leading-tight">
                  <h4 className="text-xs font-bold text-slate-800">Pinned Announcements</h4>
                  <p className="text-[10px] text-slate-400 font-semibold mt-0.5">
                    Force banner visibility globally
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => handleToggle("pinnedAnnouncements", "Pinned Announcements banner")}
                  className={`w-9 h-5.5 flex items-center rounded-full p-1 transition-colors cursor-pointer outline-none
                    ${currentConfig.pinnedAnnouncements ? "bg-[#2563EB]" : "bg-slate-200"}`}
                >
                  <div className={`bg-white w-3.5 h-3.5 rounded-full shadow transform transition-transform duration-200 
                    ${currentConfig.pinnedAnnouncements ? "translate-x-3.5" : "translate-x-0"}`} 
                  />
                </button>
              </div>
            </div>
          </div>

          {/* Card 3: System Notifications */}
          <div className="bg-white p-6 rounded-card border border-slate-100 shadow-card text-left space-y-5">
            <div className="flex items-center gap-3 border-b border-slate-50 pb-3">
              <div className="p-2 bg-blue-50 text-blue-600 rounded-xl">
                <Bell className="h-5 w-5" />
              </div>
              <h2 className="text-base font-bold text-slate-800">System Notifications</h2>
            </div>

            <div className="space-y-4">
              {/* New Registrations */}
              <div className="flex items-center justify-between py-1.5 hover:bg-slate-50/50 rounded-xl transition-colors px-3 border border-slate-100">
                <div className="text-left leading-tight">
                  <h4 className="text-xs font-bold text-slate-800">New Registrations</h4>
                  <p className="text-[10px] text-slate-400 font-semibold mt-0.5">
                    Receive email alert when a student joins
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => handleToggle("notifyNewRegistrations", "New Registrations alerts")}
                  className={`w-9 h-5.5 flex items-center rounded-full p-1 transition-colors cursor-pointer outline-none
                    ${currentConfig.notifyNewRegistrations ? "bg-[#2563EB]" : "bg-slate-200"}`}
                >
                  <div className={`bg-white w-3.5 h-3.5 rounded-full shadow transform transition-transform duration-200 
                    ${currentConfig.notifyNewRegistrations ? "translate-x-3.5" : "translate-x-0"}`} 
                  />
                </button>
              </div>

              {/* Event Submissions */}
              <div className="flex items-center justify-between py-1.5 hover:bg-slate-50/50 rounded-xl transition-colors px-3 border border-slate-100">
                <div className="text-left leading-tight">
                  <h4 className="text-xs font-bold text-slate-800">Event Submissions</h4>
                  <p className="text-[10px] text-slate-400 font-semibold mt-0.5">
                    Alert when a proposal requires review
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => handleToggle("notifyEventSubmissions", "Event Submissions alerts")}
                  className={`w-9 h-5.5 flex items-center rounded-full p-1 transition-colors cursor-pointer outline-none
                    ${currentConfig.notifyEventSubmissions ? "bg-[#2563EB]" : "bg-slate-200"}`}
                >
                  <div className={`bg-white w-3.5 h-3.5 rounded-full shadow transform transition-transform duration-200 
                    ${currentConfig.notifyEventSubmissions ? "translate-x-3.5" : "translate-x-0"}`} 
                  />
                </button>
              </div>

              {/* Security Thresholds */}
              <div className="flex items-center justify-between py-1.5 hover:bg-slate-50/50 rounded-xl transition-colors px-3 border border-slate-100">
                <div className="text-left leading-tight">
                  <h4 className="text-xs font-bold text-slate-800">Security Thresholds</h4>
                  <p className="text-[10px] text-slate-400 font-semibold mt-0.5">
                    Alert for multiple failed login attempts
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => handleToggle("notifySecurityThresholds", "Security Thresholds warnings")}
                  className={`w-9 h-5.5 flex items-center rounded-full p-1 transition-colors cursor-pointer outline-none
                    ${currentConfig.notifySecurityThresholds ? "bg-[#2563EB]" : "bg-slate-200"}`}
                >
                  <div className={`bg-white w-3.5 h-3.5 rounded-full shadow transform transition-transform duration-200 
                    ${currentConfig.notifySecurityThresholds ? "translate-x-3.5" : "translate-x-0"}`} 
                  />
                </button>
              </div>
            </div>
          </div>

          {/* Card: Roles & Positions */}
          <div className="bg-white p-6 rounded-card border border-slate-100 shadow-card text-left space-y-5">
            <div className="flex items-center gap-3 border-b border-slate-50 pb-3">
              <div className="p-2 bg-blue-50 text-blue-600 rounded-xl">
                <Settings2 className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-800">Roles & Positions</h2>
                <p className="text-[10px] text-slate-400 font-semibold mt-0.5">Manage available roles that populate the Add Team Member page.</p>
              </div>
            </div>

            <div className="space-y-4">
              {/* Add New Role */}
              <div className="flex gap-2.5">
                <input
                  type="text"
                  placeholder="e.g. Lead Designer"
                  value={newRoleInput}
                  onChange={(e) => setNewRoleInput(e.target.value)}
                  className="flex-1 px-4 py-2.5 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 bg-slate-50/20 focus:outline-none focus:border-blue-500"
                />
                <button
                  type="button"
                  onClick={handleAddRole}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-2xl text-xs transition-colors shrink-0"
                >
                  Add Role
                </button>
              </div>

              {/* Roles List */}
              <div className="space-y-2 relative">
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Active Roles</label>
                
                <button
                  type="button"
                  onClick={() => setIsRoleDropdownOpen(!isRoleDropdownOpen)}
                  className="w-full flex items-center justify-between px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
                >
                  <span>View All Active Roles ({(currentConfig.availableRoles || []).length})</span>
                  <ChevronDown className={`h-4 w-4 text-slate-400 transition-transform ${isRoleDropdownOpen ? "rotate-180" : ""}`} />
                </button>

                {isRoleDropdownOpen && (
                  <div className="absolute z-10 w-full mt-1 bg-white border border-slate-100 rounded-xl shadow-xl max-h-60 overflow-y-auto">
                    {(currentConfig.availableRoles || []).map((role) => (
                      <div 
                        key={role} 
                        className="flex items-center justify-between px-4 py-3 hover:bg-slate-50 border-b border-slate-50 last:border-0 group transition-colors"
                      >
                        <span className="text-xs font-bold text-slate-700">{role}</span>
                        <button
                          type="button"
                          onClick={() => handleRemoveRole(role)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 opacity-0 group-hover:opacity-100 transition-all focus:opacity-100"
                          title="Delete Role"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                    {(currentConfig.availableRoles || []).length === 0 && (
                      <div className="px-4 py-3 text-xs text-slate-500 font-semibold text-center">
                        No active roles defined.
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

        </div>

        {/* RIGHT COLUMN: Branding, Social, Danger Zone (5 / 12) */}
        <div className="lg:col-span-5 space-y-6">
          
          {/* Card 4: Branding & Theme */}
          <div className="bg-white p-6 rounded-card border border-slate-100 shadow-card text-left space-y-5">
            <div className="flex items-center gap-3 border-b border-slate-50 pb-3">
              <div className="p-2 bg-blue-50 text-blue-600 rounded-xl">
                <Palette className="h-5 w-5" />
              </div>
              <h2 className="text-base font-bold text-slate-800">Branding & Theme</h2>
            </div>

            <div className="space-y-4">
              {/* Club Logo */}
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Club Logo</label>
                <div className="flex items-center gap-4">
                  {/* Upload logo box */}
                  <div 
                    onClick={handleLogoUploadClick}
                    className="w-20 h-20 border-2 border-dashed border-slate-200 hover:border-blue-500 rounded-xl flex flex-col items-center justify-center cursor-pointer hover:bg-slate-50 transition-colors shrink-0"
                  >
                    <Upload className="h-4.5 w-4.5 text-slate-400" />
                    <span className="text-[10px] font-bold text-slate-400 mt-1 block">LOGO</span>
                  </div>
                  
                  <div className="leading-tight">
                    <span className="text-xs font-bold text-slate-800 block truncate max-w-[200px]">
                      {currentConfig.logoFilename}
                    </span>
                    <p className="text-[9px] font-bold text-slate-400 leading-normal mt-1">
                      Recommended size 512x512px. SVG or PNG preferred.
                    </p>
                    <button 
                      type="button" 
                      onClick={() => addToast("Current Logo downloaded successfully.", "info")}
                      className="text-[10px] font-bold text-[#2563EB] hover:underline mt-1.5 block"
                    >
                      Download Current
                    </button>
                  </div>
                </div>
              </div>

              {/* Primary Brand Color */}
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Primary Brand Color</label>
                <div className="flex items-center gap-2">
                  <div 
                    className="w-10 h-10 border rounded-xl shadow-sm transition-colors duration-200 shrink-0"
                    style={{ backgroundColor: currentConfig.primaryColor }}
                  />
                  <input
                    type="text"
                    value={currentConfig.primaryColor}
                    onChange={(e) => handleChange("primaryColor", e.target.value)}
                    placeholder="#2563EB"
                    className="flex-grow px-4 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-semibold text-slate-700 bg-slate-50 font-mono"
                  />
                </div>
              </div>

              {/* Font Family Preference */}
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Font Family Preference</label>
                <select
                  value={currentConfig.fontFamily}
                  onChange={(e) => handleChange("fontFamily", e.target.value)}
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-bold text-slate-700 bg-slate-50 cursor-pointer"
                >
                  <option value="Plus Jakarta Sans (Modern)">Plus Jakarta Sans (Modern)</option>
                  <option value="Inter (Classic)">Inter (Classic)</option>
                  <option value="Poppins (Geometrical)">Poppins (Geometrical)</option>
                </select>
              </div>
            </div>
          </div>

          {/* Card 5: Social Ecosystem */}
          <div className="bg-white p-6 rounded-card border border-slate-100 shadow-card text-left space-y-5">
            <div className="flex items-center gap-3 border-b border-slate-50 pb-3">
              <div className="p-2 bg-blue-50 text-blue-600 rounded-xl">
                <Share2 className="h-5 w-5" />
              </div>
              <h2 className="text-base font-bold text-slate-800">Social Ecosystem</h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Twitter X */}
              <div>
                <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Twitter (X)</label>
                <input
                  type="text"
                  value={currentConfig.twitter}
                  onChange={(e) => handleChange("twitter", e.target.value)}
                  className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-semibold text-slate-700 bg-slate-50"
                />
              </div>

              {/* GitHub */}
              <div>
                <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">GitHub</label>
                <input
                  type="text"
                  value={currentConfig.github}
                  onChange={(e) => handleChange("github", e.target.value)}
                  className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-semibold text-slate-700 bg-slate-50"
                />
              </div>

              {/* LinkedIn */}
              <div>
                <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">LinkedIn</label>
                <input
                  type="text"
                  value={currentConfig.linkedin}
                  onChange={(e) => handleChange("linkedin", e.target.value)}
                  className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-semibold text-slate-700 bg-slate-50"
                />
              </div>

              {/* Discord Invite */}
              <div>
                <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Discord Invite</label>
                <input
                  type="text"
                  value={currentConfig.discord}
                  onChange={(e) => handleChange("discord", e.target.value)}
                  className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-semibold text-slate-700 bg-slate-50"
                />
              </div>
            </div>
          </div>

          {/* Card 6: Danger Zone */}
          <div className="bg-red-50/30 p-6 rounded-card border border-red-200/60 text-left space-y-4">
            <div className="flex items-center gap-3 border-b border-red-100 pb-3">
              <div className="p-2 bg-red-100 text-red-600 rounded-xl">
                <AlertCircle className="h-5 w-5" />
              </div>
              <h2 className="text-base font-bold text-red-800">Danger Zone</h2>
            </div>
            
            <p className="text-[10px] font-medium text-slate-500 leading-normal">
              Irreversible actions that affect the core portal infrastructure and historical data.
            </p>

            <div className="space-y-3.5">
              {/* Archive Semester */}
              <div className="flex items-center justify-between p-3.5 bg-white border border-red-100 rounded-xl">
                <div className="leading-tight">
                  <h4 className="text-xs font-bold text-slate-800">Archive Semester</h4>
                  <p className="text-[9px] text-slate-400 font-semibold mt-0.5">
                    Freeze Fall 2023 data
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsArchiveModalOpen(true)}
                  className="px-3.5 py-1.5 rounded-lg border border-red-200 text-red-600 hover:bg-red-50 text-xs font-bold transition-all outline-none"
                >
                  Archive Now
                </button>
              </div>

              {/* Reset Configurations */}
              <div className="flex items-center justify-between p-3.5 bg-white border border-red-100 rounded-xl">
                <div className="leading-tight">
                  <h4 className="text-xs font-bold text-slate-800">Reset Configuration</h4>
                  <p className="text-[9px] text-slate-400 font-semibold mt-0.5">
                    Restore all default settings
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsResetModalOpen(true)}
                  className="px-3.5 py-1.5 rounded-lg border border-red-200 text-red-600 hover:bg-red-50 text-xs font-bold transition-all outline-none"
                >
                  Reset Portal
                </button>
              </div>
            </div>

            <div className="pt-2 flex items-center justify-center gap-1.5 text-[9px] font-extrabold text-red-600 uppercase tracking-widest leading-none">
              <Lock className="h-3.5 w-3.5 shrink-0" />
              <span>Superadmin Authentication Required</span>
            </div>
          </div>

        </div>

      </form>

      {/* FOOTER ACTIONS BAR */}
      <div className="border-t border-slate-200 pt-6 mt-6 flex flex-col sm:flex-row items-center justify-end gap-3.5">
        <Button 
          type="button" 
          variant="outline" 
          onClick={handleDiscardChanges}
          disabled={isSaving || isDiscarding}
          className="w-full sm:w-auto border-slate-200 bg-white text-slate-700 hover:bg-slate-50 font-bold"
        >
          Discard All Changes
        </Button>
        <Button 
          type="button" 
          variant="primary" 
          onClick={handleSaveConfig}
          isLoading={isSaving}
          className="w-full sm:w-auto bg-[#2563EB] hover:bg-blue-700 text-white flex items-center justify-center gap-1.5"
        >
          <Settings2 className="h-4 w-4" />
          Confirm System Update
        </Button>
      </div>

      {/* ARCHIVE CONFIRMATION MODAL */}
      {isArchiveModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div 
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" 
            onClick={() => !isArchiving && setIsArchiveModalOpen(false)}
          />
          
          <div className="bg-white rounded-card shadow-xl border border-slate-100 max-w-md w-full relative z-10 p-6 sm:p-8 animate-in fade-in zoom-in-95 duration-200">
            <button 
              onClick={() => !isArchiving && setIsArchiveModalOpen(false)}
              disabled={isArchiving}
              className="absolute top-5 right-5 text-slate-400 hover:text-slate-600 p-1.5 hover:bg-slate-50 rounded-lg disabled:opacity-40"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="flex items-center gap-2.5 text-red-600">
              <Archive className="h-6 w-6" />
              <h3 className="text-xl font-bold text-slate-800 font-sans">Archive Semester</h3>
            </div>
            
            <div className="mt-4 space-y-3 text-left text-sm leading-normal text-slate-600">
              <p>
                You are about to archive the **Fall 2023** semester. This action will freeze all records, event data, student registrations, and statistics for this period.
              </p>
              <p className="font-bold text-red-600 bg-red-50 p-3 rounded-lg border border-red-100 text-xs">
                WARNING: This process is irreversible and prevents further edits to event history or database parameters for Fall 2023.
              </p>
            </div>

            <div className="pt-6 mt-6 border-t flex justify-end gap-3">
              <Button 
                variant="outline" 
                onClick={() => setIsArchiveModalOpen(false)}
                disabled={isArchiving}
                className="border-slate-200"
              >
                Cancel
              </Button>
              <Button 
                variant="danger" 
                onClick={handleArchiveSemester}
                isLoading={isArchiving}
                className="bg-red-600 hover:bg-red-700 text-white flex items-center gap-1.5"
              >
                <FileArchive className="h-3.5 w-3.5" />
                Confirm Archival
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* RESET CONFIRMATION MODAL */}
      {isResetModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div 
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" 
            onClick={() => !isResetting && setIsResetModalOpen(false)}
          />
          
          <div className="bg-white rounded-card shadow-xl border border-slate-100 max-w-md w-full relative z-10 p-6 sm:p-8 animate-in fade-in zoom-in-95 duration-200">
            <button 
              onClick={() => !isResetting && setIsResetModalOpen(false)}
              disabled={isResetting}
              className="absolute top-5 right-5 text-slate-400 hover:text-slate-600 p-1.5 hover:bg-slate-50 rounded-lg disabled:opacity-40"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="flex items-center gap-2.5 text-red-600">
              <Trash2 className="h-6 w-6" />
              <h3 className="text-xl font-bold text-slate-800 font-sans">Reset Portal Configurations</h3>
            </div>
            
            <div className="mt-4 space-y-3 text-left text-sm leading-normal text-slate-600">
              <p>
                This action will restore all website portal configurations (Website Name, brand colors, taglines, social invite links, operations parameters, and notifications configurations) to their factory defaults.
              </p>
              <p className="font-bold text-red-600 bg-red-50 p-3 rounded-lg border border-red-100 text-xs">
                WARNING: All current active configurations will be lost and immediately overwritten.
              </p>
            </div>

            <div className="pt-6 mt-6 border-t flex justify-end gap-3">
              <Button 
                variant="outline" 
                onClick={() => setIsResetModalOpen(false)}
                disabled={isResetting}
                className="border-slate-200"
              >
                Cancel
              </Button>
              <Button 
                variant="danger" 
                onClick={handleResetPortal}
                isLoading={isResetting}
                className="bg-red-600 hover:bg-red-700 text-white flex items-center gap-1.5"
              >
                <Trash2 className="h-3.5 w-3.5" />
                Confirm Reset
              </Button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default SettingsPage;
