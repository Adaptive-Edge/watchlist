import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { apiRequest } from "@/lib/queryClient";

interface User {
  id: string;
  email: string | null;
  createdAt: string;
  onboardingComplete: number;
}

interface UserContextType {
  user: User | null;
  loading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  linkAccount: (email: string, password: string) => Promise<void>;
  startAnonymous: () => Promise<void>;
  completeOnboarding: () => Promise<void>;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export function UserProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkSession();
  }, []);

  async function checkSession() {
    try {
      const response = await apiRequest("GET", "/api/auth/me");
      if (response.user) {
        setUser(response.user);
      }
    } catch (error) {
      console.error("Failed to check session:", error);
    } finally {
      setLoading(false);
    }
  }

  async function login(email: string, password: string) {
    try {
      const userData = await apiRequest("POST", "/api/auth/login", { email, password });
      setUser(userData);
    } catch (error) {
      console.error("Login failed:", error);
      throw error;
    }
  }

  async function register(email: string, password: string) {
    try {
      const userData = await apiRequest("POST", "/api/auth/register", { email, password });
      setUser(userData);
    } catch (error) {
      console.error("Registration failed:", error);
      throw error;
    }
  }

  async function logout() {
    try {
      await apiRequest("POST", "/api/auth/logout");
      setUser(null);
    } catch (error) {
      console.error("Logout failed:", error);
      throw error;
    }
  }

  async function linkAccount(email: string, password: string) {
    if (!user) throw new Error("No user to link");
    try {
      const userData = await apiRequest("POST", "/api/auth/link", {
        userId: user.id,
        email,
        password,
      });
      setUser(userData);
    } catch (error) {
      console.error("Account linking failed:", error);
      throw error;
    }
  }

  async function startAnonymous() {
    try {
      const userData = await apiRequest("POST", "/api/auth/anonymous");
      setUser(userData);
    } catch (error) {
      console.error("Failed to create anonymous session:", error);
      throw error;
    }
  }

  async function completeOnboarding() {
    if (!user) return;
    try {
      await apiRequest("POST", `/api/users/${user.id}/complete-onboarding`);
      setUser({ ...user, onboardingComplete: 1 });
    } catch (error) {
      console.error("Failed to complete onboarding:", error);
      throw error;
    }
  }

  const isAuthenticated = !!user?.email;

  return (
    <UserContext.Provider
      value={{
        user,
        loading,
        isAuthenticated,
        login,
        register,
        logout,
        linkAccount,
        startAnonymous,
        completeOnboarding,
      }}
    >
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error("useUser must be used within a UserProvider");
  }
  return context;
}
