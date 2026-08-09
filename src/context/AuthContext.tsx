import React, { createContext, useContext, useState, useEffect } from "react";
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged,
  updatePassword
} from "firebase/auth";
import { doc, setDoc, getDoc, getDocs, collection, query, where, onSnapshot } from "firebase/firestore";
import { auth, db } from "../config/firebase";

export const ALLOWED_EMAILS = [
  "admin@aiverse.in",
  "facultycoordinator@aiverse.in",
  "studentorganizer@aiverse.in",
  "jury@aiverse.in",
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

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  // Initialize and listen to real Firebase Auth state changes with real-time Firestore sync
  useEffect(() => {
    let unsubSnapshot: (() => void) | null = null;

    const unsubscribeAuth = onAuthStateChanged(auth, async (firebaseUser) => {
      setLoading(true);
      if (unsubSnapshot) {
        unsubSnapshot();
        unsubSnapshot = null;
      }

      if (firebaseUser) {
        const userEmail = firebaseUser.email?.toLowerCase().trim() || "";
        
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
          await signOut(auth);
          setUser(null);
          localStorage.removeItem("aether_mock_user");
          setLoading(false);
          return;
        }

        // For team emails (e.g. alphaa@aiverse.in), the user doc is stored under
        // the sanitized email ID (e.g. alphaa_aiverse_in), not the Firebase Auth UID.
        // Check that doc first so we get registrationId, teamName, etc.
        const sanitizedEmailId = userEmail.replace(/[^a-z0-9]/g, '_');
        let userDocRef = doc(db, "users", firebaseUser.uid);
        
        // If a user doc exists under the sanitized email ID, use that instead
        if (sanitizedEmailId !== firebaseUser.uid) {
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
        } else if (userEmail === "jury@aiverse.in") {
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

        // Helper function to normalize system role
        const normalizeRole = (rawRole: any, defaultRole: "faculty" | "organizer" | "member" | "jury" | "participant"): "faculty" | "organizer" | "member" | "jury" | "participant" => {
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
          if (lower === "member" || lower.includes("member")) {
            return "member";
          }
          return defaultRole;
        };

        const fallbackProfile: UserProfile = {
          uid: firebaseUser.uid,
          email: firebaseUser.email || "",
          name: firebaseUser.displayName || defaultName,
          role: forcedRole,
          displayRole: forcedDisplayRole
        };

        // Setup real-time listener for user profile changes
        unsubSnapshot = onSnapshot(userDocRef, (docSnap) => {
          if (docSnap.exists()) {
            const profileData = docSnap.data();
            const userRole = normalizeRole(profileData.role, forcedRole);
            setUser({
              uid: firebaseUser.uid,
              email: firebaseUser.email || "",
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
              name: firebaseUser.displayName || defaultName,
              email: firebaseUser.email || "",
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

      } else {
        // If not authenticated via Firebase, check local session
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
    });

    return () => {
      unsubscribeAuth();
      if (unsubSnapshot) unsubSnapshot();
    };
  }, []);

  const login = async (email: string, roleOrPassword: string) => {
    setLoading(true);
    const cleanEmail = email.toLowerCase().trim();

    try {
      const isMockRole = ["faculty", "organizer", "member", "jury", "participant"].includes(roleOrPassword);
      if (isMockRole) {
        // Developer Quick Login for testing
        let role: "faculty" | "organizer" | "member" | "jury" | "participant" = "faculty";
        let displayRole = "Super Admin";
        let name = "System Admin";

        if (cleanEmail === "facultycoordinator@aiverse.in") {
          role = "faculty";
          displayRole = "Faculty Coordinator";
          name = "Faculty Coordinator";
        } else if (cleanEmail === "studentorganizer@aiverse.in") {
          role = "organizer";
          displayRole = "Student Organizer";
          name = "Student Organizer";
        } else if (cleanEmail === "jury@aiverse.in") {
          role = "jury";
          displayRole = "Jury Evaluator";
          name = "Jury Panelist";
        } else if (cleanEmail === "participant@aiverse.in" || roleOrPassword === "participant") {
          role = "participant";
          displayRole = "Participant";
          name = "Alex Rivera";
        }

        const mockUser: UserProfile = {
          uid: `mock-uid-${cleanEmail}`,
          email: cleanEmail,
          name,
          role,
          displayRole,
          requiresPasswordChange: true
        };
        setUser(mockUser);
        localStorage.setItem("aether_mock_user", JSON.stringify(mockUser));
        setLoading(false);
        return;
      }

      // 1. Try real Firebase Auth sign in
      try {
        await signInWithEmailAndPassword(auth, email, roleOrPassword);
        localStorage.removeItem("aether_mock_user");
        setLoading(false);
        return;
      } catch (firebaseErr) {
        console.log("[AuthContext] Firebase Auth sign-in unverified, querying Firestore users collection...");
      }

      // 2. Query Firestore `users` collection for participant credentials (e.g. alphaa_aiverse_in)
      const docId = cleanEmail.replace(/[^a-z0-9]/g, '_');
      const userDocRef = doc(db, "users", docId);
      const userSnap = await getDoc(userDocRef);

      let foundDocData: any = null;
      let foundDocId: string = docId;

      if (userSnap.exists()) {
        foundDocData = userSnap.data();
      } else {
        // Fallback query where email == cleanEmail
        const q = query(collection(db, "users"), where("email", "==", cleanEmail));
        const querySnap = await getDocs(q);
        if (!querySnap.empty) {
          foundDocData = querySnap.docs[0].data();
          foundDocId = querySnap.docs[0].id;
        }
      }

      if (foundDocData) {
        // Verify password if present in Firestore document
        if (foundDocData.password && foundDocData.password !== roleOrPassword) {
          setLoading(false);
          throw new Error("Invalid password. Please check your credentials.");
        }

        const role = (foundDocData.role as "faculty" | "organizer" | "member" | "jury" | "participant") || "participant";
        const name = foundDocData.teamLeadName || foundDocData.name || foundDocData.teamName || cleanEmail.split('@')[0];
        const displayRole = role === "participant" ? "Participant" : (foundDocData.displayRole || role);

        const customUser: UserProfile = {
          uid: foundDocId,
          email: foundDocData.email || cleanEmail,
          name,
          role,
          displayRole,
          requiresPasswordChange: foundDocData.requiresPasswordChange !== false,
          teamName: foundDocData.teamName,
          eventTitle: foundDocData.eventTitle,
          registrationId: foundDocData.registrationId
        };

        setUser(customUser);
        localStorage.setItem("aether_mock_user", JSON.stringify(customUser));
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
      const userCredential = await createUserWithEmailAndPassword(auth, email, passwordOrRole);
      const userDocRef = doc(db, "users", userCredential.user.uid);
      const profile = {
        name,
        email,
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
      await signOut(auth);
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
      signOut(auth).catch(() => {});
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
      signOut(auth).catch(() => {});
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

    // 2. Safely update Firebase Auth password if current user exists
    if (auth.currentUser) {
      try {
        await updatePassword(auth.currentUser, newPassword);
      } catch (authErr) {
        console.warn("[AuthContext] updatePassword on Firebase Auth skipped/unverified:", authErr);
      }
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
