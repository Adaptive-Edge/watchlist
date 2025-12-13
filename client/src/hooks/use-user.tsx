import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { apiRequest } from "@/lib/queryClient";

interface User {
  id: string;
  createdAt: string;
  onboardingComplete: number;
}

interface UserContextType {
  user: User | null;
  loading: boolean;
  createUser: () => Promise<void>;
  completeOnboarding: () => Promise<void>;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

const USER_ID_KEY = "watchlist_user_id";

export function UserProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const storedUserId = localStorage.getItem(USER_ID_KEY);
    if (storedUserId) {
      loadUser(storedUserId);
    } else {
      setLoading(false);
    }
  }, []);

  async function loadUser(userId: string) {
    try {
      const userData = await apiRequest("GET", `/api/users/${userId}`);
      setUser(userData);
    } catch (error) {
      console.error("Failed to load user:", error);
      localStorage.removeItem(USER_ID_KEY);
    } finally {
      setLoading(false);
    }
  }

  async function createUser() {
    try {
      const newUser = await apiRequest("POST", "/api/users");
      localStorage.setItem(USER_ID_KEY, newUser.id);
      setUser(newUser);
    } catch (error) {
      console.error("Failed to create user:", error);
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

  return (
    <UserContext.Provider value={{ user, loading, createUser, completeOnboarding }}>
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
