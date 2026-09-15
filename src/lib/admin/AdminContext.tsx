"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { getOrCreateAdminRestaurant } from "./admin-service";
import type { Restaurant } from "@/types/database";
import type { User } from "@supabase/supabase-js";

interface AdminContextValue {
  restaurant: Restaurant | null;
  user: User | null;
  loading: boolean;
  error: string | null;
  refreshRestaurant: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AdminContext = createContext<AdminContextValue | undefined>(undefined);

export function AdminProvider({ children }: { children: React.ReactNode }) {
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const pathname = usePathname();

  const [initialized, setInitialized] = useState(false);

  const loadData = async (force = false) => {
    // If already loaded and not forced, keep existing data
    if (initialized && restaurant && !force) {
      return;
    }
    try {
      setLoading(true);
      setError(null);
      const supabase = createClient();
      
      // Fetch user session
      const {
        data: { user: currentUser },
      } = await supabase.auth.getUser();

      setUser(currentUser);

      // Fetch restaurant
      const rest = await getOrCreateAdminRestaurant();
      setRestaurant(rest);
      setInitialized(true);
    } catch (err: unknown) {
      console.error("Failed to load admin restaurant context:", err);
      setError(err instanceof Error ? err.message : "Failed to load restaurant data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Only load if not on login page and not initialized yet
    if (pathname !== "/admin/login") {
      if (!initialized) {
        loadData();
      }
    }
  }, [pathname, initialized]);

  const signOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    setUser(null);
    setRestaurant(null);
    setInitialized(false);
    router.push("/admin/login");
  };

  return (
    <AdminContext.Provider
      value={{
        restaurant,
        user,
        loading,
        error,
        refreshRestaurant: () => loadData(true),
        signOut,
      }}
    >
      {children}
    </AdminContext.Provider>
  );
}

export function useAdmin() {
  const context = useContext(AdminContext);
  if (!context) {
    throw new Error("useAdmin must be used within an AdminProvider");
  }
  return context;
}
