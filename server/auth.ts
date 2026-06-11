import type { Express, Request, Response } from "express";
import { storage } from "./storage";

// Extend express-session types
declare module 'express-session' {
  interface SessionData {
    userId: string;
  }
}

// Safe user response (excludes password hash)
function safeUser(user: any) {
  if (!user) return null;
  const { passwordHash, ...safe } = user;
  return safe;
}

export function registerAuthRoutes(app: Express) {
  // Register new user with email/password
  app.post("/api/auth/register", async (req: Request, res: Response) => {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        return res.status(400).json({ error: "Email and password required" });
      }

      if (password.length < 6) {
        return res.status(400).json({ error: "Password must be at least 6 characters" });
      }

      // Check if email already exists
      const existing = await storage.getUserByEmail(email);
      if (existing) {
        return res.status(409).json({ error: "Email already registered" });
      }

      const user = await storage.registerUser(email, password);
      req.session.userId = user.id;

      res.status(201).json(safeUser(user));
    } catch (error) {
      console.error("Registration error:", error);
      res.status(500).json({ error: "Failed to register" });
    }
  });

  // Login with email/password
  app.post("/api/auth/login", async (req: Request, res: Response) => {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        return res.status(400).json({ error: "Email and password required" });
      }

      const user = await storage.getUserByEmail(email);
      if (!user) {
        return res.status(401).json({ error: "Invalid email or password" });
      }

      const valid = await storage.verifyPassword(user, password);
      if (!valid) {
        return res.status(401).json({ error: "Invalid email or password" });
      }

      req.session.userId = user.id;
      res.json(safeUser(user));
    } catch (error) {
      console.error("Login error:", error);
      res.status(500).json({ error: "Failed to login" });
    }
  });

  // Logout
  app.post("/api/auth/logout", (req: Request, res: Response) => {
    req.session.destroy((err) => {
      if (err) {
        console.error("Logout error:", err);
        return res.status(500).json({ error: "Failed to logout" });
      }
      res.json({ success: true });
    });
  });

  // Get current session user
  app.get("/api/auth/me", async (req: Request, res: Response) => {
    try {
      if (!req.session.userId) {
        return res.json({ user: null });
      }

      const user = await storage.getUser(req.session.userId);
      res.json({ user: safeUser(user) });
    } catch (error) {
      console.error("Auth check error:", error);
      res.status(500).json({ error: "Failed to check auth" });
    }
  });

  // Link email to existing anonymous account
  app.post("/api/auth/link", async (req: Request, res: Response) => {
    try {
      const { userId, email, password } = req.body;

      if (!userId || !email || !password) {
        return res.status(400).json({ error: "userId, email, and password required" });
      }

      if (password.length < 6) {
        return res.status(400).json({ error: "Password must be at least 6 characters" });
      }

      // Check if email already exists
      const existing = await storage.getUserByEmail(email);
      if (existing) {
        return res.status(409).json({ error: "Email already registered" });
      }

      // Verify the user exists
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      // Link the email
      const updated = await storage.linkEmailToUser(userId, email, password);
      req.session.userId = updated.id;

      res.json(safeUser(updated));
    } catch (error) {
      console.error("Link error:", error);
      res.status(500).json({ error: "Failed to link account" });
    }
  });

  // Start anonymous session (for backward compatibility)
  app.post("/api/auth/anonymous", async (req: Request, res: Response) => {
    try {
      const user = await storage.createUser();
      req.session.userId = user.id;
      res.status(201).json(safeUser(user));
    } catch (error) {
      console.error("Anonymous session error:", error);
      res.status(500).json({ error: "Failed to create anonymous session" });
    }
  });
}
