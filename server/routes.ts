import type { Express } from "express";
import { storage } from "./storage";
import { generateRecommendations, parseNaturalLanguageRequest, generateTasteInsights, normaliseTitle } from "./ai";
import {
  runDailyNewReleases,
  scoreNewReleasesForUser,
  addTmdbRelease,
  scoreGuardianPicksForUser,
} from "./cron";
import { fetchAndStoreGuardianArchive } from "./guardianArchive";
import { searchTitle, fetchBasicInfo } from "./tmdb";

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
      const watchlist = await storage.getEnrichedWatchlist(req.params.userId);
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
      // Removing from the watchlist must not silently re-expose the title to
      // the recommenders. Unless the user has watched it (history excludes
      // it already), record it as rejected so scoring keeps excluding it.
      const item = await storage.getWatchlistItemById(req.params.id);
      if (item) {
        const history = await storage.getWatchHistory(item.userId);
        const watched = history.some(
          (h) => h.title.toLowerCase() === item.title.toLowerCase()
        );
        if (!watched) {
          await storage.addRejectedItem({
            userId: item.userId,
            title: item.title,
            mediaType: item.mediaType,
            year: item.year,
            reason: "Removed from watchlist",
          });
        }
      }
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

      // Enrich with TMDB posters + trailers
      const enriched = await Promise.all(
        recommendations.map(async (rec) => {
          try {
            const tmdb = await searchTitle(rec.title, rec.year, rec.mediaType);
            if (tmdb) {
              rec.posterPath = tmdb.posterPath;
              rec.trailerUrl = tmdb.trailerKey
                ? `https://www.youtube.com/watch?v=${tmdb.trailerKey}`
                : null;
            }
          } catch {}
          return rec;
        })
      );

      // Log each recommendation
      for (const rec of enriched) {
        await storage.logRecommendation({
          userId: req.params.userId,
          title: rec.title,
          mediaType: rec.mediaType,
          year: rec.year,
          reason: rec.reason,
          prompt: req.body.request || "profile-based",
        });
      }

      res.json(enriched);
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

  // Generate taste insights
  app.get("/api/users/:userId/insights", async (req, res) => {
    try {
      const profile = await storage.getUserProfile(req.params.userId);
      if (!profile.user) {
        return res.status(404).json({ error: "User not found" });
      }

      const watchlistTitles = (await storage.getWatchlist(req.params.userId)).map(
        (w) => w.title
      );

      const profileArg = {
        genres: profile.genres,
        actors: profile.actors,
        directors: profile.directors,
        moods: profile.moods,
        favourites: profile.favourites,
        history: profile.history,
        rejected: profile.rejected,
      };

      // The model sometimes suggests a gem the user has already seen despite
      // the DO NOT SUGGEST list — validate against the normalised exclusion
      // set, retry once, then drop the gem rather than show a known title.
      const excludedGems = new Set(
        [
          ...profile.favourites.map((f) => f.title),
          ...profile.history.map((h) => h.title),
          ...profile.rejected.map((r) => r.title),
          ...watchlistTitles,
        ].map(normaliseTitle)
      );
      const gemIsKnown = (i: { hiddenGem: { title: string } | null }) =>
        i.hiddenGem != null && excludedGems.has(normaliseTitle(i.hiddenGem.title));

      let insights = await generateTasteInsights(profileArg, watchlistTitles);
      if (gemIsKnown(insights)) {
        const retry = await generateTasteInsights(profileArg, watchlistTitles);
        insights = gemIsKnown(retry) ? { ...retry, hiddenGem: null } : retry;
      }

      // Enrich the hidden gem with TMDB data so the client can render it as
      // an actionable card (poster, trailer, year, rating)
      if (insights.hiddenGem) {
        try {
          const gem = insights.hiddenGem;
          const tmdb = await searchTitle(gem.title, null, gem.mediaType);
          if (tmdb) {
            gem.posterPath = tmdb.posterPath;
            gem.trailerKey = tmdb.trailerKey;
            const basic = await fetchBasicInfo(tmdb.tmdbId, gem.mediaType);
            gem.year = basic.year;
            gem.tmdbRating = basic.tmdbRating;
          }
        } catch {}
      }

      res.json(insights);
    } catch (error) {
      console.error("Error generating insights:", error);
      res.status(500).json({ error: "Failed to generate insights" });
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

  // === Recommendation Stats ===

  app.get("/api/users/:userId/recommendation-stats", async (req, res) => {
    try {
      const stats = await storage.getRecommendationStats(req.params.userId);
      res.json(stats);
    } catch (error) {
      console.error("Error fetching stats:", error);
      res.status(500).json({ error: "Failed to fetch stats" });
    }
  });

  // Distinct streaming providers (UK) across both new releases and Guardian
  // archive — used to populate the provider filter pill row.
  app.get("/api/streaming-providers", async (req, res) => {
    try {
      const providers = await storage.getStreamingProviders();
      res.json(providers);
    } catch (error) {
      console.error("Error fetching streaming providers:", error);
      res.status(500).json({ error: "Failed to fetch streaming providers" });
    }
  });

  // Unified picks across all sources (new releases + Guardian archive). Each
  // pick carries a `source` discriminator and an attached `release` or
  // `review` object — frontend renders one feed.
  app.get("/api/users/:userId/picks", async (req, res) => {
    try {
      const userId = req.params.userId;
      const mediaType = req.query.mediaType as "film" | "tv" | undefined;
      const provider = req.query.provider as string | undefined;
      const [newPicks, guardianPicks] = await Promise.all([
        storage.getUserPicks(userId, mediaType),
        storage.getUserGuardianPicks(userId),
      ]);

      const filterByProvider = (streamingUk: unknown) => {
        if (!provider) return true;
        if (!Array.isArray(streamingUk)) return false;
        return streamingUk.some(
          (s: { provider?: string }) => s?.provider === provider
        );
      };

      const unified: Array<{
        id: string;
        source: "new_release" | "guardian_review";
        relevanceScore: number | null;
        reason: string | null;
        status: string;
        item: unknown;
      }> = [];

      for (const p of newPicks) {
        if (mediaType && p.release.mediaType !== mediaType) continue;
        if (!filterByProvider(p.release.streamingUk)) continue;
        unified.push({
          id: p.id,
          source: "new_release",
          relevanceScore: p.relevanceScore,
          reason: p.reason,
          status: p.status || "new",
          item: p.release,
        });
      }
      for (const p of guardianPicks) {
        if (mediaType && p.review.mediaType !== mediaType) continue;
        if (!filterByProvider(p.review.streamingUk)) continue;
        unified.push({
          id: p.id,
          source: "guardian_review",
          relevanceScore: p.relevanceScore,
          reason: p.reason,
          status: p.status || "new",
          item: p.review,
        });
      }
      unified.sort((a, b) => (b.relevanceScore || 0) - (a.relevanceScore || 0));
      res.json(unified);
    } catch (error) {
      console.error("Error fetching unified picks:", error);
      res.status(500).json({ error: "Failed to fetch picks" });
    }
  });

  // Unified action endpoint — routes to the right per-source handler based on
  // the pick id (which is unambiguous since user_picks and user_guardian_picks
  // both use UUIDs from disjoint pools).
  app.post("/api/users/:userId/picks/:pickId/action", async (req, res) => {
    try {
      const userId = req.params.userId;
      const pickId = req.params.pickId;
      const { action, rating, reason } = req.body as {
        action: "add_to_watchlist" | "watched" | "rejected";
        rating?: "loved" | "ok" | "disliked";
        reason?: string;
      };

      // Try guardian-pick first, fall back to new-release-pick.
      const gpicks = await storage.getUserGuardianPicks(userId);
      const gpick = gpicks.find((p) => p.id === pickId);
      if (gpick) {
        const r = gpick.review;
        if (action === "add_to_watchlist") {
          await storage.addToWatchlist({
            userId,
            title: r.title,
            mediaType: r.mediaType,
            year: r.year,
            recommendationReason: gpick.reason,
          });
          await storage.updateUserGuardianPickStatus(pickId, "added_to_watchlist");
        } else if (action === "watched") {
          await storage.addToWatchHistory({
            userId,
            title: r.title,
            mediaType: r.mediaType,
            year: r.year,
            rating,
          });
          await storage.updateUserGuardianPickStatus(pickId, "watched");
        } else if (action === "rejected") {
          await storage.addRejectedItem({
            userId,
            title: r.title,
            mediaType: r.mediaType,
            year: r.year,
            reason: reason || "Not interested",
          });
          await storage.updateUserGuardianPickStatus(pickId, "rejected");
        }
        return res.json({ success: true, source: "guardian_review" });
      }

      const npicks = await storage.getUserPicks(userId);
      const npick = npicks.find((p) => p.id === pickId);
      if (npick) {
        const r = npick.release;
        if (action === "add_to_watchlist") {
          await storage.addToWatchlist({
            userId,
            title: r.title,
            mediaType: r.mediaType,
            year: r.year,
            recommendationReason: npick.reason,
          });
          await storage.updateUserPickStatus(pickId, "added_to_watchlist");
        } else if (action === "watched") {
          await storage.addToWatchHistory({
            userId,
            title: r.title,
            mediaType: r.mediaType,
            year: r.year,
            rating,
          });
          await storage.updateUserPickStatus(pickId, "watched");
        } else if (action === "rejected") {
          await storage.addRejectedItem({
            userId,
            title: r.title,
            mediaType: r.mediaType,
            year: r.year,
            reason: reason || "Not interested",
          });
          await storage.updateUserPickStatus(pickId, "rejected");
        }
        return res.json({ success: true, source: "new_release" });
      }

      res.status(404).json({ error: "Pick not found" });
    } catch (error) {
      console.error("Error handling unified pick action:", error);
      res.status(500).json({ error: "Failed to handle action" });
    }
  });

  // Refresh both pick sources at once (re-runs scoring for both pipelines).
  app.post("/api/users/:userId/picks/refresh", async (req, res) => {
    try {
      const userId = req.params.userId;
      const guidance = req.body?.guidance as string | undefined;
      await Promise.all([
        scoreNewReleasesForUser(userId, undefined, undefined, guidance),
        scoreGuardianPicksForUser(userId, undefined, guidance),
      ]);
      res.json({ success: true });
    } catch (error) {
      console.error("Error refreshing picks:", error);
      res.status(500).json({ error: "Failed to refresh picks" });
    }
  });

  // Recent Guardian reviews from the archive (any rating, last 60 days)
  app.get("/api/guardian-reviews-recent", async (req, res) => {
    try {
      const days = req.query.days ? parseInt(req.query.days as string, 10) : 60;
      const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 50;
      const reviews = await storage.getRecentGuardianReviews(days, limit);
      res.json(reviews);
    } catch (error) {
      console.error("Error fetching recent guardian reviews:", error);
      res.status(500).json({ error: "Failed to fetch recent guardian reviews" });
    }
  });

  // Personalised Guardian picks (scored against user taste, last 12 months)
  app.get("/api/users/:userId/guardian-picks", async (req, res) => {
    try {
      const picks = await storage.getUserGuardianPicks(req.params.userId);
      res.json(picks);
    } catch (error) {
      console.error("Error fetching guardian picks:", error);
      res.status(500).json({ error: "Failed to fetch guardian picks" });
    }
  });

  app.post("/api/users/:userId/guardian-picks/refresh", async (req, res) => {
    try {
      const guidance = req.body?.guidance as string | undefined;
      await scoreGuardianPicksForUser(req.params.userId, undefined, guidance);
      const picks = await storage.getUserGuardianPicks(req.params.userId);
      res.json(picks);
    } catch (error) {
      console.error("Error refreshing guardian picks:", error);
      res.status(500).json({ error: "Failed to refresh guardian picks" });
    }
  });

  app.post("/api/users/:userId/guardian-picks/:pickId/action", async (req, res) => {
    try {
      const { action, rating } = req.body as {
        action: "add_to_watchlist" | "watched" | "rejected";
        rating?: "loved" | "ok" | "disliked";
      };
      const userId = req.params.userId;
      const pickId = req.params.pickId;
      const picks = await storage.getUserGuardianPicks(userId);
      const pick = picks.find((p) => p.id === pickId);
      if (!pick) return res.status(404).json({ error: "Pick not found" });

      const review = pick.review;
      if (action === "add_to_watchlist") {
        await storage.addToWatchlist({
          userId,
          title: review.title,
          mediaType: review.mediaType,
          year: review.year,
          recommendationReason: pick.reason,
        });
        await storage.updateUserGuardianPickStatus(pickId, "added_to_watchlist");
      } else if (action === "watched") {
        await storage.addToWatchHistory({
          userId,
          title: review.title,
          mediaType: review.mediaType,
          year: review.year,
          rating: rating || undefined,
        });
        await storage.updateUserGuardianPickStatus(pickId, "watched");
      } else if (action === "rejected") {
        await storage.addRejectedItem({
          userId,
          title: review.title,
          mediaType: review.mediaType,
          year: review.year,
          reason: req.body?.reason || "Not interested",
        });
        await storage.updateUserGuardianPickStatus(pickId, "rejected");
      }
      res.json({ success: true });
    } catch (error) {
      console.error("Error handling guardian pick action:", error);
      res.status(500).json({ error: "Failed to handle action" });
    }
  });

  // Admin: initial / backfill archive fetch (365 days)
  app.post("/api/admin/guardian-archive-backfill", async (req, res) => {
    const adminSecret = process.env.ADMIN_SECRET;
    if (adminSecret && req.headers["x-admin-key"] !== adminSecret) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    try {
      const days = req.body?.days ? parseInt(req.body.days as string, 10) : 365;
      const result = await fetchAndStoreGuardianArchive(days);
      res.json({ success: true, ...result });
    } catch (error) {
      console.error("Error backfilling archive:", error);
      res.status(500).json({ error: "Failed to backfill archive" });
    }
  });

  // === New For You ===

  app.get("/api/users/:userId/new-for-you", async (req, res) => {
    try {
      const mediaType = req.query.mediaType as "film" | "tv" | undefined;
      const picks = await storage.getUserPicks(req.params.userId, mediaType);
      res.json(picks);
    } catch (error) {
      console.error("Error fetching picks:", error);
      res.status(500).json({ error: "Failed to fetch picks" });
    }
  });

  app.post("/api/users/:userId/new-for-you/:pickId/action", async (req, res) => {
    try {
      const { action, rating } = req.body;
      const userId = req.params.userId;
      const pickId = req.params.pickId;

      // Get the pick to find the release details
      const picks = await storage.getUserPicks(userId);
      const pick = picks.find((p) => p.id === pickId);
      if (!pick) {
        return res.status(404).json({ error: "Pick not found" });
      }

      const release = pick.release;

      if (action === "add_to_watchlist") {
        await storage.addToWatchlist({
          userId,
          title: release.title,
          mediaType: release.mediaType,
          year: release.year,
          recommendationReason: pick.reason,
        });
        await storage.updateUserPickStatus(pickId, "added_to_watchlist");
      } else if (action === "watched") {
        await storage.addToWatchHistory({
          userId,
          title: release.title,
          mediaType: release.mediaType,
          year: release.year,
          rating: rating || undefined,
        });
        await storage.updateUserPickStatus(pickId, "watched");
      } else if (action === "rejected") {
        await storage.addRejectedItem({
          userId,
          title: release.title,
          mediaType: release.mediaType,
          year: release.year,
          reason: req.body.reason || "Not interested",
        });
        await storage.updateUserPickStatus(pickId, "rejected");
      }

      res.json({ success: true });
    } catch (error) {
      console.error("Error handling pick action:", error);
      res.status(500).json({ error: "Failed to handle action" });
    }
  });

  app.post("/api/users/:userId/new-for-you/refresh", async (req, res) => {
    try {
      const guidance = req.body.guidance as string | undefined;
      await scoreNewReleasesForUser(req.params.userId, undefined, undefined, guidance);
      const picks = await storage.getUserPicks(req.params.userId);
      res.json(picks);
    } catch (error) {
      console.error("Error refreshing picks:", error);
      res.status(500).json({ error: "Failed to refresh picks" });
    }
  });

  // Admin: add a single TMDB release manually (for titles that fell out of now_playing)
  app.post("/api/admin/add-release", async (req, res) => {
    const adminSecret = process.env.ADMIN_SECRET;
    if (adminSecret && req.headers["x-admin-key"] !== adminSecret) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    const { tmdbId, mediaType } = req.body as {
      tmdbId?: number;
      mediaType?: "film" | "tv";
    };
    if (!tmdbId || !mediaType) {
      return res.status(400).json({ error: "tmdbId and mediaType required" });
    }
    try {
      const result = await addTmdbRelease(tmdbId, mediaType);
      res.json({ success: true, ...result });
    } catch (error) {
      console.error("Error adding release:", error);
      res.status(500).json({ error: "Failed to add release", message: String(error) });
    }
  });

  // Admin: manually trigger the full daily job
  app.post("/api/admin/run-new-releases", async (req, res) => {
    const adminSecret = process.env.ADMIN_SECRET;
    if (adminSecret && req.headers["x-admin-key"] !== adminSecret) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    try {
      const result = await runDailyNewReleases();
      res.json({ success: true, ...result });
    } catch (error) {
      console.error("Error running new releases job:", error);
      res.status(500).json({ error: "Failed to run job" });
    }
  });
}
