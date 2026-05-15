import { supabaseClient } from "@/utility/supabaseClient";
import { normalizeAppRole, type AppRole } from "@/modules/admin/access";

/**
 * Check if current user has admin role
 * Uses server-side function for security
 */
export const isAdmin = async (): Promise<boolean> => {
  try {
    const { data, error } = await supabaseClient.rpc("is_admin");

    if (error) {
      console.error("Error checking admin status:", error);
      return false;
    }

    return data === true;
  } catch (error) {
    console.error("Exception checking admin status:", error);
    return false;
  }
};

/**
 * Check if current user has moderator role
 * Uses server-side function for security
 */
export const isModerator = async (): Promise<boolean> => {
  try {
    const { data, error } = await supabaseClient.rpc("is_moderator");

    if (error) {
      console.error("Error checking moderator status:", error);
      return false;
    }

    return data === true;
  } catch (error) {
    console.error("Exception checking moderator status:", error);
    return false;
  }
};

/**
 * Check if current user can enter the staff admin surface.
 */
export const isStaff = async (): Promise<boolean> => {
  try {
    const { data, error } = await supabaseClient.rpc("is_staff");

    if (error) {
      console.error("Error checking staff status:", error);
      return false;
    }

    return data === true;
  } catch (error) {
    console.error("Exception checking staff status:", error);
    return false;
  }
};

/**
 * Require admin role - throws if user is not admin
 */
export const requireAdmin = async (): Promise<void> => {
  const admin = await isAdmin();
  if (!admin) {
    throw new Error("Admin access required for this operation");
  }
};

/**
 * Get current user role
 */
export const getUserRole = async (): Promise<AppRole | null> => {
  try {
    const { data: { user } } = await supabaseClient.auth.getUser();
    if (!user) return null;

    const { data, error } = await supabaseClient
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .single();

    if (error || !data) {
      return "user"; // Default to user role
    }

    return normalizeAppRole(data.role);
  } catch (error) {
    console.error("Error getting user role:", error);
    return null;
  }
};
