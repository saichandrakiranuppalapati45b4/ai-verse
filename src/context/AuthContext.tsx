import React, { createContext, useContext, useState, useEffect } from "react";
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged
} from "firebase/auth";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { auth, db } from "../config/firebase";

export interface UserProfile {
  uid: string;
  email: string;
  name: string;
  role: "faculty" | "organizer" | "member" | null;
  department?: string;
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

  // Initialize and listen to real Firebase Auth state changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setLoading(true);
      if (firebaseUser) {
        try {
          // Real Firebase User authenticated
          const userDocRef = doc(db, "users", firebaseUser.uid);
          const userDocSnap = await getDoc(userDocRef);
          
          if (userDocSnap.exists()) {
            const profileData = userDocSnap.data();
            setUser({
              uid: firebaseUser.uid,
              email: firebaseUser.email || "",
              name: profileData.name || "Aether Member",
              role: profileData.role || "member",
              department: profileData.department,
              year: profileData.year
            });
          } else {
            // Write a default profile document for them as a member in Firestore
            const defaultProfile = {
              name: firebaseUser.displayName || "Aether Member",
              email: firebaseUser.email || "",
              role: "member" as const,
              department: "AI & Data Science"
            };
            await setDoc(userDocRef, defaultProfile);
            setUser({
              uid: firebaseUser.uid,
              ...defaultProfile
            });
          }
        } catch (error) {
          console.error("Error loading user profile from Firestore:", error);
          // Fallback to basic auth info
          setUser({
            uid: firebaseUser.uid,
            email: firebaseUser.email || "",
            name: firebaseUser.displayName || "Aether Member",
            role: "member"
          });
        }
      } else {
        // If not authenticated via Firebase, check local mock session
        const savedUser = localStorage.getItem("aether_mock_user");
        if (savedUser) {
          setUser(JSON.parse(savedUser));
        } else {
          setUser(null);
        }
      }
      setLoading(false);
    });

    return () => unsubscribe();
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
          department: "AI & Data Science",
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
        role,
        department: "AI & Data Science"
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
        department: "AI & Data Science",
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
