import express from "express";
import session from "express-session";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import { registerRoutes } from "./routes";
import { registerAuthRoutes } from "./auth";
import { initCronJobs } from "./cron";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.set('trust proxy', 1); // Trust Apache reverse proxy

// CORS for native Android app (Capacitor WebView)
app.use(cors({
  origin: [
    'https://adaptiveedge.uk',
    'capacitor://localhost',
    'http://localhost',
    'https://localhost',
  ],
  credentials: true,
}));

app.use(express.json());

// Session middleware
// Note: secure:false is OK — HTTPS terminates at Apache, internal proxy is HTTP.
// Browser↔Apache is always HTTPS. Apache↔Express is localhost only.
app.use(session({
  secret: process.env.SESSION_SECRET || 'watchlist-secret-change-in-production',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: false,
    httpOnly: true,
    sameSite: 'none' as const,
    maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
  },
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
  initCronJobs();
});
