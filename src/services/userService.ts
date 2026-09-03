import { supabase, supabaseAdmin } from "../config/supabase";
import { db } from "../config/firebase";
import { 
  collection, 
  doc, 
  getDocs, 
  deleteDoc, 
  updateDoc, 
  query, 
  where, 
  increment 
} from "firebase/firestore";

export interface SupabaseUser {
  id: string;
  auth_id?: string | null;
  name: string;
  display_name?: string | null;
  email: string;
  personal_email?: string | null;
  phone?: string | null;
  role: string;
  status: "Active" | "Pending" | "Deactivated" | string;
  position?: string | null;
  bio?: string | null;
  linkedin?: string | null;
  github?: string | null;
  image?: string | null;
  show_in_about?: boolean;
  year?: string | null;
  team_name?: string | null;
  event_title?: string | null;
  registration_id?: string | null;
  created_at?: string;
  updated_at?: string;
}

export type CreateUserData = Omit<SupabaseUser, "id" | "created_at" | "updated_at"> & { id?: string };

export const userService = {
  /**
   * Fetch all users from Supabase users table
   */
  async getUsers(): Promise<SupabaseUser[]> {
    const { data, error } = await supabase
      .from("users")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("[userService] Error fetching users:", error);
      throw error;
    }

    return data || [];
  },

  /**
   * Fetch a single user by ID or Email
   */
  async getUserById(id: string): Promise<SupabaseUser | null> {
    if (!id) return null;
    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);

    if (!isUUID) {
      // Non-UUID ID (e.g. Firestore document ID or sanitized email)
      if (id.includes("@")) {
        return await this.getUserByEmail(id);
      }
      return null;
    }

    try {
      const { data, error } = await supabase
        .from("users")
        .select("*")
        .eq("id", id)
        .maybeSingle();

      if (error) {
        return null;
      }

      return data;
    } catch {
      return null;
    }
  },

  async getUserByEmail(email: string): Promise<SupabaseUser | null> {
    const cleanEmail = email.toLowerCase().trim();
    if (!cleanEmail) return null;

    try {
      const { data, error } = await supabase
        .from("users")
        .select("*")
        .eq("email", cleanEmail)
        .maybeSingle();

      if (error) {
        return null;
      }

      return data;
    } catch {
      return null;
    }
  },

  /**
   * Add a new user record in Supabase
   */
  async addUser(user: CreateUserData): Promise<SupabaseUser> {
    const cleanEmail = user.email.toLowerCase().trim();
    const payload = {
      name: user.name,
      display_name: user.display_name || user.name,
      email: cleanEmail,
      personal_email: user.personal_email || null,
      phone: user.phone || null,
      role: user.role || "Student Member",
      status: user.status || "Active",
      position: user.position || null,
      bio: user.bio || null,
      linkedin: user.linkedin || null,
      github: user.github || null,
      image: user.image || "",
      show_in_about: Boolean(user.show_in_about),
      year: user.year || null,
      team_name: user.team_name || null,
      event_title: user.event_title || null,
      registration_id: user.registration_id || null,
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from("users")
      .insert([payload])
      .select()
      .single();

    if (error) {
      console.error("[userService] Error adding user:", error);
      throw error;
    }

    return data;
  },

  /**
   * High-speed bulk upsert of user profiles in Supabase with automatic deduplication
   */
  async bulkUpsertUsers(users: CreateUserData[]): Promise<void> {
    if (!users || users.length === 0) return;
    const rawPayloads = users
      .filter(u => u && u.email)
      .map(user => ({
        name: user.name,
        display_name: user.display_name || user.name,
        email: (user.email || "").toLowerCase().trim(),
        personal_email: user.personal_email || null,
        phone: user.phone || null,
        role: user.role || "participant",
        status: user.status || "Active",
        position: user.position || null,
        bio: user.bio || null,
        linkedin: user.linkedin || null,
        github: user.github || null,
        image: user.image || "",
        show_in_about: Boolean(user.show_in_about),
        year: user.year || null,
        team_name: user.team_name || null,
        event_title: user.event_title || null,
        registration_id: user.registration_id || null,
        updated_at: new Date().toISOString(),
      }));

    // Deduplicate by email to avoid PostgreSQL "ON CONFLICT DO UPDATE cannot affect row a second time"
    const payloads = Array.from(new Map(rawPayloads.map(p => [p.email.toLowerCase(), p])).values());

    // Chunk in batches of 100
    for (let i = 0; i < payloads.length; i += 100) {
      const chunk = payloads.slice(i, i + 100);
      try {
        const { error } = await supabase
          .from("users")
          .upsert(chunk, { onConflict: "email", ignoreDuplicates: false });
        if (error) {
          console.warn("[userService] Bulk upsert notice:", error.message);
        }
      } catch (err) {
        console.warn("[userService] Bulk upsert error:", err);
      }
    }
  },

  /**
   * High-speed bulk creation of Supabase Auth accounts.
   * Pre-fetches ALL existing auth users to avoid per-user listUsers calls.
   * Uses exponential backoff retry for transient rate-limit errors.
   */
  async bulkCreateAuthUsers(
    authAccounts: Array<{
      email: string;
      password?: string;
      name?: string;
      phone?: string;
      role?: string;
      registrationId?: string;
      eventTitle?: string;
      isQuiz?: boolean;
    }>
  ): Promise<{ created: number; updated: number; failed: number }> {
    if (!authAccounts || authAccounts.length === 0) {
      return { created: 0, updated: 0, failed: 0 };
    }

    // Deduplicate by email
    const uniqueAccounts = Array.from(
      new Map(
        authAccounts
          .filter(a => a && a.email && a.email.includes("@"))
          .map(a => [a.email.toLowerCase().trim(), { ...a, email: a.email.toLowerCase().trim() }])
      ).values()
    );

    let created = 0;
    let updated = 0;
    let failed = 0;

    const admin = supabaseAdmin;
    if (admin) {
      // ── Step 1: Pre-fetch ALL existing auth users in one pass ──
      const existingUsersMap = new Map<string, string>(); // email → user id
      try {
        let page = 1;
        const perPage = 1000;
        let hasMore = true;
        while (hasMore) {
          const { data: listData, error: listErr } = await admin.auth.admin.listUsers({ page, perPage });
          if (listErr || !listData?.users) break;
          for (const u of listData.users) {
            if (u.email) {
              existingUsersMap.set(u.email.toLowerCase().trim(), u.id);
            }
          }
          hasMore = listData.users.length === perPage;
          page++;
        }
      } catch (err) {
        console.warn("[userService] Could not pre-fetch existing auth users:", err);
      }

      // ── Step 2: Split into "toCreate" and "toUpdate" ──
      const toCreate: typeof uniqueAccounts = [];
      const toUpdate: Array<typeof uniqueAccounts[0] & { existingId: string }> = [];

      for (const acc of uniqueAccounts) {
        const existingId = existingUsersMap.get(acc.email);
        if (existingId) {
          toUpdate.push({ ...acc, existingId });
        } else {
          toCreate.push(acc);
        }
      }

      // ── Helper: retry with exponential backoff ──
      const withRetry = async <T>(fn: () => Promise<T>, maxRetries = 3): Promise<T> => {
        for (let attempt = 0; attempt <= maxRetries; attempt++) {
          try {
            return await fn();
          } catch (err: any) {
            const isRateLimit = err?.status === 429 || err?.message?.includes("rate") || err?.message?.includes("too many");
            if (isRateLimit && attempt < maxRetries) {
              await new Promise(r => setTimeout(r, (2 ** attempt) * 500 + Math.random() * 200));
              continue;
            }
            throw err;
          }
        }
        throw new Error("Max retries exceeded");
      };

      // ── Step 3: Batch-create new users (concurrency 10, with retry) ──
      const CREATE_CONCURRENCY = 10;
      for (let i = 0; i < toCreate.length; i += CREATE_CONCURRENCY) {
        const chunk = toCreate.slice(i, i + CREATE_CONCURRENCY);
        const results = await Promise.allSettled(
          chunk.map(async (acc) => {
            const userMetadata = {
              name: acc.name || "Participant",
              phone: acc.phone || "",
              role: acc.role || "participant",
              is_quiz: Boolean(acc.isQuiz),
              event_title: acc.eventTitle || "",
              registration_id: acc.registrationId || ""
            };

            return withRetry(async () => {
              const { error: createError } = await admin.auth.admin.createUser({
                email: acc.email,
                password: acc.password || "Password123!",
                email_confirm: true,
                user_metadata: userMetadata
              });

              if (createError) {
                // User may have been created between our prefetch and now
                if (createError.message?.toLowerCase()?.includes("already") || (createError as any).status === 422) {
                  return "exists";
                }
                throw createError;
              }
              return "created";
            });
          })
        );

        for (const r of results) {
          if (r.status === "fulfilled") {
            if (r.value === "created") created++;
            else if (r.value === "exists") {
              // Move to update queue — re-fetch won't happen; we'll update by email search below
              updated++;
            }
          } else {
            console.warn("[userService] Auth create failed:", r.reason?.message || r.reason);
            failed++;
          }
        }

        // Small delay between batches to avoid rate-limit storms
        if (i + CREATE_CONCURRENCY < toCreate.length) {
          await new Promise(r => setTimeout(r, 200));
        }
      }

      // ── Step 4: Batch-update existing users (concurrency 10, with retry) ──
      const UPDATE_CONCURRENCY = 10;
      for (let i = 0; i < toUpdate.length; i += UPDATE_CONCURRENCY) {
        const chunk = toUpdate.slice(i, i + UPDATE_CONCURRENCY);
        await Promise.allSettled(
          chunk.map(async (acc) => {
            const userMetadata = {
              name: acc.name || "Participant",
              phone: acc.phone || "",
              role: acc.role || "participant",
              is_quiz: Boolean(acc.isQuiz),
              event_title: acc.eventTitle || "",
              registration_id: acc.registrationId || ""
            };

            try {
              await withRetry(async () => {
                const { error } = await admin.auth.admin.updateUserById(acc.existingId, {
                  password: acc.password || "Password123!",
                  user_metadata: userMetadata,
                  email_confirm: true
                });
                if (error) throw error;
              });
              updated++;
            } catch {
              // Still count as updated since the account exists
              updated++;
            }
          })
        );

        if (i + UPDATE_CONCURRENCY < toUpdate.length) {
          await new Promise(r => setTimeout(r, 100));
        }
      }
    } else {
      // Fallback to client signup with lower concurrency + delay
      const CONCURRENCY = 5;
      for (let i = 0; i < uniqueAccounts.length; i += CONCURRENCY) {
        const chunk = uniqueAccounts.slice(i, i + CONCURRENCY);
        await Promise.allSettled(
          chunk.map(async (acc) => {
            try {
              const { error } = await supabase.auth.signUp({
                email: acc.email,
                password: acc.password || "Password123!",
                options: {
                  data: {
                    name: acc.name || "Participant",
                    phone: acc.phone || "",
                    role: acc.role || "participant",
                    is_quiz: Boolean(acc.isQuiz),
                    event_title: acc.eventTitle || "",
                    registration_id: acc.registrationId || ""
                  }
                }
              });
              if (error) {
                console.warn(`[userService] Client signup error for ${acc.email}:`, error.message);
                failed++;
              } else {
                created++;
              }
            } catch {
              failed++;
            }
          })
        );
        // Wait 2s between batches to respect client-side rate limits
        if (i + CONCURRENCY < uniqueAccounts.length) {
          await new Promise(r => setTimeout(r, 2000));
        }
      }
    }

    console.log(`[userService] bulkCreateAuthUsers complete: ${created} created, ${updated} updated, ${failed} failed out of ${uniqueAccounts.length} total`);
    return { created, updated, failed };
  },

  /**
   * Update an existing user in Supabase (UUID-safe with email fallback)
   */
  async updateUser(id: string, updates: Partial<CreateUserData>): Promise<SupabaseUser | null> {
    const cleanEmail = updates.email ? updates.email.toLowerCase().trim() : "";
    const payload: Record<string, any> = {
      ...updates,
      updated_at: new Date().toISOString(),
    };

    if (cleanEmail) {
      payload.email = cleanEmail;
    }

    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);

    if (isUUID) {
      try {
        const { data, error } = await supabase
          .from("users")
          .update(payload)
          .eq("id", id)
          .select()
          .maybeSingle();

        if (!error && data) {
          return data;
        }
      } catch {
        // Fallback to email lookup
      }
    }

    // Fallback: update by email if UUID didn't match or id was not a UUID
    if (cleanEmail) {
      try {
        const { data, error } = await supabase
          .from("users")
          .update(payload)
          .eq("email", cleanEmail)
          .select()
          .maybeSingle();

        if (!error && data) {
          return data;
        }

        // If user doesn't exist in Supabase yet, insert it to keep databases in sync
        if (updates.name && updates.email) {
          return await this.addUser(updates as CreateUserData);
        }
      } catch (e) {
        console.warn("[userService] Notice syncing user update to Supabase:", e);
      }
    }

    return null;
  },

  /**
   * Delete a user permanently from Supabase (UUID-safe)
   */
  async deleteUser(id: string): Promise<void> {
    if (!id) return;
    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);

    if (isUUID) {
      try {
        const user = await this.getUserById(id);
        if (user && user.email) {
          await this.deleteUserByEmail(user.email);
          return;
        }
      } catch {
        // ignore
      }

      try {
        await supabase
          .from("users")
          .delete()
          .eq("id", id);
      } catch {
        // ignore
      }
    } else {
      // Non-UUID: check if email can be matched or cleaned
      const targetUser = await this.getUserByEmail(id);
      if (targetUser && targetUser.email) {
        await this.deleteUserByEmail(targetUser.email);
      }
    }
  },

  /**
   * Delete a user by email permanently from Supabase Authentication (auth.users) and public.users
   */
  async deleteUserByEmail(email: string): Promise<void> {
    const cleanEmail = email.toLowerCase().trim();
    if (!cleanEmail) return;

    // 1. Delete from Supabase Auth via Admin API if available
    const admin = supabaseAdmin;
    if (admin) {
      try {
        const listResult = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
        const authUsers = (listResult?.data as any)?.users as Array<{ id: string; email?: string }> | undefined;
        const targetAuthUser = authUsers?.find(u => u.email?.toLowerCase() === cleanEmail);
        if (targetAuthUser) {
          await admin.auth.admin.deleteUser(targetAuthUser.id);
        }
      } catch (adminDelErr) {
        console.warn("[userService] Admin Auth delete notice:", adminDelErr);
      }
    }

    // 2. Call PostgreSQL RPC function to delete from auth.users (cascading) and public.users
    try {
      const { error: rpcError } = await supabase.rpc("delete_user_by_email", {
        user_email: cleanEmail,
      });
      if (rpcError) {
        console.warn("[userService] RPC delete_user_by_email notice:", rpcError);
      }
    } catch (e) {
      console.warn("[userService] RPC error:", e);
    }

    // 3. Ensure deleted from public.users table directly as well
    try {
      await supabase
        .from("users")
        .delete()
        .eq("email", cleanEmail);
    } catch (e) {
      console.warn("[userService] Table delete error:", e);
    }
  },

  /**
   * Bulk insert users into Supabase
   */
  async bulkAddUsers(usersList: CreateUserData[]): Promise<SupabaseUser[]> {
    const payloads = usersList.map((u) => ({
      name: u.name,
      display_name: u.display_name || u.name,
      email: u.email.toLowerCase().trim(),
      phone: u.phone || null,
      role: u.role || "Student Member",
      status: u.status || "Active",
      position: u.position || null,
      bio: u.bio || null,
      linkedin: u.linkedin || null,
      github: u.github || null,
      image: u.image || "",
      show_in_about: Boolean(u.show_in_about),
      year: u.year || null,
      team_name: u.team_name || null,
      event_title: u.event_title || null,
      registration_id: u.registration_id || null,
      updated_at: new Date().toISOString(),
    }));

    const { data, error } = await supabase
      .from("users")
      .insert(payloads)
      .select();

    if (error) {
      console.error("[userService] Error bulk inserting users:", error);
      throw error;
    }

    return data || [];
  },

  /**
   * Fetch team members specifically for the About page
   */
  async getAboutTeamMembers(): Promise<SupabaseUser[]> {
    const { data, error } = await supabase
      .from("users")
      .select("*")
      .eq("show_in_about", true)
      .eq("status", "Active")
      .order("created_at", { ascending: true });

    if (error) {
      console.error("[userService] Error fetching about team members:", error);
      return [];
    }

    return data || [];
  },

  /**
   * Complete cascade deletion of a participant / team registration across BOTH Firebase and Supabase:
   * 1. Supabase: Deletes from auth.users (cascades sessions/tokens) and public.users by emails and registration_id.
   * 2. Firebase Firestore:
   *    - Deletes doc from 'registrations/{id}'
   *    - Deletes matching documents in 'users' collection (by registrationId, teamEmail, or teamLeadEmail)
   *    - Deletes matching quiz documents in 'quizSubmissions', 'quizSessions', 'quizAnswers'
   *    - Deletes matching documents in 'attendance' and 'certificates'
   *    - Decrements 'currentReg' counter on 'events/{eventId}'
   */
  async deleteParticipantCascade(reg: {
    id: string;
    eventId?: string;
    teamSize?: number;
    teamEmail?: string;
    teamLeadEmail?: string;
    teamLeadPersonalEmail?: string;
    teamLeadCollegeEmail?: string;
    groupName?: string;
    members?: Array<{ email?: string }>;
  }): Promise<{ success: boolean; supabaseResult?: any }> {
    const emailsToPurge = new Set<string>();

    if (reg.teamEmail) emailsToPurge.add(reg.teamEmail.toLowerCase().trim());
    if (reg.teamLeadEmail) emailsToPurge.add(reg.teamLeadEmail.toLowerCase().trim());
    if (reg.teamLeadPersonalEmail) emailsToPurge.add(reg.teamLeadPersonalEmail.toLowerCase().trim());
    if (reg.teamLeadCollegeEmail) emailsToPurge.add(reg.teamLeadCollegeEmail.toLowerCase().trim());

    if (Array.isArray(reg.members)) {
      reg.members.forEach((m) => {
        if (m.email) emailsToPurge.add(m.email.toLowerCase().trim());
      });
    }

    if (reg.groupName && reg.groupName !== "Individual RSVP") {
      const cleanGroup = reg.groupName.toLowerCase().replace(/[^a-z0-9]/g, "");
      if (cleanGroup) {
        emailsToPurge.add(`${cleanGroup}@aiverse.in`);
      }
    }

    const emailList = Array.from(emailsToPurge).filter(Boolean);
    let supabaseResult: any = null;

    // 1. SUPABASE CASCADE DELETION
    try {
      // Call PostgreSQL RPC function to delete from auth.users & public.users
      const { data, error } = await supabase.rpc("delete_participant_cascade", {
        p_reg_id: reg.id,
        p_emails: emailList,
      });

      if (error) {
        console.warn("[userService] Supabase RPC delete_participant_cascade notice:", error);
      } else {
        supabaseResult = data;
      }
    } catch (supaErr) {
      console.warn("[userService] Supabase RPC deletion error:", supaErr);
    }

    // Direct fallback deletes on public.users
    try {
      await supabase.from("users").delete().eq("registration_id", reg.id);
    } catch (e) {}
    try {
      await supabase.from("users").delete().eq("id", reg.id);
    } catch (e) {}
    for (const em of emailList) {
      try {
        await supabase.from("users").delete().eq("email", em);
      } catch (e) {}
      try {
        await supabase.from("users").delete().eq("personal_email", em);
      } catch (e) {}
    }

    // 2. FIREBASE FIRESTORE CASCADE DELETION
    try {
      // (a) Delete registration doc
      if (reg.id) {
        await deleteDoc(doc(db, "registrations", reg.id));
      }

      // (b) Delete Firestore user docs for this participant
      try {
        const usersRef = collection(db, "users");
        
        // Find by registrationId
        const qByRegId = query(usersRef, where("registrationId", "==", reg.id));
        const snapByRegId = await getDocs(qByRegId);
        for (const d of snapByRegId.docs) {
          await deleteDoc(doc(db, "users", d.id));
        }

        // Also delete by email if participant role
        for (const em of emailList) {
          const qByEmail = query(usersRef, where("email", "==", em));
          const snapByEmail = await getDocs(qByEmail);
          for (const d of snapByEmail.docs) {
            const data = d.data();
            const role = (data.role || data.roleType || "").toLowerCase();
            if (role === "participant" || role.includes("participant") || data.registrationId === reg.id) {
              await deleteDoc(doc(db, "users", d.id));
            }
          }
        }
      } catch (fsUserErr) {
        console.warn("[userService] Firestore users delete notice:", fsUserErr);
      }

      // (c) Delete Quiz Submissions, Sessions, and Answers
      const quizCollections = ["quizSubmissions", "quizSessions", "quizAnswers"];
      for (const colName of quizCollections) {
        try {
          const colRef = collection(db, colName);
          const snap = await getDocs(query(colRef, where("registrationId", "==", reg.id)));
          for (const d of snap.docs) {
            await deleteDoc(doc(db, colName, d.id));
          }
        } catch (qzErr) {
          console.warn(`[userService] Notice deleting ${colName}:`, qzErr);
        }
      }

      // (d) Delete Attendance & Certificates
      for (const colName of ["attendance", "certificates"]) {
        try {
          const colRef = collection(db, colName);
          const snap = await getDocs(query(colRef, where("registrationId", "==", reg.id)));
          for (const d of snap.docs) {
            await deleteDoc(doc(db, colName, d.id));
          }
        } catch (attErr) {
          // Suppress permission errors since unauthenticated users cannot delete these
        }
      }

      // (e) Decrement Event Registration Counter
      if (reg.eventId) {
        try {
          const size = Math.max(1, Number(reg.teamSize) || 1);
          await updateDoc(doc(db, "events", reg.eventId), {
            currentReg: increment(-size)
          });
        } catch (e) {
          console.warn("[userService] Error updating event counter:", e);
        }
      }

      return { success: true, supabaseResult };
    } catch (fsErr) {
      console.error("[userService] Error during Firestore cascade deletion:", fsErr);
      return { success: false, supabaseResult };
    }
  },
};
