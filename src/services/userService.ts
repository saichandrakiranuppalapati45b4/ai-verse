import { supabase } from "../config/supabase";

export interface SupabaseUser {
  id: string;
  auth_id?: string | null;
  name: string;
  display_name?: string | null;
  email: string;
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
    const { data, error } = await supabase
      .from("users")
      .select("*")
      .eq("id", id)
      .maybeSingle();

    if (error) {
      console.error(`[userService] Error fetching user ${id}:`, error);
      throw error;
    }

    return data;
  },

  async getUserByEmail(email: string): Promise<SupabaseUser | null> {
    const cleanEmail = email.toLowerCase().trim();
    const { data, error } = await supabase
      .from("users")
      .select("*")
      .eq("email", cleanEmail)
      .maybeSingle();

    if (error) {
      console.error(`[userService] Error fetching user by email ${cleanEmail}:`, error);
      throw error;
    }

    return data;
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
   * Update an existing user in Supabase
   */
  async updateUser(id: string, updates: Partial<CreateUserData>): Promise<SupabaseUser> {
    const payload: Record<string, any> = {
      ...updates,
      updated_at: new Date().toISOString(),
    };

    if (updates.email) {
      payload.email = updates.email.toLowerCase().trim();
    }

    const { data, error } = await supabase
      .from("users")
      .update(payload)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.error(`[userService] Error updating user ${id}:`, error);
      throw error;
    }

    return data;
  },

  /**
   * Delete a user permanently from Supabase (both auth.users and public.users)
   */
  async deleteUser(id: string): Promise<void> {
    try {
      const user = await this.getUserById(id);
      if (user && user.email) {
        await this.deleteUserByEmail(user.email);
        return;
      }
    } catch (e) {
      console.warn("[userService] Notice fetching user before delete:", e);
    }

    const { error } = await supabase
      .from("users")
      .delete()
      .eq("id", id);

    if (error) {
      console.error(`[userService] Error deleting user ${id}:`, error);
      throw error;
    }
  },

  /**
   * Delete a user by email permanently from Supabase Authentication (auth.users) and public.users
   */
  async deleteUserByEmail(email: string): Promise<void> {
    const cleanEmail = email.toLowerCase().trim();
    if (!cleanEmail) return;

    // 1. Call PostgreSQL RPC function to delete from auth.users (cascading) and public.users
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

    // 2. Ensure deleted from public.users table directly as well
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
};
