"use client";

import { createContext, useContext, useState, useCallback, ReactNode } from "react";

interface AuthContextType {
  token: string | null;
  user: any;
  isAuthenticated: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
  setToken: (token: string) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<any>(null);

  const login = useCallback(async (username: string, password: string) => {
    try {
      // Aquí irá tu llamada a la API de login
      // const response = await fetch('/api/login', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify({ username, password })
      // });
      // const data = await response.json();
      
      // Por ahora, simulamos un token
      const fakeToken = `token_${Date.now()}`;
      const fakeUser = { username, role: "user" };
      
      setToken(fakeToken);
      setUser(fakeUser);
    } catch (error) {
      console.error("Login error:", error);
      throw error;
    }
  }, []);

  const logout = useCallback(() => {
    setToken(null);
    setUser(null);
  }, []);

  const value: AuthContextType = {
    token,
    user,
    isAuthenticated: !!token,
    login,
    logout,
    setToken,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth debe ser usado dentro de AuthProvider");
  }
  return context;
}
