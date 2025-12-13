import type { Express } from "express";
import { storage } from "./storage";
import { generateRecommendations, parseNaturalLanguageRequest } from "./ai";

export function registerRoutes(app: Express) {
  // === User Management ===

  // Create new user
  app.post("/api/users", async (req, res) => {
    try {
      const user = await storage.createUser();
      res.status(201).json(user);
    } catch (error) {
      console.error("Error creating user:", error);
      res.status(500).json({ error: "Failed to create user" });
    }
  });

  // Get user
  app.get("/api/users/:id", async (req, res) => {
    try {
      const user = await storage.getUser(req.params.id);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }
      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ error: "Failed to fetch user" });
    }
  });

  // Complete onboarding
  app.post("/api/users/:id/complete-onboarding", async (req, res) => {
    try {
      await storage.completeOnboarding(req.params.id);
      res.json({ success: true });
    } catch (error) {
      console.error("Error completing onboarding:", error);
      res.status(500).json({ error: "Failed to complete onboarding" });
    }
  });

  // Get full user profile
  app.get("/api/users/:id/profile", async (req, res) => {
    try {
      const profile = await storage.getUserProfile(req.params.id);
      if (!profile.user) {
        return res.status(404).json({ error: "User not found" });
      }
      res.json(profile);
    } catch (error) {
      console.error("Error fetching profile:", error);
      res.status(500).json({ error: "Failed to fetch profile" });
    }
  });

  // === Genre Preferences ===

  app.get("/api/users/:userId/genres", async (req, res) => {
    try {
      const genres = await storage.getGenrePreferences(req.params.userId);
      res.json(genres);
    } catch (error) {
      console.error("Error fetching genres:", error);
      res.status(500).json({ error: "Failed to fetch genres" });
    }
  });

  app.post("/api/users/:userId/genres", async (req, res) => {
    try {
      const genre = await storage.setGenrePreference({
        userId: req.params.userId,
        genre: req.body.genre,
        rating: req.body.rating,
      });
      res.status(201).json(genre);
    } catch (error) {
      console.error("Error setting genre preference:", error);
      res.status(500).json({ error: "Failed to set genre preference" });
    }
  });

  // === Actor Preferences ===

  app.get("/api/users/:userId/actors", async (req, res) => {
    try {
      const actors = await storage.getActorPreferences(req.params.userId);
      res.json(actors);
    } catch (error) {
      console.error("Error fetching actors:", error);
      res.status(500).json({ error: "Failed to fetch actors" });
    }
  });

  app.post("/api/users/:userId/actors", async (req, res) => {
    try {
      const actor = await storage.addActorPreference({
        userId: req.params.userId,
        actorName: req.body.actorName,
        rating: req.body.rating || 5,
      });
      res.status(201).json(actor);
    } catch (error) {
      console.error("Error adding actor:", error);
      res.status(500).json({ error: "Failed to add actor" });
    }
  });

  app.delete("/api/actors/:id", async (req, res) => {
    try {
      await storage.deleteActorPreference(req.params.id);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting actor:", error);
      res.status(500).json({ error: "Failed to delete actor" });
    }
  });

  // === Director Preferences ===

  app.get("/api/users/:userId/directors", async (req, res) => {
    try {
      const directors = await storage.getDirectorPreferences(req.params.userId);
      res.json(directors);
    } catch (error) {
      console.error("Error fetching directors:", error);
      res.status(500).json({ error: "Failed to fetch directors" });
    }
  });

  app.post("/api/users/:userId/directors", async (req, res) => {
    try {
      const director = await storage.addDirectorPreference({
        userId: req.params.userId,
        directorName: req.body.directorName,
        rating: req.body.rating || 5,
      });
      res.status(201).json(director);
    } catch (error) {
      console.error("Error adding director:", error);
      res.status(500).json({ error: "Failed to add director" });
    }
  });

  app.delete("/api/directors/:id", async (req, res) => {
    try {
      await storage.deleteDirectorPreference(req.params.id);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting director:", error);
      res.status(500).json({ error: "Failed to delete director" });
    }
  });

  // === Mood Preferences ===

  app.get("/api/users/:userId/moods", async (req, res) => {
    try {
      const moods = await storage.getMoodPreferences(req.params.userId);
      res.json(moods);
    } catch (error) {
      console.error("Error fetching moods:", error);
      res.status(500).json({ error: "Failed to fetch moods" });
    }
  });

  app.post("/api/users/:userId/moods", async (req, res) => {
    try {
      const mood = await storage.setMoodPreference({
        userId: req.params.userId,
        mood: req.body.mood,
        rating: req.body.rating,
      });
      res.status(201).json(mood);
    } catch (error) {
      console.error("Error setting mood:", error);
      res.status(500).json({ error: "Failed to set mood" });
    }
  });

  // === Favourite Titles ===

  app.get("/api/users/:userId/favourites", async (req, res) => {
    try {
      const favourites = await storage.getFavouriteTitles(req.params.userId);
      res.json(favourites);
    } catch (error) {
      console.error("Error fetching favourites:", error);
      res.status(500).json({ error: "Failed to fetch favourites" });
    }
  });

  app.post("/api/users/:userId/favourites", async (req, res) => {
    try {
      const favourite = await storage.addFavouriteTitle({
        userId: req.params.userId,
        title: req.body.title,
        mediaType: req.body.mediaType,
        year: req.body.year,
        reason: req.body.reason,
      });
      res.status(201).json(favourite);
    } catch (error) {
      console.error("Error adding favourite:", error);
      res.status(500).json({ error: "Failed to add favourite" });
    }
  });

  app.delete("/api/favourites/:id", async (req, res) => {
    try {
      await storage.deleteFavouriteTitle(req.params.id);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting favourite:", error);
      res.status(500).json({ error: "Failed to delete favourite" });
    }
  });

  // === Watch History ===

  app.get("/api/users/:userId/history", async (req, res) => {
    try {
      const history = await storage.getWatchHistory(req.params.userId);
      res.json(history);
    } catch (error) {
      console.error("Error fetching history:", error);
      res.status(500).json({ error: "Failed to fetch history" });
    }
  });

  app.post("/api/users/:userId/history", async (req, res) => {
    try {
      const item = await storage.addToWatchHistory({
        userId: req.params.userId,
        title: req.body.title,
        mediaType: req.body.mediaType,
        year: req.body.year,
        rating: req.body.rating,
        notes: req.body.notes,
      });
      res.status(201).json(item);
    } catch (error) {
      console.error("Error adding to history:", error);
      res.status(500).json({ error: "Failed to add to history" });
    }
  });

  app.patch("/api/history/:id/rating", async (req, res) => {
    try {
      await storage.updateWatchHistoryRating(req.params.id, req.body.rating);
      res.json({ success: true });
    } catch (error) {
      console.error("Error updating rating:", error);
      res.status(500).json({ error: "Failed to update rating" });
    }
  });

  // === Rejected Items ===

  app.get("/api/users/:userId/rejected", async (req, res) => {
    try {
      const rejected = await storage.getRejectedItems(req.params.userId);
      res.json(rejected);
    } catch (error) {
      console.error("Error fetching rejected:", error);
      res.status(500).json({ error: "Failed to fetch rejected" });
    }
  });

  app.post("/api/users/:userId/rejected", async (req, res) => {
    try {
      const item = await storage.addRejectedItem({
        userId: req.params.userId,
        title: req.body.title,
        mediaType: req.body.mediaType,
        year: req.body.year,
        reason: req.body.reason,
      });
      res.status(201).json(item);
    } catch (error) {
      console.error("Error rejecting item:", error);
      res.status(500).json({ error: "Failed to reject item" });
    }
  });

  // === Watchlist ===

  app.get("/api/users/:userId/watchlist", async (req, res) => {
    try {
      const watchlist = await storage.getWatchlist(req.params.userId);
      res.json(watchlist);
    } catch (error) {
      console.error("Error fetching watchlist:", error);
      res.status(500).json({ error: "Failed to fetch watchlist" });
    }
  });

  app.post("/api/users/:userId/watchlist", async (req, res) => {
    try {
      const item = await storage.addToWatchlist({
        userId: req.params.userId,
        title: req.body.title,
        mediaType: req.body.mediaType,
        year: req.body.year,
        priority: req.body.priority || 0,
        recommendationReason: req.body.recommendationReason,
      });
      res.status(201).json(item);
    } catch (error) {
      console.error("Error adding to watchlist:", error);
      res.status(500).json({ error: "Failed to add to watchlist" });
    }
  });

  app.delete("/api/watchlist/:id", async (req, res) => {
    try {
      await storage.removeFromWatchlist(req.params.id);
      res.json({ success: true });
    } catch (error) {
      console.error("Error removing from watchlist:", error);
      res.status(500).json({ error: "Failed to remove from watchlist" });
    }
  });

  app.patch("/api/watchlist/:id/priority", async (req, res) => {
    try {
      await storage.updateWatchlistPriority(req.params.id, req.body.priority);
      res.json({ success: true });
    } catch (error) {
      console.error("Error updating priority:", error);
      res.status(500).json({ error: "Failed to update priority" });
    }
  });

  // === AI Recommendations ===

  app.post("/api/users/:userId/recommendations", async (req, res) => {
    try {
      const profile = await storage.getUserProfile(req.params.userId);
      if (!profile.user) {
        return res.status(404).json({ error: "User not found" });
      }

      const recommendations = await generateRecommendations(
        {
          genres: profile.genres,
          actors: profile.actors,
          directors: profile.directors,
          moods: profile.moods,
          favourites: profile.favourites,
          history: profile.history,
          rejected: profile.rejected,
        },
        req.body.request
      );

      // Log each recommendation
      for (const rec of recommendations) {
        await storage.logRecommendation({
          userId: req.params.userId,
          title: rec.title,
          mediaType: rec.mediaType,
          year: rec.year,
          reason: rec.reason,
          prompt: req.body.request || "profile-based",
        });
      }

      res.json(recommendations);
    } catch (error) {
      console.error("Error generating recommendations:", error);
      res.status(500).json({ error: "Failed to generate recommendations" });
    }
  });

  // Parse natural language request
  app.post("/api/parse-request", async (req, res) => {
    try {
      const parsed = await parseNaturalLanguageRequest(req.body.request);
      res.json(parsed);
    } catch (error) {
      console.error("Error parsing request:", error);
      res.status(500).json({ error: "Failed to parse request" });
    }
  });

  // === Recommendation Log ===

  app.get("/api/users/:userId/recommendation-log", async (req, res) => {
    try {
      const log = await storage.getRecommendationLog(req.params.userId);
      res.json(log);
    } catch (error) {
      console.error("Error fetching log:", error);
      res.status(500).json({ error: "Failed to fetch log" });
    }
  });

  app.patch("/api/recommendation-log/:id/outcome", async (req, res) => {
    try {
      await storage.updateRecommendationOutcome(req.params.id, req.body.outcome);
      res.json({ success: true });
    } catch (error) {
      console.error("Error updating outcome:", error);
      res.status(500).json({ error: "Failed to update outcome" });
    }
  });
}
