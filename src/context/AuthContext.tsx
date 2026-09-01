import React, { createContext, useContext, useState, useEffect } from "react";
import { doc, setDoc, getDoc, getDocs, collection, query, where, onSnapshot } from "firebase/firestore";
import { db } from "../config/firebase";
import { supabase } from "../config/supabase";
import { userService } from "../services/userService";

export const ALLOWED_EMAILS = [
  "admin@aiverse.in",
  "facultycoordinator@aiverse.in",
  "studentorganizer@aiverse.in",
  "jury@aiverse.in",
  "jurry@aiverse.in",
  "participant@aiverse.in"
];

export interface UserProfile {
  uid: string;
  email: string;
  name: string;
  role: "faculty" | "organizer" | "member" | "jury" | "participant" | null;
  displayRole?: string;
  image?: string;
  year?: string;
  requiresPasswordChange?: boolean;
  teamName?: string;
  eventTitle?: string;
  registrationId?: string;
}

interface AuthContextType {
  user: UserProfile | null;
  loading: boolean;
  login: (email: string, roleOrPassword: string) => Promise<void>;
  logout: () => Promise<void>;
  register?: (email: string, passwordOrRole: string, name: string, role: "faculty" | "organizer" | "member" | "jury" | "participant") => Promise<void>;
  setMockRole: (role: "faculty" | "organizer" | "member" | "jury" | "participant" | null) => void;
  updateUserPassword?: (newPassword: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Helper function to normalize system role across the auth system
export const normalizeRole = (
  rawRole: any, 
  defaultRole: "faculty" | "organizer" | "member" | "jury" | "participant" = "faculty"
): "faculty" | "organizer" | "member" | "jury" | "participant" => {
  if (!rawRole) return defaultRole;
  const lower = String(rawRole).toLowerCase().trim();
  if (lower === "faculty" || lower.includes("super admin") || lower.includes("faculty advisor") || lower.includes("faculty coordinator") || lower.includes("admin")) {
    return "faculty";
  }
  if (lower === "organizer" || lower.includes("organizer") || lower.includes("lead organizer") || lower.includes("student organizer")) {
    return "organizer";
  }
  if (lower === "jury" || lower.includes("jury")) {
    return "jury";
  }
  if (lower === "participant" || lower.includes("participant")) {
    return "participant";
  }
  if (lower === "member" || lower.includes("member") || lower.includes("volunteer")) {
    return "member";
  }
  return defaultRole;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  // Initialize and listen to Supabase Auth state changes with real-time Firestore sync
  useEffect(() => {
    let unsubSnapshot: (() => void) | null = null;

    const setupProfileListener = async (userId: string, userEmail: string) => {
      if (unsubSnapshot) {
        unsubSnapshot();
        unsubSnapshot = null;
      }

      const savedUserStr = localStorage.getItem("aether_mock_user");
      let localUser: UserProfile | null = null;
      if (savedUserStr) {
        try {
          localUser = JSON.parse(savedUserStr);
        } catch (e) {}
      }

      // Allow authorized emails, participant role accounts, and any @aiverse.in team emails
      const isAllowed = ALLOWED_EMAILS.includes(userEmail) || localUser?.role === "participant" || userEmail.includes("participant") || userEmail.endsWith("@aiverse.in");
      
      if (!isAllowed) {
        console.warn(`[AuthContext] Denying access to unauthorized user: ${userEmail}`);
        await supabase.auth.signOut().catch(() => {});
        setUser(null);
        localStorage.removeItem("aether_mock_user");
        setLoading(false);
        return;
      }

      // For team emails (e.g. alphaa@aiverse.in), the user doc is stored under
      // the sanitized email ID (e.g. alphaa_aiverse_in), not the Supabase Auth UID.
      const sanitizedEmailId = userEmail.replace(/[^a-z0-9]/g, '_');
      let userDocRef = doc(db, "users", userId);
      
      // If a user doc exists under the sanitized email ID, use that instead
      if (sanitizedEmailId !== userId) {
        try {
          const emailDocSnap = await getDoc(doc(db, "users", sanitizedEmailId));
          if (emailDocSnap.exists()) {
            userDocRef = doc(db, "users", sanitizedEmailId);
          }
        } catch (e) {
          // Fallback to UID-based doc
        }
      }
      
      let forcedRole: "faculty" | "organizer" | "member" | "jury" | "participant" = "faculty";
      let forcedDisplayRole = "Super Admin";
      let defaultName = "System Admin";
      
      if (userEmail === "admin@aiverse.in") {
        forcedRole = "faculty";
        forcedDisplayRole = "Super Admin";
        defaultName = "System Admin";
      } else if (userEmail === "facultycoordinator@aiverse.in") {
        forcedRole = "faculty";
        forcedDisplayRole = "Faculty Coordinator";
        defaultName = "Faculty Coordinator";
      } else if (userEmail === "studentorganizer@aiverse.in") {
        forcedRole = "organizer";
        forcedDisplayRole = "Student Organizer";
        defaultName = "Student Organizer";
      } else if (userEmail === "jury@aiverse.in" || userEmail === "jurry@aiverse.in") {
        forcedRole = "jury";
        forcedDisplayRole = "Jury Evaluator";
        defaultName = "Jury Panelist";
      } else if (userEmail === "participant@aiverse.in") {
        forcedRole = "participant";
        forcedDisplayRole = "Participant";
        defaultName = "Alex Rivera";
      } else if (userEmail.endsWith("@aiverse.in")) {
        // Team participant emails like alphaa@aiverse.in, betaa@aiverse.in
        forcedRole = "participant";
        forcedDisplayRole = "Participant";
        defaultName = userEmail.split("@")[0];
      }

      const fallbackProfile: UserProfile = {
        uid: userId,
        email: userEmail,
        name: defaultName,
        role: forcedRole,
        displayRole: forcedDisplayRole
      };

      // Setup real-time Firestore listener for user profile changes
      try {
        unsubSnapshot = onSnapshot(userDocRef, (docSnap) => {
          if (docSnap.exists()) {
            const profileData = docSnap.data();
            const userRole = normalizeRole(profileData.role, forcedRole);
            setUser({
              uid: userId,
              email: userEmail,
              name: profileData.displayName || profileData.name || profileData.teamLeadName || defaultName,
              role: userRole,
              displayRole: profileData.displayRole || profileData.role || forcedDisplayRole,
              image: profileData.image || "",
              year: profileData.year,
              requiresPasswordChange: profileData.requiresPasswordChange,
              teamName: profileData.teamName,
              eventTitle: profileData.eventTitle,
              registrationId: profileData.registrationId
            });
          } else {
            setUser(fallbackProfile);
            // Write a default profile document for them in Firestore asynchronously
            const defaultProfile = {
              name: defaultName,
              email: userEmail,
              role: forcedRole,
              displayRole: forcedDisplayRole,
              status: "Active"
            };
            setDoc(userDocRef, defaultProfile).catch((err) => {
              console.error("[AuthContext] Error creating default profile document:", err);
            });
          }
          setLoading(false);
        }, (error) => {
          console.warn("[AuthContext] Firestore sync unavailable, using default profile:", error?.message || error);
          setUser(fallbackProfile);
          setLoading(false);
        });
      } catch (e) {
        setUser(fallbackProfile);
        setLoading(false);
      }
    };

    // Check initial Supabase session
    const initSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          const userEmail = session.user.email?.toLowerCase().trim() || "";
          await setupProfileListener(session.user.id, userEmail);
        } else {
          // No Supabase session — check local session (mock/legacy)
          const savedUserStr = localStorage.getItem("aether_mock_user");
          if (savedUserStr) {
            try {
              const savedUser = JSON.parse(savedUserStr);
              if (savedUser && savedUser.email && savedUser.role) {
                setUser(savedUser);
              } else {
                localStorage.removeItem("aether_mock_user");
                setUser(null);
              }
            } catch (e) {
              localStorage.removeItem("aether_mock_user");
              setUser(null);
            }
          } else {
            setUser(null);
          }
          setLoading(false);
        }
      } catch (err) {
        console.warn("[AuthContext] Supabase session check warning:", err);
        const savedUserStr = localStorage.getItem("aether_mock_user");
        if (savedUserStr) {
          try {
            setUser(JSON.parse(savedUserStr));
          } catch (e) {}
        }
        setLoading(false);
      }
    };

    initSession();

    // Listen to Supabase Auth state changes
    const { data: { subscription: authSubscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === "SIGNED_IN" && session?.user) {
          setLoading(true);
          const userEmail = session.user.email?.toLowerCase().trim() || "";
          await setupProfileListener(session.user.id, userEmail);
        } else if (event === "SIGNED_OUT") {
          if (unsubSnapshot) {
            unsubSnapshot();
            unsubSnapshot = null;
          }
          // Check localStorage for mock users before clearing
          const savedUserStr = localStorage.getItem("aether_mock_user");
          if (savedUserStr) {
            try {
              const savedUser = JSON.parse(savedUserStr);
              if (savedUser && savedUser.email && savedUser.role) {
                setUser(savedUser);
                setLoading(false);
                return;
              }
            } catch (e) {}
          }
          setUser(null);
          setLoading(false);
        } else if (event === "TOKEN_REFRESHED" && session?.user) {
          // Session refreshed, no action needed
        }
      }
    );

    return () => {
      authSubscription.unsubscribe();
      if (unsubSnapshot) unsubSnapshot();
    };
  }, []);

  const login = async (email: string, passwordInput: string) => {
    setLoading(true);
    const cleanEmail = email.toLowerCase().trim();
    const cleanPassword = passwordInput ? passwordInput.trim() : "";

    if (!cleanEmail || !cleanPassword) {
      setLoading(false);
      throw new Error("Please enter both email and password.");
    }

    try {
      // 1. Try Supabase Auth sign in
      try {
        const { data: supaAuthData, error: supaAuthError } = await supabase.auth.signInWithPassword({
          email: cleanEmail,
          password: cleanPassword
        });
        if (!supaAuthError && supaAuthData.user) {
          const supaUserRecord = await userService.getUserByEmail(cleanEmail);
          const rawRole = supaUserRecord?.role || "faculty";
          const role = normalizeRole(rawRole, "faculty");
          const customUser: UserProfile = {
            uid: supaAuthData.user.id,
            email: cleanEmail,
            name: supaUserRecord?.name || supaUserRecord?.display_name || cleanEmail.split("@")[0],
            role,
            displayRole: supaUserRecord?.position || (role === "faculty" ? "Super Admin" : role),
            requiresPasswordChange: false,
            teamName: supaUserRecord?.team_name || undefined,
            eventTitle: supaUserRecord?.event_title || undefined,
            registrationId: supaUserRecord?.registration_id || undefined
          };
          setUser(customUser);
          localStorage.setItem("aether_mock_user", JSON.stringify(customUser));
          setLoading(false);
          return;
        }
      } catch (supaErr) {
        console.log("[AuthContext] Supabase Auth sign-in notice:", supaErr);
      }

      // 2. Query Firestore `users` collection for credentials
      const docId = cleanEmail.replace(/[^a-z0-9]/g, '_');
      const userDocRef = doc(db, "users", docId);
      const userSnap = await getDoc(userDocRef);

      let foundDocData: any = null;
      let foundDocId: string = docId;

      if (userSnap.exists()) {
        foundDocData = userSnap.data();
      } else {
        // Direct ID check
        const directSnap = await getDoc(doc(db, "users", cleanEmail));
        if (directSnap.exists()) {
          foundDocData = directSnap.data();
          foundDocId = cleanEmail;
        } else {
          // Fallback query where email == cleanEmail
          const q = query(collection(db, "users"), where("email", "==", cleanEmail));
          const querySnap = await getDocs(q);
          if (!querySnap.empty) {
            foundDocData = querySnap.docs[0].data();
            foundDocId = querySnap.docs[0].id;
          }
        }
      }

      const DEFAULT_ADMIN_PASSWORDS = ["password123", "admin123", "aiverse123", "aiverse@123"];
      const PREDEFINED_EMAILS = [
        "admin@aiverse.in",
        "facultycoordinator@aiverse.in",
        "studentorganizer@aiverse.in",
        "jury@aiverse.in",
        "jurry@aiverse.in",
        "participant@aiverse.in"
      ];

      if (foundDocData) {
        // Document exists in Firestore
        if (foundDocData.password) {
          // Stored password exists — MUST MATCH EXACTLY
          if (foundDocData.password !== cleanPassword) {
            setLoading(false);
            throw new Error("Invalid password. Please check your credentials.");
          }
        } else {
          // Document exists but no password field set yet
          if (PREDEFINED_EMAILS.includes(cleanEmail)) {
            if (!DEFAULT_ADMIN_PASSWORDS.includes(cleanPassword)) {
              setLoading(false);
              throw new Error("Invalid password. Please check your credentials.");
            }
            // Save initial password into Firestore
            await setDoc(doc(db, "users", foundDocId), { 
              password: cleanPassword,
              updatedAt: Date.now() 
            }, { merge: true });
          } else {
            setLoading(false);
            throw new Error("Invalid password. Please check your credentials.");
          }
        }

        const rawRole = foundDocData.role || (cleanEmail.includes("organizer") ? "organizer" : (cleanEmail.includes("jury") ? "jury" : (cleanEmail.includes("participant") ? "participant" : "faculty")));
        const role = normalizeRole(rawRole, "faculty");
        const name = foundDocData.name || foundDocData.displayName || foundDocData.teamLeadName || cleanEmail.split('@')[0];
        const displayRole = foundDocData.displayRole || (role === "faculty" ? "Super Admin" : role);

        const customUser: UserProfile = {
          uid: foundDocId,
          email: foundDocData.email || cleanEmail,
          name,
          role,
          displayRole,
          requiresPasswordChange: foundDocData.requiresPasswordChange === true,
          teamName: foundDocData.teamName,
          eventTitle: foundDocData.eventTitle,
          registrationId: foundDocData.registrationId
        };

        setUser(customUser);
        localStorage.setItem("aether_mock_user", JSON.stringify(customUser));
        setLoading(false);
        return;
      }

      // If document does NOT exist in Firestore yet:
      if (PREDEFINED_EMAILS.includes(cleanEmail)) {
        if (!DEFAULT_ADMIN_PASSWORDS.includes(cleanPassword)) {
          setLoading(false);
          throw new Error("Invalid password. Please check your credentials.");
        }

        let role: "faculty" | "organizer" | "member" | "jury" | "participant" = "faculty";
        let displayRole = "Super Admin";
        let name = "Super Admin";

        if (cleanEmail === "facultycoordinator@aiverse.in") {
          role = "faculty";
          displayRole = "Faculty Coordinator";
          name = "Faculty Coordinator";
        } else if (cleanEmail === "studentorganizer@aiverse.in") {
          role = "organizer";
          displayRole = "Student Organizer";
          name = "Student Organizer";
        } else if (cleanEmail === "jury@aiverse.in" || cleanEmail === "jurry@aiverse.in") {
          role = "jury";
          displayRole = "Jury Evaluator";
          name = "Jury Panelist";
        } else if (cleanEmail === "participant@aiverse.in") {
          role = "participant";
          displayRole = "Participant";
          name = "Participant User";
        }

        const newUserProfile: UserProfile = {
          uid: docId,
          email: cleanEmail,
          name,
          role,
          displayRole,
          requiresPasswordChange: false
        };

        // Create the user document with the validated password in Firestore
        await setDoc(doc(db, "users", docId), {
          uid: docId,
          email: cleanEmail,
          name,
          role,
          displayRole,
          password: cleanPassword,
          status: "Active",
          requiresPasswordChange: false,
          createdAt: Date.now()
        });

        setUser(newUserProfile);
        localStorage.setItem("aether_mock_user", JSON.stringify(newUserProfile));
        setLoading(false);
        return;
      }

      setLoading(false);
      throw new Error("Invalid email or password. Please verify your credentials.");
    } catch (error) {
      console.error("Login failed:", error);
      setLoading(false);
      throw error;
    }
  };

  const register = async (email: string, passwordOrRole: string, name: string, role: "faculty" | "organizer" | "member" | "jury" | "participant") => {
    setLoading(true);
    const cleanEmail = email.toLowerCase().trim();

    if (!ALLOWED_EMAILS.includes(cleanEmail)) {
      setLoading(false);
      throw new Error("Access restricted: Only authorized accounts (admin@aiverse.in, facultycoordinator@aiverse.in, studentorganizer@aiverse.in, jury@aiverse.in, participant@aiverse.in) are permitted to register.");
    }

    try {
      // 1. Create user in Supabase Auth
      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email: cleanEmail,
        password: passwordOrRole,
        options: {
          data: { name, role }
        }
      });

      if (signUpError) {
        throw new Error(signUpError.message);
      }

      // 2. Create user profile in Supabase users table
      await userService.addUser({
        name,
        email: cleanEmail,
        role,
        status: "Active"
      });

      // 3. Also create Firestore profile doc for real-time sync
      const userId = signUpData.user?.id || cleanEmail.replace(/[^a-z0-9]/g, '_');
      const userDocRef = doc(db, "users", userId);
      const profile = {
        name,
        email: cleanEmail,
        role
      };
      await setDoc(userDocRef, profile);
      localStorage.removeItem("aether_mock_user");
    } catch (error) {
      console.error("Registration failed:", error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    setLoading(true);
    try {
      await supabase.auth.signOut().catch(() => {});
      setUser(null);
      localStorage.removeItem("aether_mock_user");
    } catch (error) {
      console.error("Logout failed:", error);
    } finally {
      setLoading(false);
    }
  };

  const setMockRole = (role: "faculty" | "organizer" | "member" | "jury" | "participant" | null) => {
    if (role === null) {
      setUser(null);
      localStorage.removeItem("aether_mock_user");
      supabase.auth.signOut().catch(() => {});
    } else {
      const email = role === "organizer" 
        ? "studentorganizer@aiverse.in" 
        : role === "participant" 
        ? "participant@aiverse.in" 
        : "admin@aiverse.in";
      const updatedUser: UserProfile = {
        uid: `mock-uid-${email}`,
        email,
        name: role === "organizer" ? "Student Organizer" : role === "participant" ? "Alex Rivera" : "System Admin",
        role: role === "organizer" ? "organizer" : role === "participant" ? "participant" : "faculty",
        displayRole: role === "organizer" ? "Student Organizer" : role === "participant" ? "Participant" : "Super Admin"
      };
      setUser(updatedUser);
      localStorage.setItem("aether_mock_user", JSON.stringify(updatedUser));
      supabase.auth.signOut().catch(() => {});
    }
  };

  const updateUserPassword = async (newPassword: string) => {
    // 1. Immediately update user state and localStorage to prevent ProtectedRoute from seeing null user
    const updatedUser: UserProfile = user 
      ? { ...user, requiresPasswordChange: false } 
      : {
          uid: "participant-user",
          email: "participant@aiverse.in",
          name: "Participant User",
          role: "participant",
          displayRole: "Participant",
          requiresPasswordChange: false
        };

    setUser(updatedUser);
    localStorage.setItem("aether_mock_user", JSON.stringify(updatedUser));

    // 2. Update password in Supabase Auth
    try {
      const { error: supaErr } = await supabase.auth.updateUser({ password: newPassword });
      if (supaErr) {
        console.warn("[AuthContext] Supabase updateUser password error:", supaErr);
      }
    } catch (authErr) {
      console.warn("[AuthContext] Supabase password update skipped:", authErr);
    }

    // 3. Update Firestore users collection with new password
    const emailToUse = updatedUser.email || "participant@aiverse.in";
    const cleanEmail = emailToUse.toLowerCase().trim();
    const docId = updatedUser.uid && !updatedUser.uid.startsWith("mock-uid") 
      ? updatedUser.uid 
      : cleanEmail.replace(/[^a-z0-9]/g, '_');

    try {
      const userDocRef = doc(db, "users", docId);
      await setDoc(userDocRef, { 
        password: newPassword, 
        requiresPasswordChange: false, 
        updatedAt: Date.now() 
      }, { merge: true });

      // Also query users collection by email to update any matching team document
      const q = query(collection(db, "users"), where("email", "==", cleanEmail));
      const querySnap = await getDocs(q);
      querySnap.forEach((docItem) => {
        setDoc(docItem.ref, { 
          password: newPassword, 
          requiresPasswordChange: false, 
          updatedAt: Date.now() 
        }, { merge: true }).catch(() => {});
      });
    } catch (dbErr) {
      console.warn("[AuthContext] Firestore password update error:", dbErr);
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, register, setMockRole, updateUserPassword }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
