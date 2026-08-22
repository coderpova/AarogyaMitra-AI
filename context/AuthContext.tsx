"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
} from "react";
import Cookies from "js-cookie";

export interface UserProfileData {
  age?: number;
  gender?: string;
  bloodGroup?: string;
  phone?: string;
  address?: string;
}

export interface User {
  name: string;
  email: string;
  settings?: { language?: string };
  gmailConnected?: boolean;
  profile?: UserProfileData;
}

export interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (userData: User, token?: string) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkUser = () => {
      const storedUser = localStorage.getItem("user");
      if (storedUser) {
        setUser(JSON.parse(storedUser));
      } else {
        setUser(null);
      }
      setLoading(false);
    };

    checkUser();
    window.addEventListener("auth-change", checkUser);
    return () => window.removeEventListener("auth-change", checkUser);
  }, []);

  const login = useCallback((userData: User, token?: string) => {
    if (token) {
      localStorage.setItem("token", token);
      Cookies.set("token", token, { expires: 7 });
    }
    localStorage.setItem("user", JSON.stringify(userData));
    setUser(userData);
    window.dispatchEvent(new Event("auth-change"));
  }, []);

  const logout = useCallback(async () => {
    try {
      await fetch("/api/logout", { method: "POST", credentials: "same-origin" });
    } catch (e) {
      console.error("Logout API error:", e);
    }
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    Cookies.remove("token");
    setUser(null);
    window.dispatchEvent(new Event("auth-change"));
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used inside AuthProvider");
  }
  return context;
}
