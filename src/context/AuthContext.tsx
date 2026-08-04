import React, { createContext, useContext, useState, useEffect } from "react";
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged
} from "firebase/auth";
import { doc, setDoc, onSnapshot } from "firebase/firestore";
import { auth, db } from "../config/firebase";

export const ALLOWED_EMAILS = [
  "admin@aiverse.in",
  "facultycoordinator@aiverse.in",
  "studentorganizer@aiverse.in",
  "jury@aiverse.in"
];

export interface UserProfile {
  uid: string;
  email: string;
  name: string;
  role: "faculty" | "organizer" | "member" | "jury" | null;
  displayRole?: string;
  image?: string;
  year?: string;
}

interface AuthContextType {
  user: UserProfile | null;
  loading: boolean;
  login: (email: string, roleOrPassword: string) => Promise<void>;
  logout: () => Promise<void>;
  register?: (email: string, passwordOrRole: string, name: string, role: "faculty" | "organizer" | "member" | "jury") => Promise<void>;
  setMockRole: (role: "faculty" | "organizer" | "member" | "jury" | null) => void;
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
        
        // Strict restriction: Only allow the 3 authorized emails
        if (!ALLOWED_EMAILS.includes(userEmail)) {
          console.warn(`[AuthContext] Denying access to unauthorized user: ${userEmail}`);
          await signOut(auth);
          setUser(null);
          localStorage.removeItem("aether_mock_user");
          setLoading(false);
          return;
        }

        const userDocRef = doc(db, "users", firebaseUser.uid);
        
        let forcedRole: "faculty" | "organizer" | "member" | "jury" = "faculty";
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
        }

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
            setUser({
              uid: firebaseUser.uid,
              email: firebaseUser.email || "",
              name: profileData.displayName || profileData.name || defaultName,
              role: forcedRole,
              displayRole: profileData.role || forcedDisplayRole,
              image: profileData.image || "",
              year: profileData.year
            });
          } else {
            setUser(fallbackProfile);
            // Write a default profile document for them in Firestore asynchronously
            const defaultProfile = {
              name: firebaseUser.displayName || defaultName,
              email: firebaseUser.email || "",
              role: forcedDisplayRole,
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
        // If not authenticated via Firebase, check local mock session
        const savedUserStr = localStorage.getItem("aether_mock_user");
        if (savedUserStr) {
          try {
            const savedUser = JSON.parse(savedUserStr);
            if (savedUser && savedUser.email && ALLOWED_EMAILS.includes(savedUser.email.toLowerCase().trim())) {
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
    
    if (!ALLOWED_EMAILS.includes(cleanEmail)) {
      setLoading(false);
      throw new Error("Access restricted: Only authorized accounts (admin@aiverse.in, facultycoordinator@aiverse.in, studentorganizer@aiverse.in, jury@aiverse.in) are permitted to sign in.");
    }

    try {
      const isMockRole = ["faculty", "organizer", "member", "jury"].includes(roleOrPassword);
      if (isMockRole) {
        // Developer Quick Login for testing
        let role: "faculty" | "organizer" | "member" | "jury" = "faculty";
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
        }

        const mockUser: UserProfile = {
          uid: `mock-uid-${cleanEmail}`,
          email: cleanEmail,
          name,
          role,
          displayRole,
        };
        setUser(mockUser);
        localStorage.setItem("aether_mock_user", JSON.stringify(mockUser));
        setLoading(false);
      } else {
        // Real Firebase Authentication login
        await signInWithEmailAndPassword(auth, email, roleOrPassword);
        // Clear any old mock sessions
        localStorage.removeItem("aether_mock_user");
      }
    } catch (error) {
      console.error("Login failed:", error);
      setLoading(false);
      throw error;
    }
  };

  const register = async (email: string, passwordOrRole: string, name: string, role: "faculty" | "organizer" | "member") => {
    setLoading(true);
    const cleanEmail = email.toLowerCase().trim();

    if (!ALLOWED_EMAILS.includes(cleanEmail)) {
      setLoading(false);
      throw new Error("Access restricted: Only authorized accounts (admin@aiverse.in, facultycoordinator@aiverse.in, studentorganizer@aiverse.in) are permitted to register.");
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

  const setMockRole = (role: "faculty" | "organizer" | "member" | null) => {
    if (role === null) {
      setUser(null);
      localStorage.removeItem("aether_mock_user");
      signOut(auth).catch(() => {});
    } else {
      const email = role === "organizer" ? "studentorganizer@aiverse.in" : "admin@aiverse.in";
      const updatedUser: UserProfile = {
        uid: `mock-uid-${email}`,
        email,
        name: role === "organizer" ? "Student Organizer" : "System Admin",
        role: role === "organizer" ? "organizer" : "faculty",
        displayRole: role === "organizer" ? "Student Organizer" : "Super Admin"
      };
      setUser(updatedUser);
      localStorage.setItem("aether_mock_user", JSON.stringify(updatedUser));
      signOut(auth).catch(() => {});
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, register, setMockRole }}>
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
