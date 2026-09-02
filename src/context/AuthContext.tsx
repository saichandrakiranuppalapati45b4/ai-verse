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
  defaultRole: "faculty" | "organizer" | "member" | "jury" | "participant" = "participant"
): "faculty" | "organizer" | "member" | "jury" | "participant" => {
  if (!rawRole) return defaultRole;
  const lower = String(rawRole).toLowerCase().trim();
  if (lower === "faculty" || lower === "admin" || lower.includes("super admin") || lower.includes("faculty advisor") || lower.includes("faculty coordinator") || lower.includes("system admin")) {
    return "faculty";
  }
  if (lower === "organizer" || lower.includes("lead organizer") || lower.includes("student organizer") || lower.includes("co-organizer") || lower.includes("co organizer") || lower.includes("secretary") || lower.includes("facilitator") || lower === "organizer") {
    return "organizer";
  }
  if (lower === "jury" || lower.includes("jury") || lower.includes("evaluator")) {
    return "jury";
  }
  if (lower === "participant" || lower.includes("participant") || lower === "member" || lower.includes("student member") || lower.includes("student") || lower.includes("attendee") || lower.includes("volunteer")) {
    return "participant";
  }
  return defaultRole;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  const activeUserIdRef = React.useRef<string | null>(null);

  // Initialize and listen to Supabase Auth state changes with real-time Firestore sync
  useEffect(() => {
    let unsubSnapshot: (() => void) | null = null;

    const setupProfileListener = async (userId: string, userEmail: string, isInitial: boolean = false) => {
      if (activeUserIdRef.current === userId && unsubSnapshot) {
        return; // Listener already established and running for this user
      }

      if (unsubSnapshot) {
        unsubSnapshot();
        unsubSnapshot = null;
      }
      activeUserIdRef.current = userId;
      if (isInitial) {
        setLoading(true);
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
      
      let forcedRole: "faculty" | "organizer" | "member" | "jury" | "participant" = "participant";
      let forcedDisplayRole = "Participant";
      let defaultName = userEmail.split("@")[0] || "Participant";
      
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
          await setupProfileListener(session.user.id, userEmail, true);
        } else {
          // No Supabase session — check local session (mock/legacy)
          const savedUserStr = localStorage.getItem("aether_mock_user");
          if (savedUserStr) {
            try {
              const savedUser = JSON.parse(savedUserStr);
              if (savedUser && savedUser.email && savedUser.role) {
                setUser(savedUser);
                activeUserIdRef.current = savedUser.uid || savedUser.email;
              } else {
                localStorage.removeItem("aether_mock_user");
                activeUserIdRef.current = null;
                setUser(null);
              }
            } catch (e) {
              localStorage.removeItem("aether_mock_user");
              activeUserIdRef.current = null;
              setUser(null);
            }
          } else {
            activeUserIdRef.current = null;
            setUser(null);
          }
          setLoading(false);
        }
      } catch (err) {
        console.warn("[AuthContext] Supabase session check warning:", err);
        const savedUserStr = localStorage.getItem("aether_mock_user");
        if (savedUserStr) {
          try {
            const parsed = JSON.parse(savedUserStr);
            setUser(parsed);
            activeUserIdRef.current = parsed.uid || parsed.email;
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
          if (activeUserIdRef.current !== session.user.id) {
            const userEmail = session.user.email?.toLowerCase().trim() || "";
            await setupProfileListener(session.user.id, userEmail, false);
          }
        } else if (event === "SIGNED_OUT") {
          // If we have a local session, ignore passive Supabase SIGNED_OUT events on tab change
          const savedUserStr = localStorage.getItem("aether_mock_user");
          if (savedUserStr) {
            try {
              const savedUser = JSON.parse(savedUserStr);
              if (savedUser && savedUser.email && savedUser.role) {
                // Keep the active user intact without flickering
                return;
              }
            } catch (e) {}
          }
          if (unsubSnapshot) {
            unsubSnapshot();
            unsubSnapshot = null;
          }
          activeUserIdRef.current = null;
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

  // Real-time access revocation watcher for participants
  useEffect(() => {
    if (!user || user.role !== "participant") return;

    let unsub: (() => void) | null = null;

    const handleRevokeImmediate = () => {
      console.warn("[AuthContext] Real-time revocation detected on registration! Immediately redirecting to /login...");
      localStorage.removeItem("aether_mock_user");
      supabase.auth.signOut().catch(() => {});
      setUser(null);
      window.location.href = "/login";
    };

    // Watch the canonical registration document
    if (user.registrationId) {
      try {
        unsub = onSnapshot(doc(db, "registrations", user.registrationId), (snap) => {
          if (snap.exists()) {
            const data = snap.data();
            if (data.accessGranted === false || data.loginAccessGranted === false) {
              handleRevokeImmediate();
            }
          }
        }, (err) => console.warn("Revocation watcher error:", err));
      } catch (e) {}
    }

    return () => {
      if (unsub) unsub();
    };
  }, [user]);

  const login = async (email: string, passwordInput: string) => {
    setLoading(true);
    const cleanEmail = email.toLowerCase().trim();
    const cleanPassword = passwordInput ? passwordInput.trim() : "";

    const digitsOnly = cleanEmail.replace(/\D/g, "");
    const isPhoneInput = !cleanEmail.includes("@") && digitsOnly.length >= 7;

    if (!isPhoneInput && (!cleanEmail || !cleanPassword)) {
      setLoading(false);
      throw new Error("Please enter both email and password.");
    }

    try {
      // 0. Check if user is attempting login with a Phone Number (Direct Login - No Password Required)
      if (isPhoneInput) {
        const last10 = digitsOnly.slice(-10);
        let phoneUser: any = null;

        // Try lookup in users_by_phone
        try {
          const pSnap = await getDoc(doc(db, "users_by_phone", last10));
          if (pSnap.exists()) {
            phoneUser = pSnap.data();
          }
        } catch (e) {}

        // Fallback: lookup in users collection by phone / phoneNumber
        if (!phoneUser) {
          try {
            const q1 = query(collection(db, "users"), where("phone", "==", cleanEmail));
            const s1 = await getDocs(q1);
            if (!s1.empty) {
              phoneUser = s1.docs[0].data();
            } else {
              const q2 = query(collection(db, "users"), where("phoneNumber", "==", cleanEmail));
              const s2 = await getDocs(q2);
              if (!s2.empty) phoneUser = s2.docs[0].data();
              else {
                const q3 = query(collection(db, "users"), where("phone", "==", last10));
                const s3 = await getDocs(q3);
                if (!s3.empty) phoneUser = s3.docs[0].data();
                else {
                  const q4 = query(collection(db, "users"), where("phoneNumber", "==", last10));
                  const s4 = await getDocs(q4);
                  if (!s4.empty) phoneUser = s4.docs[0].data();
                }
              }
            }
          } catch (e) {}
        }

        // Fallback: lookup in registrations collection
        if (!phoneUser) {
          try {
            const queries = [
              query(collection(db, "registrations"), where("phoneNumber", "==", cleanEmail)),
              query(collection(db, "registrations"), where("phoneNumber", "==", last10)),
              query(collection(db, "registrations"), where("phone", "==", cleanEmail)),
              query(collection(db, "registrations"), where("phone", "==", last10)),
              query(collection(db, "registrations"), where("leadPhone", "==", cleanEmail)),
              query(collection(db, "registrations"), where("leadPhone", "==", last10)),
            ];
            for (const q of queries) {
              const snap = await getDocs(q);
              if (!snap.empty) {
                phoneUser = { id: snap.docs[0].id, ...snap.docs[0].data() };
                break;
              }
            }
          } catch (e) {}
        }

        // Fallback: lookup in team_credentials
        if (!phoneUser) {
          try {
            const qCred = query(collection(db, "team_credentials"), where("phone", "==", last10));
            const sCred = await getDocs(qCred);
            if (!sCred.empty) {
              phoneUser = sCred.docs[0].data();
            }
          } catch (e) {}
        }

        if (phoneUser) {
          const regId = phoneUser.registrationId || phoneUser.id;
          let hasAccess = false;

          // 1. Check registration document as primary source of truth
          if (regId) {
            try {
              const regDoc = await getDoc(doc(db, "registrations", regId));
              if (regDoc.exists()) {
                const rData = regDoc.data();
                if (rData.accessGranted === true || rData.loginAccessGranted === true) {
                  hasAccess = true;
                }
              }
            } catch (e) {}
          }

          // 2. Fallback check on phoneUser object
          if (!hasAccess && (phoneUser.accessGranted === true || phoneUser.loginAccessGranted === true)) {
            hasAccess = true;
          }

          if (!hasAccess) {
            setLoading(false);
            throw new Error("Access Pending: Login access has not been activated by the event coordinator yet. Please wait for organizers to grant access.");
          }

          // DIRECT LOGIN: NO PASSWORD REQUIRED FOR PHONE LOGIN!
          const targetEmail = (
            phoneUser.personalEmail ||
            phoneUser.teamLeadPersonalEmail ||
            phoneUser.leadPersonalEmail ||
            phoneUser.email ||
            phoneUser.teamLeadEmail ||
            phoneUser.teamEmail ||
            ""
          ).trim().toLowerCase();

          const storedPassword = phoneUser.password || phoneUser.teamPassword;

          // If Supabase account exists with stored password, authenticate Supabase session seamlessly
          if (targetEmail && storedPassword) {
            try {
              const { data: supaAuthData, error: supaAuthErr } = await supabase.auth.signInWithPassword({
                email: targetEmail,
                password: storedPassword
              });
              if (!supaAuthErr && supaAuthData?.user) {
                const supaUserRecord = await userService.getUserByEmail(targetEmail);
                const role = normalizeRole(supaUserRecord?.role || phoneUser.role, "participant");
                const customUser: UserProfile = {
                  uid: supaAuthData.user.id,
                  email: targetEmail,
                  name: supaUserRecord?.name || phoneUser.name || phoneUser.fullName || phoneUser.teamLeadName || phoneUser.leadName || "Participant",
                  role,
                  displayRole: "Participant",
                  requiresPasswordChange: false,
                  teamName: phoneUser.teamName || (phoneUser.isQuiz ? "Individual Registration" : undefined),
                  eventTitle: phoneUser.eventTitle,
                  registrationId: regId
                };
                setUser(customUser);
                localStorage.setItem("aether_mock_user", JSON.stringify(customUser));
                setLoading(false);
                return;
              }
            } catch (supaErr) {
              console.log("[AuthContext] Supabase sign in via phone notice:", supaErr);
            }
          }

          // Direct authenticated session via phone (without password)
          const role = normalizeRole(phoneUser.role, "participant");
          const customUser: UserProfile = {
            uid: regId || last10,
            email: targetEmail || `${last10}@aiverse.in`,
            name: phoneUser.name || phoneUser.fullName || phoneUser.teamLeadName || phoneUser.leadName || "Participant",
            role,
            displayRole: "Participant",
            requiresPasswordChange: false,
            teamName: phoneUser.teamName || (phoneUser.isQuiz ? "Individual Registration" : undefined),
            eventTitle: phoneUser.eventTitle,
            registrationId: regId
          };
          setUser(customUser);
          localStorage.setItem("aether_mock_user", JSON.stringify(customUser));
          setLoading(false);
          return;
        } else {
          setLoading(false);
          throw new Error("No registered account found with this phone number. Please verify your phone number or log in with your email.");
        }
      }

      // 1. Try Supabase Auth sign in
      try {
        const { data: supaAuthData, error: supaAuthError } = await supabase.auth.signInWithPassword({
          email: cleanEmail,
          password: cleanPassword
        });
        if (!supaAuthError && supaAuthData.user) {
          const supaUserRecord = await userService.getUserByEmail(cleanEmail);
          const isFacultyEmail = cleanEmail === "admin@aiverse.in" || cleanEmail === "facultycoordinator@aiverse.in";
          const defaultRole = isFacultyEmail ? "faculty" : (cleanEmail.includes("organizer") ? "organizer" : (cleanEmail.includes("jury") ? "jury" : "participant"));
          const rawRole = supaUserRecord?.role || defaultRole;
          const role = normalizeRole(rawRole, defaultRole);

          if (role === "participant") {
            let accessOk = false;
            const regId = supaUserRecord?.registration_id;
            if (regId) {
              try {
                const regDoc = await getDoc(doc(db, "registrations", regId));
                if (regDoc.exists()) {
                  const rData = regDoc.data();
                  if (rData.accessGranted === true || rData.loginAccessGranted === true) {
                    accessOk = true;
                  }
                }
              } catch (e) {}
            }
            if (!accessOk) {
              try {
                const uDocId = cleanEmail.replace(/[^a-z0-9]/g, '_');
                const uSnap = await getDoc(doc(db, "users", uDocId));
                if (uSnap.exists()) {
                  const uData = uSnap.data();
                  if (uData.accessGranted === true || uData.loginAccessGranted === true) {
                    accessOk = true;
                  }
                }
              } catch (e) {}
            }

            if (!accessOk) {
              await supabase.auth.signOut();
              setLoading(false);
              throw new Error("Access Pending: Login access has not been activated by the event coordinator yet. Please wait for organizers to grant access.");
            }
          }

          const customUser: UserProfile = {
            uid: supaAuthData.user.id,
            email: cleanEmail,
            name: supaUserRecord?.name || supaUserRecord?.display_name || cleanEmail.split("@")[0],
            role,
            displayRole: supaUserRecord?.position || (role === "faculty" ? "Super Admin" : (role === "organizer" ? "Student Organizer" : (role === "jury" ? "Jury Evaluator" : "Participant"))),
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

        const isFacultyEmail = cleanEmail === "admin@aiverse.in" || cleanEmail === "facultycoordinator@aiverse.in";
        const defaultRole = isFacultyEmail ? "faculty" : (cleanEmail.includes("organizer") ? "organizer" : (cleanEmail.includes("jury") ? "jury" : "participant"));
        const rawRole = foundDocData.role || defaultRole;
        const role = normalizeRole(rawRole, defaultRole);

        if (role === "participant" && !PREDEFINED_EMAILS.includes(cleanEmail)) {
          let hasAccess = Boolean(foundDocData.accessGranted === true || foundDocData.loginAccessGranted === true);
          if (!hasAccess && foundDocData.registrationId) {
            try {
              const rDoc = await getDoc(doc(db, "registrations", foundDocData.registrationId));
              if (rDoc.exists()) {
                const rData = rDoc.data();
                if (rData.accessGranted === true || rData.loginAccessGranted === true) {
                  hasAccess = true;
                }
              }
            } catch (e) {}
          }

          if (!hasAccess) {
            setLoading(false);
            throw new Error("Access Pending: Login access has not been activated by the event coordinator yet. Please wait for organizers to grant access.");
          }
        }

        const name = foundDocData.name || foundDocData.displayName || foundDocData.teamLeadName || cleanEmail.split('@')[0];
        const displayRole = foundDocData.displayRole || (role === "faculty" ? (cleanEmail === "facultycoordinator@aiverse.in" ? "Faculty Coordinator" : "Super Admin") : (role === "organizer" ? "Student Organizer" : (role === "jury" ? "Jury Evaluator" : "Participant")));

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

        let role: "faculty" | "organizer" | "member" | "jury" | "participant" = "participant";
        let displayRole = "Participant";
        let name = "Participant User";

        if (cleanEmail === "admin@aiverse.in") {
          role = "faculty";
          displayRole = "Super Admin";
          name = "Super Admin";
        } else if (cleanEmail === "facultycoordinator@aiverse.in") {
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
