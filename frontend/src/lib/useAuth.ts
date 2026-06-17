"use client";

import { useState, useEffect, useCallback } from "react";
import { api, type LoginResult } from "@/lib/api";

export interface AuthUser {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  membershipCategory: string;
  membershipCode: string;
  applicationStatus: string;
  isVerified: boolean;
  isAdmin: boolean;
  membershipExpiresAt: string | null;
  passportPhotoUrl: string | null;
  createdAt: string | null;
}

interface AuthState {
  user: AuthUser | null;
  token: string | null;
  loading: boolean;
  error: string | null;
}

function decodeToken(token: string): { userId: string; email: string } | null {
  try {
    const payload = JSON.parse(atob(token.split(".")[1]));
    return { userId: payload.userId, email: payload.email };
  } catch {
    return null;
  }
}

export function useAuth() {
  const [state, setState] = useState<AuthState>({
    user: null,
    token: null,
    loading: true,
    error: null,
  });

  const refreshUser = useCallback(async () => {
    const token = localStorage.getItem("gkac_token");
    if (!token) return;

    const res = await api.getMe();
    if (res.error) {
      // Token might be expired — clear session
      localStorage.removeItem("gkac_token");
      localStorage.removeItem("gkac_user");
      setState({ user: null, token: null, loading: false, error: null });
      return;
    }
    if (res.data) {
      const user: AuthUser = {
        id: res.data.user.id,
        firstName: res.data.user.firstName,
        lastName: res.data.user.lastName,
        email: res.data.user.email,
        phone: res.data.user.phone,
        membershipCategory: res.data.user.membershipCategory,
        membershipCode: res.data.user.membershipCode,
        applicationStatus: res.data.user.applicationStatus,
        isVerified: res.data.user.isVerified,
        isAdmin: res.data.user.isAdmin,
        membershipExpiresAt: res.data.user.membershipExpiresAt,
        passportPhotoUrl: res.data.user.passportPhotoUrl,
        createdAt: res.data.user.createdAt,
      };
      localStorage.setItem("gkac_user", JSON.stringify(user));
      setState((prev) => ({ ...prev, user, token, loading: false }));
    }
  }, []);

  // Restore session from localStorage on mount, then refresh from server
  useEffect(() => {
    const token = localStorage.getItem("gkac_token");
    const stored = localStorage.getItem("gkac_user");
    if (token && stored) {
      try {
        const user = JSON.parse(stored) as AuthUser;
        setState({ user, token, loading: false, error: null });
        // Fetch fresh data from server in the background
        refreshUser();
      } catch {
        // Stored data corrupted — clear it
        localStorage.removeItem("gkac_token");
        localStorage.removeItem("gkac_user");
        setState({ user: null, token: null, loading: false, error: null });
      }
    } else {
      setState((prev) => ({ ...prev, loading: false }));
    }
  }, [refreshUser]);

  const login = useCallback(async (email: string, password: string) => {
    setState((prev) => ({ ...prev, loading: true, error: null }));
    const res = await api.login({ email, password });
    if (res.error) {
      setState((prev) => ({ ...prev, loading: false, error: res.error! }));
      return { error: res.error };
    }
    if (res.data) {
      const user: AuthUser = {
        id: res.data.user.id,
        firstName: res.data.user.firstName,
        lastName: res.data.user.lastName,
        email: res.data.user.email,
        phone: res.data.user.phone,
        membershipCategory: res.data.user.membershipCategory,
        membershipCode: res.data.user.membershipCode,
        applicationStatus: res.data.user.applicationStatus,
        isVerified: res.data.user.isVerified,
        isAdmin: res.data.user.isAdmin,
        membershipExpiresAt: res.data.user.membershipExpiresAt,
        passportPhotoUrl: res.data.user.passportPhotoUrl,
        createdAt: res.data.user.createdAt,
      };
      localStorage.setItem("gkac_token", res.data.token);
      localStorage.setItem("gkac_user", JSON.stringify(user));
      setState({ user, token: res.data.token, loading: false, error: null });
      return { user };
    }
    return { error: "Unexpected error" };
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem("gkac_token");
    localStorage.removeItem("gkac_user");
    setState({ user: null, token: null, loading: false, error: null });
  }, []);

  return { ...state, login, logout, refreshUser };
}

/** Get the user's initials (e.g. "AJ" for Adebayo Johnson) */
export function getUserInitials(user: AuthUser): string {
  return (user.firstName.charAt(0) + user.lastName.charAt(0)).toUpperCase();
}

/** Get the expiry countdown info */
export function getExpiryInfo(expiresAt: string | null): { days: number; expired: boolean } {
  if (!expiresAt) return { days: 0, expired: false };
  const diff = new Date(expiresAt).getTime() - Date.now();
  if (diff <= 0) return { days: 0, expired: true };
  return { days: Math.floor(diff / (1000 * 60 * 60 * 24)), expired: false };
}
