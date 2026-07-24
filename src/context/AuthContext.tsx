import React, { createContext, useContext, useState, useEffect } from "react";
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged
} from "firebase/auth";
import { doc, setDoc, onSnapshot } from "firebase/firestore";
import { auth, db } from "../config/firebase";

export interface UserProfile {
  uid: string;
  email: string;
  name: string;
  role: "faculty" | "organizer" | "member" | null;
  displayRole?: string;
  image?: string;
  year?: string;
}

interface AuthContextType {
  user: UserProfile | null;
  loading: boolean;
  login: (email: string, roleOrPassword: string) => Promise<void>;
  logout: () => Promise<void>;
  register?: (email: string, passwordOrRole: string, name: string, role: "faculty" | "organizer" | "member") => Promise<void>;
  setMockRole: (role: "faculty" | "organizer" | "member" | null) => void;
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
        const userDocRef = doc(db, "users", firebaseUser.uid);
        
        // Setup real-time listener for user profile changes
        unsubSnapshot = onSnapshot(userDocRef, (docSnap) => {
          if (docSnap.exists()) {
            const profileData = docSnap.data();
            const rawRole = profileData.role || "member";
            const normalizedRole = 
              rawRole.toLowerCase().includes("faculty") || rawRole.toLowerCase().includes("advisor") || rawRole.toLowerCase().includes("coordinator") ? "faculty" as const :
              rawRole.toLowerCase().includes("organizer") || rawRole.toLowerCase().includes("lead") || rawRole.toLowerCase().includes("head") ? "organizer" as const :
              "member" as const;

            setUser({
              uid: firebaseUser.uid,
              email: firebaseUser.email || "",
              name: profileData.name || "Aether Member",
              role: normalizedRole,
              displayRole: profileData.role || (normalizedRole === "faculty" ? "Faculty Advisor" : "Organizer"),
              image: profileData.image || "",
              year: profileData.year
            });
          } else {
            // Write a default profile document for them as a member in Firestore
            const defaultProfile = {
              name: firebaseUser.displayName || "Aether Member",
              email: firebaseUser.email || "",
              role: "member" as const
            };
            setDoc(userDocRef, defaultProfile).then(() => {
              setUser({
                uid: firebaseUser.uid,
                ...defaultProfile
              });
            });
          }
          setLoading(false);
        }, (error) => {
          console.error("Error in onSnapshot listener:", error);
          setLoading(false);
        });

      } else {
        // If not authenticated via Firebase, check local mock session
        const savedUser = localStorage.getItem("aether_mock_user");
        if (savedUser) {
          setUser(JSON.parse(savedUser));
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
    try {
      const isMockRole = ["faculty", "organizer", "member"].includes(roleOrPassword);
      if (isMockRole) {
        // Developer Quick Login
        const role = roleOrPassword as "faculty" | "organizer" | "member";
        const mockUser: UserProfile = {
          uid: `mock-uid-${role}`,
          email,
          name: role === "faculty" ? "Dr. Sarah Jenkins" : role === "organizer" ? "Alex Rivera" : "Jordan Lee",
          role,
          year: role === "member" ? "3rd Year" : undefined,
        };
        setUser(mockUser);
        localStorage.setItem("aether_mock_user", JSON.stringify(mockUser));
      } else {
        // Real Firebase Authentication login
        await signInWithEmailAndPassword(auth, email, roleOrPassword);
        // Clear any old mock sessions
        localStorage.removeItem("aether_mock_user");
      }
    } catch (error) {
      console.error("Login failed:", error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const register = async (email: string, passwordOrRole: string, name: string, role: "faculty" | "organizer" | "member") => {
    setLoading(true);
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, passwordOrRole);
      const userDocRef = doc(db, "users", userCredential.user.uid);
      const profile = {
        name,
        email,
        role
      };
      await setDoc(userDocRef, profile);
      // Clear mock session
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
      const updatedUser: UserProfile = {
        uid: `mock-uid-${role}`,
        email: `${role}@aetheric.ai`,
        name: role === "faculty" ? "Dr. Sarah Jenkins" : role === "organizer" ? "Alex Rivera" : "Jordan Lee",
        role,
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
