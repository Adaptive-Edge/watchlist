import express from "express";
import session from "express-session";
import path from "path";
import { fileURLToPath } from "url";
import { registerRoutes } from "./routes";
import { registerAuthRoutes } from "./auth";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(express.json());

// Session middleware
app.use(session({
  secret: process.env.SESSION_SECRET || 'watchlist-secret-change-in-production',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
  }
}));

// Register API routes
registerAuthRoutes(app);
registerRoutes(app);

// Serve static files in production
const publicPath = path.join(__dirname, "public");
app.use(express.static(publicPath));

// SPA fallback
app.get("*", (req, res) => {
  if (!req.path.startsWith("/api")) {
    res.sendFile(path.join(publicPath, "index.html"));
  }
});

const PORT = process.env.PORT || 5031;
app.listen(PORT, () => {
  console.log(`Watchlist server running on port ${PORT}`);
});
