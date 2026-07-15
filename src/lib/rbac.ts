import { supabaseClient } from "@/utility/supabaseClient";

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
