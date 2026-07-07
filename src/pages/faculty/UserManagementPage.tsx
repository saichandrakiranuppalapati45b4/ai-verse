import React, { useState, useMemo } from "react";
import SEO from "../../components/layout/SEO";
import { 
  Search, 
  UserPlus, 
  MoreVertical, 
  Trash2, 
  Check, 
  UserX, 
  UserCheck, 
  X, 
  Filter,
  Shield,
  Clock,
  Archive,
  ChevronLeft,
  ChevronRight,
  ArrowRight,
  User,
  Zap,
  ClipboardList,
  AlertCircle
} from "lucide-react";
import { db } from "../../config/firebase";
import { collection, addDoc, doc, getDoc } from "firebase/firestore";
import Button from "../../components/ui/Button";

// Import local assets
import elenaImg from "../../assets/images/elena.png";
import marcusImg from "../../assets/images/marcus.png";
import sophieImg from "../../assets/images/sophie.png";
import sarahImg from "../../assets/images/sarah.png";
import liamImg from "../../assets/images/liam.png";
import aminaImg from "../../assets/images/amina.png";
import satoshiImg from "../../assets/images/satoshi.png";
import kenjiImg from "../../assets/images/kenji.png";
import davidImg from "../../assets/images/david.png";

interface UserItem {
  id: string;
  name: string;
  email: string;
  role: "Student Member" | "Student Organizer" | "Faculty Coordinator" | "Guest";
  department: "Robotics & Vision" | "Computer Science" | "Ethics & AI" | "Data Science";
  status: "Active" | "Pending" | "Deactivated";
  image?: string;
}

const UserManagementPage: React.FC = () => {
  // Mock initial list matching the mockup plus extra candidates for pagination/filtering
  const [users, setUsers] = useState<UserItem[]>([
    {
      id: "1",
      name: "Elena Rodriguez",
      email: "elena.r@university.edu",
      role: "Student Organizer",
      department: "Robotics & Vision",
      status: "Active",
      image: elenaImg
    },
    {
      id: "2",
      name: "Marcus Chen",
      email: "m.chen@university.edu",
      role: "Faculty Coordinator",
      department: "Computer Science",
      status: "Active",
      image: marcusImg
    },
    {
      id: "3",
      name: "Julian Smith",
      email: "j.smith@candidate.com",
      role: "Guest",
      department: "Ethics & AI",
      status: "Pending"
    },
    {
      id: "4",
      name: "Sofia Al-Fayed",
      email: "sofia.af@university.edu",
      role: "Student Member",
      department: "Data Science",
      status: "Deactivated",
      image: sophieImg
    },
    {
      id: "5",
      name: "Sarah Jenkins",
      email: "s.jenkins@university.edu",
      role: "Faculty Coordinator",
      department: "Ethics & AI",
      status: "Active",
      image: sarahImg
    },
    {
      id: "6",
      name: "Liam O'Connor",
      email: "l.oconnor@university.edu",
      role: "Student Member",
      department: "Computer Science",
      status: "Active",
      image: liamImg
    },
    {
      id: "7",
      name: "Amina Patel",
      email: "a.patel@university.edu",
      role: "Student Organizer",
      department: "Data Science",
      status: "Active",
      image: aminaImg
    },
    {
      id: "8",
      name: "Satoshi Nakamoto",
      email: "satoshin@university.edu",
      role: "Student Member",
      department: "Robotics & Vision",
      status: "Active",
      image: satoshiImg
    },
    {
      id: "9",
      name: "Kenji Sato",
      email: "k.sato@university.edu",
      role: "Student Member",
      department: "Data Science",
      status: "Deactivated",
      image: kenjiImg
    },
    {
      id: "10",
      name: "David Miller",
      email: "d.miller@candidate.com",
      role: "Guest",
      department: "Computer Science",
      status: "Pending",
      image: davidImg
    },
    {
      id: "11",
      name: "Zara Vance",
      email: "z.vance@university.edu",
      role: "Student Organizer",
      department: "Ethics & AI",
      status: "Active"
    },
    {
      id: "12",
      name: "Oliver Quinn",
      email: "o.quinn@university.edu",
      role: "Student Member",
      department: "Robotics & Vision",
      status: "Pending"
    }
  ]);

  // States
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("All");
  const [deptFilter, setDeptFilter] = useState<string>("All");
  const [statusFilter, setStatusFilter] = useState<string>("All");
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  // Invite Modal States
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [inviteName, setInviteName] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<UserItem["role"]>("Student Member");
  const [inviteDept, setInviteDept] = useState<UserItem["department"]>("Computer Science");
  
  // Dropdown actions states
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);

  // Add Team Member Form States
  const [showAddMemberForm, setShowAddMemberForm] = useState(false);
  const [formName, setFormName] = useState("");
  const [formEmail, setFormEmail] = useState("");
  const [formDept, setFormDept] = useState("Computer Science");
  const [formRoleType, setFormRoleType] = useState<string>("Organizer");
  const [formPosition, setFormPosition] = useState("");
  const [formBio, setFormBio] = useState("");
  const [formLinkedin, setFormLinkedin] = useState("");
  const [formGithub, setFormGithub] = useState("");
  const [formPhotoPreview, setFormPhotoPreview] = useState("");
  const [addingToTeam, setAddingToTeam] = useState(false);

  const [availableRoles, setAvailableRoles] = useState<string[]>([
    "Faculty Coordinator",
    "Student Lead",
    "Organizer",
    "Volunteer"
  ]);

  React.useEffect(() => {
    const fetchRoles = async () => {
      try {
        const docRef = doc(db, "settings", "portal_config");
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const data = docSnap.data();
          if (data.availableRoles && Array.isArray(data.availableRoles)) {
            setAvailableRoles(data.availableRoles);
            if (data.availableRoles.length > 0) {
              setFormRoleType(data.availableRoles[0]);
            }
          }
        }
      } catch (err) {
        console.error("Error loading available roles:", err);
      }
    };
    fetchRoles();
  }, [showAddMemberForm]);

  // Stats derived from all current users
  const totalCount = 1284 + (users.length - 12); // Keep offset to match mockup base totals
  const pendingCount = 42 + users.filter(u => u.status === "Pending").length - 2;
  const activeOrganizersCount = 18 + users.filter(u => u.role === "Student Organizer" && u.status === "Active").length - 2;
  const deactivatedCount = 9 + users.filter(u => u.status === "Deactivated").length - 2;

  // Filters logic
  const filteredUsers = useMemo(() => {
    return users.filter(user => {
      const matchesSearch = 
        user.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
        user.email.toLowerCase().includes(searchQuery.toLowerCase()) || 
        user.department.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesRole = roleFilter === "All" || user.role === roleFilter;
      const matchesDept = deptFilter === "All" || user.department === deptFilter;
      const matchesStatus = statusFilter === "All" || user.status === statusFilter;

      return matchesSearch && matchesRole && matchesDept && matchesStatus;
    });
  }, [users, searchQuery, roleFilter, deptFilter, statusFilter]);

  // Paginated users
  const paginatedUsers = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredUsers.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredUsers, currentPage]);

  const totalPages = Math.max(1, Math.ceil(filteredUsers.length / itemsPerPage));

  // Reset pagination if filters change
  React.useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, roleFilter, deptFilter, statusFilter]);

  // Actions handlers
  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormPhotoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAddTeamMemberSubmit = async () => {
    if (!formName.trim()) {
      alert("Full Name is required!");
      return;
    }
    if (!formEmail.trim() || !formEmail.includes("@")) {
      alert("A valid email address is required!");
      return;
    }
    if (!formPosition.trim()) {
      alert("Specific Position Title is required!");
      return;
    }

    setAddingToTeam(true);
    try {
      const payload = {
        name: formName,
        email: formEmail,
        department: formDept,
        roleType: formRoleType,
        position: formPosition,
        bio: formBio,
        linkedin: formLinkedin,
        github: formGithub,
        image: formPhotoPreview || "",
        createdAt: Date.now()
      };

      await addDoc(collection(db, "team"), payload);
      alert("Member successfully added to team!");
      
      // Add member locally to user management table list too
      const localRoleMapping = 
        formRoleType === "Faculty Coordinator" ? "Faculty Coordinator" as const : 
        formRoleType === "Student Lead" ? "Student Organizer" as const : 
        formRoleType === "Organizer" ? "Student Organizer" as const : "Guest" as const;
        
      const newUser: UserItem = {
        id: Date.now().toString(),
        name: formName,
        email: formEmail,
        role: localRoleMapping,
        department: formDept as any,
        status: "Active"
      };
      setUsers(prev => [newUser, ...prev]);

      // Reset state and return to user list view
      setFormName("");
      setFormEmail("");
      setFormDept("Computer Science");
      setFormRoleType("Organizer");
      setFormPosition("");
      setFormBio("");
      setFormLinkedin("");
      setFormGithub("");
      setFormPhotoPreview("");
      setShowAddMemberForm(false);
    } catch (err) {
      console.error("Error adding team member:", err);
      alert("Failed to add team member. Please try again.");
    } finally {
      setAddingToTeam(false);
    }
  };

  // Actions handlers
  const handleAddMember = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteName || !inviteEmail) return;

    const newUser: UserItem = {
      id: Date.now().toString(),
      name: inviteName,
      email: inviteEmail,
      role: inviteRole,
      department: inviteDept,
      status: "Active" // Invites defaults to Active or Pending based on role
    };

    setUsers([newUser, ...users]);
    setInviteName("");
    setInviteEmail("");
    setIsInviteModalOpen(false);
  };

  const handleStatusChange = (id: string, newStatus: UserItem["status"]) => {
    setUsers(users.map(u => u.id === id ? { ...u, status: newStatus } : u));
    setActiveMenuId(null);
  };

  const handleRoleChange = (id: string, newRole: UserItem["role"]) => {
    setUsers(users.map(u => u.id === id ? { ...u, role: newRole } : u));
    setActiveMenuId(null);
  };

  const handleDeleteUser = (id: string) => {
    setUsers(users.filter(u => u.id !== id));
    setActiveMenuId(null);
  };

  // Helper to render beautiful initials avatar
  const renderAvatar = (user: UserItem) => {
    if (user.image) {
      return (
        <img 
          src={user.image} 
          alt={user.name} 
          className="w-10 h-10 rounded-full object-cover border border-slate-100" 
        />
      );
    }
    const initials = user.name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);
    // Unique color palette based on name hash
    const colors = [
      "bg-blue-100 text-blue-600 border-blue-200",
      "bg-indigo-100 text-indigo-600 border-indigo-200",
      "bg-emerald-100 text-emerald-600 border-emerald-200",
      "bg-purple-100 text-purple-600 border-purple-200",
      "bg-rose-100 text-rose-600 border-rose-200",
      "bg-amber-100 text-amber-600 border-amber-200"
    ];
    const code = user.name.charCodeAt(0) + (user.name.charCodeAt(1) || 0);
    const selectedColor = colors[code % colors.length];

    return (
      <div className={`w-10 h-10 rounded-full border flex items-center justify-center font-bold text-sm tracking-wider ${selectedColor}`}>
        {initials}
      </div>
    );
  };

  if (showAddMemberForm) {
    return (
      <div className="space-y-6 pb-12 text-left font-sans animate-in fade-in duration-200">
        <SEO title="Add Team Member - Faculty Portal" description="Expand the club's influence by adding key contributors and leaders." />
        
        {/* Breadcrumbs */}
        <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
          <button onClick={() => setShowAddMemberForm(false)} className="hover:text-blue-600 transition-colors">User Management</button>
          <span>&gt;</span>
          <span className="text-slate-600 font-black">Add Team Member</span>
        </div>

        {/* Title */}
        <div>
          <h1 className="text-3xl font-black text-slate-800 tracking-tight leading-none">Add New Team Member</h1>
          <p className="text-slate-455 text-xs font-semibold mt-1.5">Expand the club's influence by adding key contributors and leaders to the organization.</p>
        </div>

        {/* Two column layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left Column (span 8) */}
          <div className="lg:col-span-8 space-y-6">
            
            {/* Personal Details Card */}
            <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-100 shadow-[0_8px_30px_rgba(0,0,0,0.015)] space-y-5">
              <h3 className="text-sm font-black text-slate-800 tracking-tight flex items-center gap-2">
                <span className="w-6 h-6 rounded-lg bg-blue-50/50 text-blue-600 flex items-center justify-center shrink-0">
                  <User className="h-3.5 w-3.5" />
                </span>
                Personal Details
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Full Name</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. John Doe"
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-2xl focus:outline-none focus:border-blue-500 font-medium text-sm text-slate-800 bg-slate-50/20 focus:bg-white transition-all"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Email Address</label>
                  <input
                    type="email"
                    required
                    placeholder="john.doe@university.edu"
                    value={formEmail}
                    onChange={(e) => setFormEmail(e.target.value)}
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-2xl focus:outline-none focus:border-blue-500 font-medium text-sm text-slate-800 bg-slate-50/20 focus:bg-white transition-all"
                  />
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Department</label>
                <select
                  value={formDept}
                  onChange={(e) => setFormDept(e.target.value)}
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-2xl focus:outline-none focus:border-blue-500 font-medium text-sm text-slate-700 bg-slate-50/20 focus:bg-white transition-all cursor-pointer"
                >
                  <option value="Computer Science">Computer Science</option>
                  <option value="Robotics & Vision">Robotics & Vision</option>
                  <option value="Ethics & AI">Ethics & AI</option>
                  <option value="Data Science">Data Science</option>
                </select>
              </div>
            </div>

            {/* Role & Position Card */}
            <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-100 shadow-[0_8px_30px_rgba(0,0,0,0.015)] space-y-5">
              <h3 className="text-sm font-black text-slate-800 tracking-tight flex items-center gap-2">
                <span className="w-6 h-6 rounded-lg bg-blue-50/50 text-blue-600 flex items-center justify-center shrink-0">
                  <Zap className="h-3.5 w-3.5" />
                </span>
                Role & Position
              </h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Role Type</label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                    {availableRoles.map((role) => (
                      <button
                        key={role}
                        type="button"
                        onClick={() => setFormRoleType(role)}
                        className={`py-3 px-3 rounded-2xl border text-center font-bold text-xs transition-all ${
                          formRoleType === role
                            ? "bg-blue-600 border-blue-600 text-white shadow-sm shadow-blue-600/20"
                            : "bg-white border-slate-200 text-slate-655 hover:bg-slate-50"
                        }`}
                      >
                        {role}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Specific Position Title</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Technical Lead, PR Head"
                    value={formPosition}
                    onChange={(e) => setFormPosition(e.target.value)}
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-2xl focus:outline-none focus:border-blue-500 font-medium text-sm text-slate-800 bg-slate-50/20 focus:bg-white transition-all"
                  />
                  <span className="text-[10px] text-slate-400 font-semibold mt-1.5 block">This appears on the public team card.</span>
                </div>
              </div>
            </div>

            {/* Bio & Online Presence Card */}
            <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-100 shadow-[0_8px_30px_rgba(0,0,0,0.015)] space-y-5">
              <h3 className="text-sm font-black text-slate-800 tracking-tight flex items-center gap-2">
                <span className="w-6 h-6 rounded-lg bg-blue-50/50 text-blue-600 flex items-center justify-center shrink-0">
                  <ClipboardList className="h-3.5 w-3.5" />
                </span>
                Bio & Online Presence
              </h3>
              <div className="space-y-4.5">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Professional Bio</label>
                  <textarea
                    rows={4}
                    maxLength={300}
                    placeholder="Briefly describe the member's expertise and role in the AI Verse club..."
                    value={formBio}
                    onChange={(e) => setFormBio(e.target.value)}
                    className="w-full px-4 py-3 border border-slate-200 rounded-2xl focus:outline-none focus:border-blue-500 font-medium text-sm text-slate-800 bg-slate-50/20 focus:bg-white transition-all resize-none"
                  />
                  <div className="flex justify-between items-center text-[10px] text-slate-400 font-bold mt-1">
                    <span>Recommended: 150 - 300 characters</span>
                    <span>{formBio.length}/300</span>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">LinkedIn URL</label>
                    <input
                      type="url"
                      placeholder="linkedin.com/in/username"
                      value={formLinkedin}
                      onChange={(e) => setFormLinkedin(e.target.value)}
                      className="w-full px-4 py-2.5 border border-slate-200 rounded-2xl focus:outline-none focus:border-blue-500 font-medium text-sm text-slate-800 bg-slate-50/20 focus:bg-white transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">GitHub URL</label>
                    <input
                      type="url"
                      placeholder="github.com/username"
                      value={formGithub}
                      onChange={(e) => setFormGithub(e.target.value)}
                      className="w-full px-4 py-2.5 border border-slate-200 rounded-2xl focus:outline-none focus:border-blue-500 font-medium text-sm text-slate-800 bg-slate-50/20 focus:bg-white transition-all"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Actions Footer */}
            <div className="pt-2 flex justify-start gap-3">
              <Button
                variant="gradient"
                disabled={addingToTeam}
                onClick={handleAddTeamMemberSubmit}
                className="px-6 py-3 font-bold text-xs flex items-center gap-1.5 shadow-md shadow-blue-600/10"
              >
                {addingToTeam ? "Adding..." : "Add to Team"}
                <ArrowRight className="h-4 w-4" />
              </Button>
              <button
                type="button"
                onClick={() => setShowAddMemberForm(false)}
                className="px-6 py-3 bg-white border border-slate-200 text-slate-655 font-bold rounded-2xl text-xs hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
            </div>

          </div>

          {/* Right Column (span 4) */}
          <div className="lg:col-span-4 space-y-6">
            
            {/* Profile Photo Card */}
            <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-[0_8px_30px_rgba(0,0,0,0.015)] space-y-5 text-center">
              <h3 className="text-sm font-black text-slate-800 tracking-tight text-left">Profile Photo</h3>
              
              <div className="flex flex-col items-center py-4">
                <label className="relative w-28 h-28 rounded-full border-2 border-dashed border-slate-200 hover:border-blue-500 flex flex-col items-center justify-center cursor-pointer overflow-hidden transition-all bg-slate-50/30 group">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handlePhotoChange}
                    className="hidden"
                  />
                  {formPhotoPreview ? (
                    <img 
                      src={formPhotoPreview} 
                      alt="Profile preview" 
                      className="w-full h-full object-cover" 
                    />
                  ) : (
                    <div className="flex flex-col items-center text-slate-400 group-hover:text-blue-500 transition-colors">
                      <UserPlus className="h-6 w-6 stroke-[1.8] mb-1.5" />
                      <span className="text-[9px] font-black uppercase tracking-wider">Upload</span>
                    </div>
                  )}
                </label>
                <span className="text-[10px] text-slate-400 font-semibold mt-3.5 block max-w-[200px]">Click the area above to upload a professional portrait.</span>
              </div>

              <div className="pt-4 border-t border-slate-100/60 flex items-center justify-between text-[10px] font-bold text-slate-450">
                <div className="flex flex-col items-start">
                  <span>Max Size</span>
                  <span className="text-slate-800 font-black">2 MB</span>
                </div>
                <div className="flex flex-col items-end">
                  <span>Format</span>
                  <span className="text-slate-800 font-black">JPG, PNG, WEBP</span>
                </div>
              </div>
            </div>

            {/* Team Guidelines Card */}
            <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-[0_8px_30px_rgba(0,0,0,0.015)] space-y-4">
              <h3 className="text-sm font-black text-slate-805 tracking-tight flex items-center gap-1.5 text-left">
                <AlertCircle className="h-4 w-4 text-blue-600" />
                Team Guidelines
              </h3>
              <div className="space-y-4">
                <div className="flex gap-3">
                  <span className="text-xs font-black text-blue-600 bg-blue-50/50 w-6 h-6 rounded-lg flex items-center justify-center shrink-0">01</span>
                  <p className="text-[10px] text-slate-500 font-semibold leading-relaxed mt-0.5 text-left">Ensure photos have a neutral background and adequate lighting for professional consistency.</p>
                </div>
                <div className="flex gap-3">
                  <span className="text-xs font-black text-blue-600 bg-blue-50/50 w-6 h-6 rounded-lg flex items-center justify-center shrink-0">02</span>
                  <p className="text-[10px] text-slate-500 font-semibold leading-relaxed mt-0.5 text-left">Bio should highlight academic background and specific contributions to AIVerse initiatives.</p>
                </div>
                <div className="flex gap-3">
                  <span className="text-xs font-black text-blue-600 bg-blue-50/50 w-6 h-6 rounded-lg flex items-center justify-center shrink-0">03</span>
                  <p className="text-[10px] text-slate-500 font-semibold leading-relaxed mt-0.5 text-left">Verify social handles correctly as they link directly to public profiles from the portal.</p>
                </div>
              </div>
            </div>

            {/* Quote Decorative card */}
            <div className="relative p-5 bg-gradient-to-tr from-blue-50/60 to-indigo-50/40 border border-blue-100/50 rounded-3xl overflow-hidden text-slate-700">
              <div className="absolute inset-0 opacity-5 bg-[radial-gradient(#000000_1px,transparent_1px)] [background-size:12px_12px]"></div>
              <p className="relative z-10 text-[10px] text-slate-500 font-semibold leading-relaxed italic text-left">
                "Great teams are built on diverse skills and shared passion. Every new member brings us closer to pioneering the future of AI."
              </p>
            </div>

          </div>
        </div>

      </div>
    );
  }

  return (
    <div className="space-y-8 pb-12">
      <SEO 
        title="User Management - Faculty Portal" 
        description="Administrate club membership, assign hierarchical roles, and oversee onboarding of new faculty/student researchers."
      />

      {/* ================= HEADER ================= */}
      <div className="text-left">
        <h1 className="text-3xl font-extrabold text-slate-800 tracking-tight font-sans">User Management</h1>
        <p className="text-slate-500 text-xs sm:text-sm mt-1 max-w-3xl leading-relaxed font-medium">
          Administrate club membership, assign hierarchical roles, and oversee the onboarding of 
          new faculty and student researchers within the AI Excellence ecosystem.
        </p>
      </div>

      {/* ================= METRICS CARDS ================= */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Members */}
        <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-[0_8px_30px_rgba(0,0,0,0.015)] relative overflow-hidden group hover:shadow-md transition-all duration-300">
          <div className="flex justify-between items-start">
            <div className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600 shadow-inner">
              <UserPlus className="h-4.5 w-4.5" />
            </div>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-600 border border-emerald-100 flex items-center gap-0.5">
              +12%
            </span>
          </div>
          <div className="mt-3 text-left">
            <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Total Members</span>
            <h3 className="text-2xl font-extrabold mt-1 text-slate-800 tracking-tight font-sans">
              {totalCount.toLocaleString()}
            </h3>
          </div>
          <div className="absolute bottom-0 inset-x-0 h-1 bg-gradient-to-r from-blue-500 to-sky-400 transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300"></div>
        </div>

        {/* Pending Approvals */}
        <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-[0_8px_30px_rgba(0,0,0,0.015)] relative overflow-hidden group hover:shadow-md transition-all duration-300">
          <div className="flex justify-between items-start">
            <div className="w-9 h-9 rounded-xl bg-amber-50 flex items-center justify-center text-amber-500 shadow-inner">
              <Clock className="h-4.5 w-4.5" />
            </div>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-600 border border-amber-100">
              Urgent
            </span>
          </div>
          <div className="mt-3 text-left">
            <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Pending Approvals</span>
            <h3 className="text-2xl font-extrabold mt-1 text-slate-800 tracking-tight font-sans">
              {pendingCount}
            </h3>
          </div>
          <div className="absolute bottom-0 inset-x-0 h-1 bg-gradient-to-r from-amber-500 to-yellow-400 transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300"></div>
        </div>

        {/* Active Organizers */}
        <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-[0_8px_30px_rgba(0,0,0,0.015)] relative overflow-hidden group hover:shadow-md transition-all duration-300">
          <div className="flex justify-between items-start">
            <div className="w-9 h-9 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600 shadow-inner">
              <Shield className="h-4.5 w-4.5" />
            </div>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-600 border border-blue-100">
              Core
            </span>
          </div>
          <div className="mt-3 text-left">
            <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Active Organizers</span>
            <h3 className="text-2xl font-extrabold mt-1 text-slate-800 tracking-tight font-sans">
              {activeOrganizersCount}
            </h3>
          </div>
          <div className="absolute bottom-0 inset-x-0 h-1 bg-gradient-to-r from-emerald-500 to-teal-400 transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300"></div>
        </div>

        {/* Deactivated */}
        <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-[0_8px_30px_rgba(0,0,0,0.015)] relative overflow-hidden group hover:shadow-md transition-all duration-300">
          <div className="flex justify-between items-start">
            <div className="w-9 h-9 rounded-xl bg-slate-100 flex items-center justify-center text-slate-500 shadow-inner">
              <Archive className="h-4.5 w-4.5" />
            </div>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-50 text-slate-500 border border-slate-150">
              Archived
            </span>
          </div>
          <div className="mt-3 text-left">
            <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Deactivated</span>
            <h3 className="text-2xl font-extrabold mt-1 text-slate-800 tracking-tight font-sans">
              {deactivatedCount.toString().padStart(2, "0")}
            </h3>
          </div>
          <div className="absolute bottom-0 inset-x-0 h-1 bg-gradient-to-r from-slate-500 to-slate-400 transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300"></div>
        </div>
      </div>

      {/* ================= FILTER TOOLBAR ================= */}
      <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm flex flex-col md:flex-row gap-4 items-center justify-between">
        {/* Search & Select dropdown filters */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:flex md:flex-wrap items-center gap-3 w-full md:w-auto">
          {/* Search by Name */}
          <div className="relative w-full sm:w-60">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search by name, email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200/80 rounded-2xl text-slate-700 placeholder-slate-400 text-sm focus:outline-none focus:border-blue-500 focus:bg-white transition-all font-medium"
            />
          </div>

          {/* Role Filter */}
          <div className="relative w-full sm:w-auto">
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="appearance-none w-full sm:w-44 px-4 py-2 pr-10 bg-slate-50 border border-slate-200/80 rounded-2xl text-slate-700 text-sm focus:outline-none focus:border-blue-500 focus:bg-white transition-all font-medium cursor-pointer"
            >
              <option value="All">Role: All</option>
              <option value="Student Member">Student Member</option>
              <option value="Student Organizer">Student Organizer</option>
              <option value="Faculty Coordinator">Faculty Coordinator</option>
              <option value="Guest">Guest</option>
            </select>
            <div className="absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
              <Filter className="h-3.5 w-3.5" />
            </div>
          </div>

          {/* Department Filter */}
          <div className="relative w-full sm:w-auto">
            <select
              value={deptFilter}
              onChange={(e) => setDeptFilter(e.target.value)}
              className="appearance-none w-full sm:w-48 px-4 py-2 pr-10 bg-slate-50 border border-slate-200/80 rounded-2xl text-slate-700 text-sm focus:outline-none focus:border-blue-500 focus:bg-white transition-all font-medium cursor-pointer"
            >
              <option value="All">Department: All</option>
              <option value="Robotics & Vision">Robotics & Vision</option>
              <option value="Computer Science">Computer Science</option>
              <option value="Ethics & AI">Ethics & AI</option>
              <option value="Data Science">Data Science</option>
            </select>
            <div className="absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
              <Filter className="h-3.5 w-3.5" />
            </div>
          </div>

          {/* Status Filter */}
          <div className="relative w-full sm:w-auto">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="appearance-none w-full sm:w-36 px-4 py-2 pr-10 bg-slate-50 border border-slate-200/80 rounded-2xl text-slate-700 text-sm focus:outline-none focus:border-blue-500 focus:bg-white transition-all font-medium cursor-pointer"
            >
              <option value="All">Status: All</option>
              <option value="Active">Active</option>
              <option value="Pending">Pending</option>
              <option value="Deactivated">Deactivated</option>
            </select>
            <div className="absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
              <Filter className="h-3.5 w-3.5" />
            </div>
          </div>
        </div>
        {/* Add Member Button */}
        <button
          onClick={() => setShowAddMemberForm(true)}
          className="flex items-center gap-2 justify-center w-full md:w-auto px-5 py-2.5 bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-bold rounded-2xl shadow-md shadow-blue-600/10 hover:shadow-lg hover:shadow-blue-600/15 transition-all text-sm whitespace-nowrap"
        >
          <UserPlus className="h-4 w-4" />
          Add Member
        </button>
      </div>

      {/* ================= USERS TABLE ================= */}
      <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left text-sm text-slate-600">
            <thead className="bg-slate-50 text-[10px] font-bold text-slate-400 tracking-wider uppercase border-b border-slate-100">
              <tr>
                <th scope="col" className="px-6 py-4">User</th>
                <th scope="col" className="px-6 py-4">Role</th>
                <th scope="col" className="px-6 py-4">Department</th>
                <th scope="col" className="px-6 py-4">Status</th>
                <th scope="col" className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {paginatedUsers.length > 0 ? (
                paginatedUsers.map((user) => (
                  <tr key={user.id} className="hover:bg-slate-50/50 transition-colors group">
                    {/* User Identity */}
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-3">
                        {renderAvatar(user)}
                        <div>
                          <div className="font-bold text-slate-800 text-sm">{user.name}</div>
                          <div className="text-slate-400 text-xs font-medium">{user.email}</div>
                        </div>
                      </div>
                    </td>

                    {/* Role Badge */}
                    <td className="px-6 py-4 whitespace-nowrap">
                      {user.role === "Student Organizer" && (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-blue-50 text-blue-700 border border-blue-100">
                          Student Organizer
                        </span>
                      )}
                      {user.role === "Faculty Coordinator" && (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-100">
                          Faculty Coordinator
                        </span>
                      )}
                      {user.role === "Student Member" && (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-purple-50 text-purple-700 border border-purple-100">
                          Student Member
                        </span>
                      )}
                      {user.role === "Guest" && (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-600 border border-slate-200">
                          Guest
                        </span>
                      )}
                    </td>

                    {/* Department */}
                    <td className="px-6 py-4 whitespace-nowrap text-slate-500 font-medium text-sm">
                      {user.department}
                    </td>

                    {/* Status Dot */}
                    <td className="px-6 py-4 whitespace-nowrap">
                      {user.status === "Active" && (
                        <span className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-600">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse"></span>
                          Active
                        </span>
                      )}
                      {user.status === "Pending" && (
                        <span className="inline-flex items-center gap-1.5 text-xs font-bold text-amber-500">
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                          Pending
                        </span>
                      )}
                      {user.status === "Deactivated" && (
                        <span className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-400">
                          <span className="w-1.5 h-1.5 rounded-full bg-slate-400"></span>
                          Deactivated
                        </span>
                      )}
                    </td>

                    {/* Row Interactive Actions */}
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium relative">
                      <div className="flex items-center justify-end gap-1.5">
                        {/* Quick Approve Pending Guest */}
                        {user.status === "Pending" && (
                          <button
                            onClick={() => handleStatusChange(user.id, "Active")}
                            title="Approve Member"
                            className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-lg border border-emerald-100/50 bg-emerald-50/20 transition-all"
                          >
                            <Check className="h-4 w-4" />
                          </button>
                        )}

                        {/* Dropdown Menu Trigger */}
                        <div className="relative">
                          <button
                            onClick={() => setActiveMenuId(activeMenuId === user.id ? null : user.id)}
                            className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors border border-transparent hover:border-slate-200"
                          >
                            <MoreVertical className="h-4 w-4" />
                          </button>

                          {/* Quick Edit Popup Context Menu */}
                          {activeMenuId === user.id && (
                            <div className="absolute right-0 mt-2 w-48 bg-white border border-slate-100 rounded-2xl shadow-xl py-2 z-50 text-left font-sans ring-1 ring-black/5 animate-in fade-in duration-100">
                              <div className="px-3 py-1.5 text-[9px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-50 mb-1">
                                Change Role
                              </div>
                              <button
                                onClick={() => handleRoleChange(user.id, "Student Member")}
                                className={`w-full px-4 py-1.5 text-xs font-medium hover:bg-slate-50 text-slate-700 flex items-center gap-2 ${user.role === 'Student Member' ? 'bg-slate-50 text-blue-600 font-bold' : ''}`}
                              >
                                Student Member
                              </button>
                              <button
                                onClick={() => handleRoleChange(user.id, "Student Organizer")}
                                className={`w-full px-4 py-1.5 text-xs font-medium hover:bg-slate-50 text-slate-700 flex items-center gap-2 ${user.role === 'Student Organizer' ? 'bg-slate-50 text-blue-600 font-bold' : ''}`}
                              >
                                Student Organizer
                              </button>
                              <button
                                onClick={() => handleRoleChange(user.id, "Faculty Coordinator")}
                                className={`w-full px-4 py-1.5 text-xs font-medium hover:bg-slate-50 text-slate-700 flex items-center gap-2 ${user.role === 'Faculty Coordinator' ? 'bg-slate-50 text-blue-600 font-bold' : ''}`}
                              >
                                Faculty Coordinator
                              </button>
                              <button
                                onClick={() => handleRoleChange(user.id, "Guest")}
                                className={`w-full px-4 py-1.5 text-xs font-medium hover:bg-slate-50 text-slate-700 flex items-center gap-2 ${user.role === 'Guest' ? 'bg-slate-50 text-blue-600 font-bold' : ''}`}
                              >
                                Guest
                              </button>

                              <div className="px-3 py-1.5 text-[9px] font-bold text-slate-400 uppercase tracking-wider border-y border-slate-50 my-1">
                                Quick Action
                              </div>
                              {user.status === "Active" ? (
                                <button
                                  onClick={() => handleStatusChange(user.id, "Deactivated")}
                                  className="w-full px-4 py-1.5 text-xs font-medium hover:bg-red-50 text-red-600 flex items-center gap-2"
                                >
                                  <UserX className="h-3.5 w-3.5" />
                                  Deactivate
                                </button>
                              ) : (
                                <button
                                  onClick={() => handleStatusChange(user.id, "Active")}
                                  className="w-full px-4 py-1.5 text-xs font-medium hover:bg-emerald-50 text-emerald-600 flex items-center gap-2"
                                >
                                  <UserCheck className="h-3.5 w-3.5" />
                                  Activate
                                </button>
                              )}
                              <button
                                onClick={() => handleDeleteUser(user.id)}
                                className="w-full px-4 py-1.5 text-xs font-medium hover:bg-red-100 text-red-700 border-t border-slate-50/80 mt-1 flex items-center gap-2"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                                Remove Member
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-slate-400 font-medium font-sans">
                    No members match the current search or filter parameters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* ================= PAGINATION ================= */}
        <div className="bg-slate-50/50 px-6 py-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="text-xs text-slate-400 font-semibold tracking-tight">
            Showing <span className="text-slate-700 bg-white border border-slate-200/80 px-2 py-0.5 rounded-lg font-bold">{Math.min(filteredUsers.length, itemsPerPage)}</span> of{" "}
            <span className="text-slate-700 font-bold">{totalCount.toLocaleString()}</span> users
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
              className={`p-2 rounded-xl border border-slate-200/80 font-bold text-slate-500 hover:bg-white hover:text-slate-800 transition-all ${currentPage === 1 ? 'opacity-40 pointer-events-none' : ''}`}
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            
            {Array.from({ length: totalPages }).map((_, i) => (
              <button
                key={i}
                onClick={() => setCurrentPage(i + 1)}
                className={`w-9 h-9 rounded-xl font-bold text-sm transition-all border
                  ${currentPage === i + 1 
                    ? "bg-[#2563EB] text-white border-[#2563EB] shadow-md shadow-blue-600/10" 
                    : "bg-white text-slate-600 border-slate-200/80 hover:bg-slate-50"
                  }`}
              >
                {i + 1}
              </button>
            ))}

            {totalPages > 3 && (
              <>
                <span className="text-slate-400 px-1">...</span>
                <button
                  onClick={() => setCurrentPage(129)}
                  className="w-9 h-9 rounded-xl bg-white text-slate-600 border border-slate-200/80 hover:bg-slate-50 font-bold text-sm"
                >
                  129
                </button>
              </>
            )}

            <button
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              disabled={currentPage === totalPages}
              className={`p-2 rounded-xl border border-slate-200/80 font-bold text-slate-500 hover:bg-white hover:text-slate-800 transition-all ${currentPage === totalPages ? 'opacity-40 pointer-events-none' : ''}`}
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* ================= ADD MEMBER MODAL ================= */}
      {isInviteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl border border-slate-100 overflow-hidden text-left animate-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <div className="flex items-center gap-2 text-slate-800">
                <UserPlus className="h-5 w-5 text-blue-600" />
                <h3 className="text-lg font-bold">Add New Member</h3>
              </div>
              <button
                onClick={() => setIsInviteModalOpen(false)}
                className="p-1 hover:bg-slate-100 text-slate-400 hover:text-slate-600 rounded-lg transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleAddMember} className="p-6 space-y-4 font-sans">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Elena Rodriguez"
                  value={inviteName}
                  onChange={(e) => setInviteName(e.target.value)}
                  className="w-full px-4 py-2 border border-slate-200 rounded-2xl focus:outline-none focus:border-blue-500 font-medium text-sm text-slate-800"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Email Address</label>
                <input
                  type="email"
                  required
                  placeholder="e.g. elena.r@university.edu"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  className="w-full px-4 py-2 border border-slate-200 rounded-2xl focus:outline-none focus:border-blue-500 font-medium text-sm text-slate-800"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Role</label>
                  <select
                    value={inviteRole}
                    onChange={(e) => setInviteRole(e.target.value as UserItem["role"])}
                    className="w-full px-3 py-2 border border-slate-200 rounded-2xl focus:outline-none focus:border-blue-500 font-medium text-sm text-slate-800 cursor-pointer"
                  >
                    <option value="Student Member">Student Member</option>
                    <option value="Student Organizer">Student Organizer</option>
                    <option value="Faculty Coordinator">Faculty Coordinator</option>
                    <option value="Guest">Guest</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Department</label>
                  <select
                    value={inviteDept}
                    onChange={(e) => setInviteDept(e.target.value as UserItem["department"])}
                    className="w-full px-3 py-2 border border-slate-200 rounded-2xl focus:outline-none focus:border-blue-500 font-medium text-sm text-slate-800 cursor-pointer"
                  >
                    <option value="Computer Science">Computer Science</option>
                    <option value="Robotics & Vision">Robotics & Vision</option>
                    <option value="Ethics & AI">Ethics & AI</option>
                    <option value="Data Science">Data Science</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center gap-3 pt-4 border-t border-slate-50">
                <button
                  type="button"
                  onClick={() => setIsInviteModalOpen(false)}
                  className="flex-1 py-2.5 border border-slate-200 hover:bg-slate-50 text-slate-600 font-bold rounded-2xl text-sm transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-bold rounded-2xl text-sm shadow-md shadow-blue-600/10 hover:shadow-lg transition-all"
                >
                  Add Member
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserManagementPage;
