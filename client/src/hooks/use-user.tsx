import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { apiRequest } from "@/lib/queryClient";
import { isNative } from "@/lib/config";

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

const USER_KEY = "watchlist_user";

function saveUser(user: User) {
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

function loadUser(): User | null {
  try {
    const stored = localStorage.getItem(USER_KEY);
    return stored ? JSON.parse(stored) : null;
  } catch {
    return null;
  }
}

function clearUser() {
  localStorage.removeItem(USER_KEY);
}

export function UserProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkSession();
  }, []);

  async function checkSession() {
    try {
      // Try session cookie first (works on web)
      const response = await apiRequest("GET", "/api/auth/me");
      if (response.user) {
        setUser(response.user);
        saveUser(response.user);
        setLoading(false);
        return;
      }
    } catch {}

    // Fall back to stored user (works on native where cookies don't persist)
    const stored = loadUser();
    if (stored) {
      try {
        // Verify the user still exists
        const userData = await apiRequest("GET", `/api/users/${stored.id}`);
        setUser(userData);
        saveUser(userData);
      } catch {
        clearUser();
      }
    }

    setLoading(false);
  }

  async function login(email: string, password: string) {
    try {
      const userData = await apiRequest("POST", "/api/auth/login", { email, password });
      setUser(userData);
      saveUser(userData);
    } catch (error) {
      console.error("Login failed:", error);
      throw error;
    }
  }

  async function register(email: string, password: string) {
    try {
      const userData = await apiRequest("POST", "/api/auth/register", { email, password });
      setUser(userData);
      saveUser(userData);
    } catch (error) {
      console.error("Registration failed:", error);
      throw error;
    }
  }

  async function logout() {
    try {
      await apiRequest("POST", "/api/auth/logout");
    } catch {}
    setUser(null);
    clearUser();
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
      saveUser(userData);
    } catch (error) {
      console.error("Account linking failed:", error);
      throw error;
    }
  }

  async function startAnonymous() {
    try {
      const userData = await apiRequest("POST", "/api/auth/anonymous");
      setUser(userData);
      saveUser(userData);
    } catch (error) {
      console.error("Failed to create anonymous session:", error);
      throw error;
    }
  }

  async function completeOnboarding() {
    if (!user) return;
    try {
      await apiRequest("POST", `/api/users/${user.id}/complete-onboarding`);
      const updated = { ...user, onboardingComplete: 1 };
      setUser(updated);
      saveUser(updated);
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
