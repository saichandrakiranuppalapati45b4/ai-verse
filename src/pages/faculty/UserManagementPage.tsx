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
import { db, firebaseConfig, app } from "../../config/firebase";
import { initializeApp, deleteApp } from "firebase/app";
import { getAuth, createUserWithEmailAndPassword } from "firebase/auth";
import { getFunctions, httpsCallable } from "firebase/functions";
import { collection, addDoc, doc, getDoc, getDocs, setDoc, deleteDoc } from "firebase/firestore";
import Button from "../../components/ui/Button";
import { useAuth } from "../../context/AuthContext";

interface UserItem {
  id: string;
  name: string;
  email: string;
  role: "Student Member" | "Student Organizer" | "Faculty Coordinator" | "Guest";
  status: "Active" | "Pending" | "Deactivated";
  image?: string;
}

// Helper to resolve legacy/db roles to settings configuration roles
const getDisplayRole = (dbRole: string, rolesList: string[]) => {
  if (!dbRole) return "Guest";
  const dbRoleLower = dbRole.toLowerCase();
  if (dbRoleLower === "faculty") {
    return rolesList.find(r => r.toLowerCase().includes("faculty")) || "Faculty Coordinator";
  }
  if (dbRoleLower === "organizer") {
    return rolesList.find(r => r.toLowerCase().includes("organizer")) || "student Organizer";
  }
  if (dbRoleLower === "member") {
    return rolesList.find(r => r.toLowerCase().includes("member") || r.toLowerCase().includes("volunteer")) || "Volunteer";
  }
  if (dbRoleLower === "guest") {
    return rolesList.find(r => r.toLowerCase().includes("guest")) || "Guest";
  }
  const match = rolesList.find(r => r.toLowerCase() === dbRoleLower);
  if (match) return match;
  return dbRole;
};

const UserManagementPage: React.FC = () => {
  const { user: currentUser } = useAuth();
  // Initial list of users for pagination/filtering
  const [users, setUsers] = useState<UserItem[]>([]);

  // Fetch users from database
  React.useEffect(() => {
    const fetchUsers = async () => {
      try {
        const querySnapshot = await getDocs(collection(db, "users"));
        const list: UserItem[] = [];
        querySnapshot.forEach((docSnap) => {
          const data = docSnap.data();
          list.push({
            id: docSnap.id,
            name: data.name || "Unnamed User",
            email: data.email || "",
            role: data.role || "Guest",
            status: data.status || "Active",
            image: data.image || ""
          });
        });
        setUsers(list);
      } catch (err) {
        console.error("Error fetching users from database:", err);
      }
    };
    fetchUsers();
  }, []);

  // States
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("All");
  const [statusFilter, setStatusFilter] = useState<string>("All");
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  // Invite Modal States
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [inviteName, setInviteName] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<UserItem["role"]>("Student Member");
  
  // Dropdown actions states
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);

  // Add Team Member Form States
  const [showAddMemberForm, setShowAddMemberForm] = useState(false);
  const [formName, setFormName] = useState("");
  const [formEmail, setFormEmail] = useState("");
  const [formRoleType, setFormRoleType] = useState<string>("Organizer");
  const [formPosition, setFormPosition] = useState("");
  const [formBio, setFormBio] = useState("");
  const [formLinkedin, setFormLinkedin] = useState("");
  const [formGithub, setFormGithub] = useState("");
  const [formPhotoPreview, setFormPhotoPreview] = useState("");
  const [formPassword, setFormPassword] = useState("");
  const [formConfirmPassword, setFormConfirmPassword] = useState("");
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
  const totalCount = users.length;
  const pendingCount = users.filter(u => u.status === "Pending").length;
  const activeOrganizersCount = users.filter(u => {
    const r = getDisplayRole(u.role, availableRoles).toLowerCase();
    return (r.includes("organizer") || r.includes("lead")) && u.status === "Active";
  }).length;
  const deactivatedCount = users.filter(u => u.status === "Deactivated").length;

  // Filters logic
  const filteredUsers = useMemo(() => {
    return users.filter(user => {
      const matchesSearch = 
        user.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
        user.email.toLowerCase().includes(searchQuery.toLowerCase());
      
      const displayRole = getDisplayRole(user.role, availableRoles);
      const matchesRole = roleFilter === "All" || displayRole === roleFilter;
      const matchesStatus = statusFilter === "All" || user.status === statusFilter;

      return matchesSearch && matchesRole && matchesStatus;
    });
  }, [users, searchQuery, roleFilter, statusFilter, availableRoles]);

  // Paginated users
  const paginatedUsers = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredUsers.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredUsers, currentPage]);

  const totalPages = Math.max(1, Math.ceil(filteredUsers.length / itemsPerPage));

  // Reset pagination if filters change
  React.useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, roleFilter, statusFilter]);

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

    if (formRoleType === "Faculty Coordinator") {
      if (!formPassword) {
        alert("Password is required for Faculty Coordinators!");
        return;
      }
      if (formPassword !== formConfirmPassword) {
        alert("Passwords do not match!");
        return;
      }
    }

    setAddingToTeam(true);
    try {
      let authUserUid = "";
      if (formRoleType === "Faculty Coordinator") {
        // Create user in firebase auth using secondary app so administrator isn't logged out
        const secondaryApp = initializeApp(firebaseConfig, "SecondaryApp");
        const secondaryAuth = getAuth(secondaryApp);
        try {
          const userCred = await createUserWithEmailAndPassword(secondaryAuth, formEmail, formPassword);
          authUserUid = userCred.user.uid;
        } catch (authErr: any) {
          console.error("Auth creation failed:", authErr);
          alert(`Authentication setup failed: ${authErr.message || authErr}`);
          setAddingToTeam(false);
          await deleteApp(secondaryApp);
          return;
        }
        await deleteApp(secondaryApp);
      }

      const payload = {
        name: formName,
        email: formEmail,
        roleType: formRoleType,
        position: formPosition,
        bio: formBio,
        linkedin: formLinkedin,
        github: formGithub,
        image: formPhotoPreview || "",
        createdAt: Date.now()
      };

      const payloadWithCreds = {
        ...payload,
        username: formEmail,
        tempPassword: formRoleType === "Faculty Coordinator" ? formPassword : "organizer"
      };

      await addDoc(collection(db, "organizers"), payloadWithCreds);

      let userDocId = "";
      if (authUserUid) {
        await setDoc(doc(db, "users", authUserUid), {
          name: formName,
          email: formEmail,
          role: formRoleType,
          image: formPhotoPreview || "",
          status: "Active"
        });
        userDocId = authUserUid;
      } else {
        const userDocRef = await addDoc(collection(db, "users"), {
          name: formName,
          email: formEmail,
          role: formRoleType,
          image: formPhotoPreview || "",
          status: "Active"
        });
        userDocId = userDocRef.id;
      }

      alert("Member successfully added to team!");
      
      const newUser: UserItem = {
        id: userDocId,
        name: formName,
        email: formEmail,
        role: formRoleType as any,
        image: formPhotoPreview || "",
        status: "Active"
      };
      setUsers(prev => [newUser, ...prev]);

      // Reset state and return to user list view
      setFormName("");
      setFormEmail("");
      setFormRoleType("Organizer");
      setFormPosition("");
      setFormBio("");
      setFormLinkedin("");
      setFormGithub("");
      setFormPhotoPreview("");
      setFormPassword("");
      setFormConfirmPassword("");
      setShowAddMemberForm(false);
    } catch (err) {
      console.error("Error adding team member:", err);
      alert("Failed to add team member. Please try again.");
    } finally {
      setAddingToTeam(false);
    }
  };

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteName || !inviteEmail) return;

    const newUserDoc = {
      name: inviteName,
      email: inviteEmail,
      role: inviteRole,
      status: "Active"
    };

    try {
      const docRef = await addDoc(collection(db, "users"), newUserDoc);
      const newUser: UserItem = {
        id: docRef.id,
        name: inviteName,
        email: inviteEmail,
        role: inviteRole,
        status: "Active"
      };
      setUsers([newUser, ...users]);
      setInviteName("");
      setInviteEmail("");
      setIsInviteModalOpen(false);
    } catch (err) {
      console.error("Error adding user to database:", err);
      alert("Failed to add user to database.");
    }
  };

  const handleStatusChange = async (id: string, newStatus: UserItem["status"]) => {
    try {
      const docRef = doc(db, "users", id);
      await setDoc(docRef, { status: newStatus }, { merge: true });
      setUsers(users.map(u => u.id === id ? { ...u, status: newStatus } : u));
    } catch (err) {
      console.error("Error updating user status:", err);
      alert("Failed to update status.");
    }
    setActiveMenuId(null);
  };

  const handleRoleChange = async (id: string, newRole: UserItem["role"]) => {
    try {
      const docRef = doc(db, "users", id);
      await setDoc(docRef, { role: newRole }, { merge: true });
      setUsers(users.map(u => u.id === id ? { ...u, role: newRole } : u));
    } catch (err) {
      console.error("Error updating user role:", err);
      alert("Failed to update role.");
    }
    setActiveMenuId(null);
  };

  const handleDeleteUser = async (id: string) => {
    if (!window.confirm("Are you sure you want to permanently delete this user? This action cannot be undone.")) return;
    
    try {
      const functions = getFunctions(app);
      const deleteUserAccount = httpsCallable(functions, "deleteUserAccount");
      await deleteUserAccount({ uid: id });
      
      setUsers(users.filter(u => u.id !== id));
      alert("User successfully deleted.");
    } catch (err: any) {
      console.error("Error deleting user:", err);
      alert(`Failed to delete user: ${err.message}`);
    }
    setActiveMenuId(null);
  };



  // Helper to render beautiful role badge dynamically
  const renderRoleBadge = (role: string) => {
    const rLower = role.toLowerCase();
    let bg = "bg-slate-100 text-slate-750 border-slate-205";
    if (rLower.includes("faculty") || rLower.includes("advisor") || rLower.includes("coordinator")) {
      bg = "bg-emerald-50 text-emerald-700 border-emerald-100";
    } else if (rLower.includes("organizer") || rLower.includes("lead") || rLower.includes("head") || rLower.includes("manager") || rLower.includes("conviner")) {
      bg = "bg-blue-50 text-blue-700 border-blue-100";
    } else if (rLower.includes("volunteer") || rLower.includes("guest")) {
      bg = "bg-slate-100 text-slate-600 border-slate-200";
    } else {
      bg = "bg-purple-50 text-purple-700 border-purple-100";
    }
    return (
      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border ${bg}`}>
        {role}
      </span>
    );
  };

  // Helper to render beautiful initials avatar / placeholder
  const renderAvatar = (user: UserItem) => {
    let avatarUrl = user.image;
    if (!avatarUrl || avatarUrl.trim() === "") {
      const placeholders = [
        "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&h=150&q=80",
        "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=150&h=150&q=80",
        "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=150&h=150&q=80",
        "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=150&h=150&q=80",
        "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?auto=format&fit=crop&w=150&h=150&q=80",
        "https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?auto=format&fit=crop&w=150&h=150&q=80"
      ];
      let hash = 0;
      const str = user.email || user.name || "";
      for (let i = 0; i < str.length; i++) {
        hash = str.charCodeAt(i) + ((hash << 5) - hash);
      }
      const index = Math.abs(hash) % placeholders.length;
      avatarUrl = placeholders[index];
    }

    return (
      <img 
        src={avatarUrl} 
        alt={user.name} 
        className="w-10 h-10 rounded-full object-cover border border-slate-200 shadow-sm" 
      />
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

              {formRoleType === "Faculty Coordinator" && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-slate-100 mt-4 text-left">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Enter Password</label>
                    <input
                      type="password"
                      required
                      placeholder="••••••••"
                      value={formPassword}
                      onChange={(e) => setFormPassword(e.target.value)}
                      className="w-full px-4 py-2.5 border border-slate-200 rounded-2xl focus:outline-none focus:border-blue-500 font-medium text-sm text-slate-800 bg-slate-50/20 focus:bg-white transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Confirm Password</label>
                    <input
                      type="password"
                      required
                      placeholder="••••••••"
                      value={formConfirmPassword}
                      onChange={(e) => setFormConfirmPassword(e.target.value)}
                      className="w-full px-4 py-2.5 border border-slate-200 rounded-2xl focus:outline-none focus:border-blue-500 font-medium text-sm text-slate-800 bg-slate-50/20 focus:bg-white transition-all"
                    />
                  </div>
                </div>
              )}

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
              {availableRoles.map(role => (
                <option key={role} value={role}>{role}</option>
              ))}
              {!availableRoles.includes("Student Member") && <option value="Student Member">Student Member</option>}
              {!availableRoles.includes("Student Organizer") && <option value="Student Organizer">Student Organizer</option>}
              {!availableRoles.includes("Faculty Coordinator") && <option value="Faculty Coordinator">Faculty Coordinator</option>}
              {!availableRoles.includes("Guest") && <option value="Guest">Guest</option>}
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
                      {renderRoleBadge(getDisplayRole(user.role, availableRoles))}
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
                      {currentUser?.uid === user.id ? (
                        <div className="flex justify-end pr-2">
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-100">You</span>
                        </div>
                      ) : (
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
                                {(() => {
                                  const options = [...availableRoles];
                                  const displayRole = getDisplayRole(user.role, availableRoles);
                                  if (displayRole && !options.includes(displayRole)) {
                                    options.push(displayRole);
                                  }
                                  return options;
                                })().map((role) => (
                                  <button
                                    key={role}
                                    onClick={() => handleRoleChange(user.id, role as any)}
                                    className={`w-full px-4 py-1.5 text-xs font-medium hover:bg-slate-50 text-slate-700 flex items-center gap-2 ${getDisplayRole(user.role, availableRoles) === role ? 'bg-slate-50 text-blue-600 font-bold' : ''}`}
                                  >
                                    {role}
                                  </button>
                                ))}

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
                      )}
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

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Role</label>
                <select
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value as UserItem["role"])}
                  className="w-full px-4 py-2 border border-slate-200 rounded-2xl focus:outline-none focus:border-blue-500 font-medium text-sm text-slate-800 cursor-pointer"
                >
                  {availableRoles.map(role => (
                    <option key={role} value={role}>{role}</option>
                  ))}
                  {!availableRoles.includes("Student Member") && <option value="Student Member">Student Member</option>}
                  {!availableRoles.includes("Student Organizer") && <option value="Student Organizer">Student Organizer</option>}
                  {!availableRoles.includes("Faculty Coordinator") && <option value="Faculty Coordinator">Faculty Coordinator</option>}
                  {!availableRoles.includes("Guest") && <option value="Guest">Guest</option>}
                </select>
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
