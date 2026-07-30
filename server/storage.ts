import { db } from "./db";
import { eq, desc, and, gte, sql } from "drizzle-orm";
import { randomUUID } from "crypto";
import bcrypt from "bcrypt";
import {
  users,
  genrePreferences,
  actorPreferences,
  directorPreferences,
  moodPreferences,
  favouriteTitles,
  watchHistory,
  rejectedItems,
  watchlist,
  recommendationLog,
  newReleases,
  userPicks,
  type User,
  type InsertUser,
  type GenrePreference,
  type InsertGenrePreference,
  type ActorPreference,
  type InsertActorPreference,
  type DirectorPreference,
  type InsertDirectorPreference,
  type MoodPreference,
  type InsertMoodPreference,
  type FavouriteTitle,
  type InsertFavouriteTitle,
  type WatchHistoryItem,
  type InsertWatchHistoryItem,
  type RejectedItem,
  type InsertRejectedItem,
  type WatchlistItem,
  type InsertWatchlistItem,
  type RecommendationLogItem,
  type InsertRecommendationLogItem,
  type NewRelease,
  type InsertNewRelease,
  type UserPick,
  type InsertUserPick,
  guardianReviews,
  userGuardianPicks,
  type GuardianReview,
  type InsertGuardianReview,
  type UserGuardianPick,
  type InsertUserGuardianPick,
} from "@shared/schema";

const SALT_ROUNDS = 10;

export const storage = {
  // Users
  async createUser(): Promise<User> {
    const id = randomUUID();
    await db.insert(users).values({ id });
    const [created] = await db.select().from(users).where(eq(users.id, id));
    return created;
  },

  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  },

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email.toLowerCase()));
    return user;
  },

  async registerUser(email: string, password: string): Promise<User> {
    const id = randomUUID();
    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
    await db.insert(users).values({
      id,
      email: email.toLowerCase(),
      passwordHash
    });
    const [created] = await db.select().from(users).where(eq(users.id, id));
    return created;
  },

  async verifyPassword(user: User, password: string): Promise<boolean> {
    if (!user.passwordHash) return false;
    return bcrypt.compare(password, user.passwordHash);
  },

  async linkEmailToUser(userId: string, email: string, password: string): Promise<User> {
    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
    await db.update(users).set({
      email: email.toLowerCase(),
      passwordHash
    }).where(eq(users.id, userId));
    const [updated] = await db.select().from(users).where(eq(users.id, userId));
    return updated;
  },

  async completeOnboarding(userId: string): Promise<void> {
    await db.update(users).set({ onboardingComplete: 1 }).where(eq(users.id, userId));
  },

  // Genre Preferences
  async getGenrePreferences(userId: string): Promise<GenrePreference[]> {
    return db.select().from(genrePreferences).where(eq(genrePreferences.userId, userId));
  },

  async setGenrePreference(data: InsertGenrePreference): Promise<GenrePreference> {
    // Check if exists
    const [existing] = await db
      .select()
      .from(genrePreferences)
      .where(and(eq(genrePreferences.userId, data.userId), eq(genrePreferences.genre, data.genre)));

    if (existing) {
      await db
        .update(genrePreferences)
        .set({ rating: data.rating })
        .where(eq(genrePreferences.id, existing.id));
      return { ...existing, rating: data.rating };
    }

    const id = randomUUID();
    await db.insert(genrePreferences).values({ ...data, id });
    const [created] = await db.select().from(genrePreferences).where(eq(genrePreferences.id, id));
    return created;
  },

  // Actor Preferences
  async getActorPreferences(userId: string): Promise<ActorPreference[]> {
    return db.select().from(actorPreferences).where(eq(actorPreferences.userId, userId));
  },

  async addActorPreference(data: InsertActorPreference): Promise<ActorPreference> {
    const id = randomUUID();
    await db.insert(actorPreferences).values({ ...data, id });
    const [created] = await db.select().from(actorPreferences).where(eq(actorPreferences.id, id));
    return created;
  },

  async deleteActorPreference(id: string): Promise<void> {
    await db.delete(actorPreferences).where(eq(actorPreferences.id, id));
  },

  // Director Preferences
  async getDirectorPreferences(userId: string): Promise<DirectorPreference[]> {
    return db.select().from(directorPreferences).where(eq(directorPreferences.userId, userId));
  },

  async addDirectorPreference(data: InsertDirectorPreference): Promise<DirectorPreference> {
    const id = randomUUID();
    await db.insert(directorPreferences).values({ ...data, id });
    const [created] = await db.select().from(directorPreferences).where(eq(directorPreferences.id, id));
    return created;
  },

  async deleteDirectorPreference(id: string): Promise<void> {
    await db.delete(directorPreferences).where(eq(directorPreferences.id, id));
  },

  // Mood Preferences
  async getMoodPreferences(userId: string): Promise<MoodPreference[]> {
    return db.select().from(moodPreferences).where(eq(moodPreferences.userId, userId));
  },

  async setMoodPreference(data: InsertMoodPreference): Promise<MoodPreference> {
    const [existing] = await db
      .select()
      .from(moodPreferences)
      .where(and(eq(moodPreferences.userId, data.userId), eq(moodPreferences.mood, data.mood)));

    if (existing) {
      await db
        .update(moodPreferences)
        .set({ rating: data.rating })
        .where(eq(moodPreferences.id, existing.id));
      return { ...existing, rating: data.rating };
    }

    const id = randomUUID();
    await db.insert(moodPreferences).values({ ...data, id });
    const [created] = await db.select().from(moodPreferences).where(eq(moodPreferences.id, id));
    return created;
  },

  // Favourite Titles
  async getFavouriteTitles(userId: string): Promise<FavouriteTitle[]> {
    return db.select().from(favouriteTitles).where(eq(favouriteTitles.userId, userId));
  },

  async addFavouriteTitle(data: InsertFavouriteTitle): Promise<FavouriteTitle> {
    const id = randomUUID();
    await db.insert(favouriteTitles).values({ ...data, id });
    const [created] = await db.select().from(favouriteTitles).where(eq(favouriteTitles.id, id));
    return created;
  },

  async deleteFavouriteTitle(id: string): Promise<void> {
    await db.delete(favouriteTitles).where(eq(favouriteTitles.id, id));
  },

  // Watch History
  async getWatchHistory(userId: string): Promise<WatchHistoryItem[]> {
    return db
      .select()
      .from(watchHistory)
      .where(eq(watchHistory.userId, userId))
      .orderBy(desc(watchHistory.watchedDate));
  },

  async addToWatchHistory(data: InsertWatchHistoryItem): Promise<WatchHistoryItem> {
    const id = randomUUID();
    await db.insert(watchHistory).values({ ...data, id });
    const [created] = await db.select().from(watchHistory).where(eq(watchHistory.id, id));

    // A "loved" watch is the strongest taste signal we get — promote it to
    // favourites so the Favourites tab and the taste profile keep learning.
    if (data.rating === "loved" && data.userId && data.title) {
      try {
        const existing = await this.getFavouriteTitles(data.userId);
        const already = existing.some(
          (f) => f.title.toLowerCase() === data.title!.toLowerCase()
        );
        if (!already) {
          await this.addFavouriteTitle({
            userId: data.userId,
            title: data.title,
            mediaType: data.mediaType || "film",
            year: data.year ?? null,
            reason: "Loved it when watched",
          });
        }
      } catch (err) {
        console.error("Failed to promote loved watch to favourites:", err);
      }
    }

    return created;
  },

  async updateWatchHistoryRating(id: string, rating: "loved" | "ok" | "disliked"): Promise<void> {
    await db.update(watchHistory).set({ rating }).where(eq(watchHistory.id, id));
  },

  // Rejected Items
  async getRejectedItems(userId: string): Promise<RejectedItem[]> {
    return db.select().from(rejectedItems).where(eq(rejectedItems.userId, userId));
  },

  async addRejectedItem(data: InsertRejectedItem): Promise<RejectedItem> {
    const id = randomUUID();
    await db.insert(rejectedItems).values({ ...data, id });
    const [created] = await db.select().from(rejectedItems).where(eq(rejectedItems.id, id));
    return created;
  },

  // Watchlist
  async getWatchlist(userId: string): Promise<WatchlistItem[]> {
    return db
      .select()
      .from(watchlist)
      .where(eq(watchlist.userId, userId))
      .orderBy(desc(watchlist.priority), desc(watchlist.addedDate));
  },

  async getEnrichedWatchlist(userId: string): Promise<Array<WatchlistItem & { release?: NewRelease }>> {
    const items = await this.getWatchlist(userId);
    const allReleases = await db.select().from(newReleases);

    // Build a lookup by lowercase title
    const releaseMap = new Map<string, NewRelease>();
    for (const r of allReleases) {
      releaseMap.set(r.title.toLowerCase(), r);
    }

    // Collect items that need TMDB lookup
    const unmatched = items.filter((item) => !releaseMap.has(item.title.toLowerCase()));
    if (unmatched.length > 0) {
      // Lazy import to avoid circular deps
      const { searchTitle, fetchTitleDetails } = await import("./tmdb");
      for (const item of unmatched) {
        try {
          const result = await searchTitle(item.title, item.year, item.mediaType);
          if (!result) continue;

          const details = await fetchTitleDetails(result.tmdbId, item.mediaType);

          // Cache in new_releases for next time
          await this.upsertNewRelease({
            tmdbId: result.tmdbId,
            imdbId: details.imdbId || null,
            title: item.title,
            mediaType: item.mediaType,
            year: item.year,
            overview: null,
            genres: details.genres,
            posterPath: result.posterPath,
            tmdbRating: null,
            cast: details.cast,
            directors: details.directors,
            streamingUk: details.streamingUk,
            trailerKey: details.trailerKey || result.trailerKey,
          });

          // Fetch the newly inserted release
          const release = await this.getNewReleaseByTmdbId(result.tmdbId);
          if (release) {
            releaseMap.set(item.title.toLowerCase(), release);
          }
        } catch (err) {
          console.error(`Failed to enrich watchlist item "${item.title}":`, err);
        }
      }
    }

    return items.map((item) => {
      const release = releaseMap.get(item.title.toLowerCase());
      return release ? { ...item, release } : item;
    });
  },

  async addToWatchlist(data: InsertWatchlistItem): Promise<WatchlistItem> {
    const id = randomUUID();
    await db.insert(watchlist).values({ ...data, id });
    const [created] = await db.select().from(watchlist).where(eq(watchlist.id, id));
    return created;
  },

  async getWatchlistItemById(id: string): Promise<WatchlistItem | undefined> {
    const [item] = await db.select().from(watchlist).where(eq(watchlist.id, id));
    return item;
  },

  async removeFromWatchlist(id: string): Promise<void> {
    await db.delete(watchlist).where(eq(watchlist.id, id));
  },

  async updateWatchlistPriority(id: string, priority: number): Promise<void> {
    await db.update(watchlist).set({ priority }).where(eq(watchlist.id, id));
  },

  // Recommendation Log
  async getRecommendationLog(userId: string): Promise<RecommendationLogItem[]> {
    return db
      .select()
      .from(recommendationLog)
      .where(eq(recommendationLog.userId, userId))
      .orderBy(desc(recommendationLog.createdAt));
  },

  async logRecommendation(data: InsertRecommendationLogItem): Promise<RecommendationLogItem> {
    const id = randomUUID();
    await db.insert(recommendationLog).values({ ...data, id });
    const [created] = await db.select().from(recommendationLog).where(eq(recommendationLog.id, id));
    return created;
  },

  async updateRecommendationOutcome(
    id: string,
    outcome: "added_to_watchlist" | "watched" | "rejected" | "no_action"
  ): Promise<void> {
    await db.update(recommendationLog).set({ outcome }).where(eq(recommendationLog.id, id));
  },

  // Get full user profile for recommendations
  async getUserProfile(userId: string) {
    const [user, genres, actors, directors, moods, favourites, history, rejected] = await Promise.all([
      this.getUser(userId),
      this.getGenrePreferences(userId),
      this.getActorPreferences(userId),
      this.getDirectorPreferences(userId),
      this.getMoodPreferences(userId),
      this.getFavouriteTitles(userId),
      this.getWatchHistory(userId),
      this.getRejectedItems(userId),
    ]);

    return {
      user,
      genres,
      actors,
      directors,
      moods,
      favourites,
      history,
      rejected,
    };
  },

  // New Releases
  async upsertNewRelease(data: Omit<InsertNewRelease, "id">): Promise<void> {
    const [existing] = await db
      .select()
      .from(newReleases)
      .where(eq(newReleases.tmdbId, data.tmdbId!));

    if (existing) {
      await db.update(newReleases).set(data).where(eq(newReleases.id, existing.id));
    } else {
      const id = randomUUID();
      await db.insert(newReleases).values({ ...data, id });
    }
  },

  async getRecentNewReleases(daysBack = 14): Promise<NewRelease[]> {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - daysBack);
    return db
      .select()
      .from(newReleases)
      .where(gte(newReleases.fetchedDate, cutoff))
      .orderBy(desc(newReleases.fetchedDate));
  },

  async getNewReleaseById(id: string): Promise<NewRelease | undefined> {
    const [release] = await db.select().from(newReleases).where(eq(newReleases.id, id));
    return release;
  },

  async getNewReleaseByTmdbId(tmdbId: number): Promise<NewRelease | undefined> {
    const [release] = await db.select().from(newReleases).where(eq(newReleases.tmdbId, tmdbId));
    return release;
  },

  async cleanOldReleases(daysOld = 30): Promise<void> {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - daysOld);
    await db.delete(newReleases).where(sql`${newReleases.fetchedDate} < ${cutoff}`);
  },

  // User Picks
  async getUserPicks(userId: string, mediaTypeFilter?: "film" | "tv"): Promise<Array<UserPick & { release: NewRelease }>> {
    const picks = await db
      .select()
      .from(userPicks)
      .where(and(eq(userPicks.userId, userId), eq(userPicks.status, "new")))
      .orderBy(desc(userPicks.relevanceScore));

    const results: Array<UserPick & { release: NewRelease }> = [];
    for (const pick of picks) {
      const release = await this.getNewReleaseById(pick.releaseId);
      if (!release) continue;
      if (mediaTypeFilter && release.mediaType !== mediaTypeFilter) continue;
      results.push({ ...pick, release });
    }
    return results;
  },

  async updateUserPickStatus(
    id: string,
    status: "added_to_watchlist" | "watched" | "rejected"
  ): Promise<void> {
    await db.update(userPicks).set({ status }).where(eq(userPicks.id, id));
  },

  async deleteStaleUserPicks(userId: string): Promise<void> {
    await db
      .delete(userPicks)
      .where(and(eq(userPicks.userId, userId), eq(userPicks.status, "new")));
  },

  async insertUserPick(data: Omit<InsertUserPick, "id">): Promise<void> {
    const [existing] = await db
      .select()
      .from(userPicks)
      .where(and(eq(userPicks.userId, data.userId!), eq(userPicks.releaseId, data.releaseId!)));
    if (existing) return;

    const id = randomUUID();
    await db.insert(userPicks).values({ ...data, id });
  },

  async getAllUsers(): Promise<User[]> {
    return db.select().from(users);
  },

  async getRecommendationStats(userId: string) {
    const log = await db
      .select()
      .from(recommendationLog)
      .where(eq(recommendationLog.userId, userId));

    const total = log.length;
    const addedToWatchlist = log.filter((r) => r.outcome === "added_to_watchlist").length;
    const watched = log.filter((r) => r.outcome === "watched").length;
    const rejected = log.filter((r) => r.outcome === "rejected").length;
    const noAction = log.filter((r) => r.outcome === "no_action" || !r.outcome).length;

    return {
      total,
      addedToWatchlist,
      watched,
      rejected,
      noAction,
      watchlistRate: total > 0 ? Math.round((addedToWatchlist / total) * 100) : 0,
      watchedRate: total > 0 ? Math.round((watched / total) * 100) : 0,
      rejectedRate: total > 0 ? Math.round((rejected / total) * 100) : 0,
    };
  },

  // --- Guardian archive ---

  async upsertGuardianReview(data: Omit<InsertGuardianReview, "id">): Promise<string> {
    const [existing] = await db
      .select()
      .from(guardianReviews)
      .where(eq(guardianReviews.url, data.url!));
    if (existing) {
      await db.update(guardianReviews).set(data).where(eq(guardianReviews.id, existing.id));
      return existing.id;
    }
    const id = randomUUID();
    await db.insert(guardianReviews).values({ ...data, id });
    return id;
  },

  async getRecentGuardianReviews(daysBack = 60, limit = 50): Promise<GuardianReview[]> {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - daysBack);
    const cutoffStr = cutoff.toISOString().split("T")[0];
    return db
      .select()
      .from(guardianReviews)
      .where(sql`${guardianReviews.publishedDate} >= ${cutoffStr}`)
      .orderBy(desc(guardianReviews.publishedDate))
      .limit(limit);
  },

  async getGuardianReviewsForScoring(daysBack = 365): Promise<GuardianReview[]> {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - daysBack);
    const cutoffStr = cutoff.toISOString().split("T")[0];
    return db
      .select()
      .from(guardianReviews)
      .where(sql`${guardianReviews.publishedDate} >= ${cutoffStr}`)
      .orderBy(desc(guardianReviews.publishedDate));
  },

  async getGuardianReviewById(id: string): Promise<GuardianReview | undefined> {
    const [r] = await db.select().from(guardianReviews).where(eq(guardianReviews.id, id));
    return r;
  },

  async getStreamingProviders(): Promise<string[]> {
    // Distinct provider names across new_releases + guardian_reviews. Returned
    // sorted alphabetically. Both tables store streamingUk as JSON arrays of
    // { provider, logoPath, type }, so unpack and dedupe.
    const rows1 = await db
      .select({ s: newReleases.streamingUk })
      .from(newReleases)
      .where(sql`${newReleases.streamingUk} IS NOT NULL`);
    const rows2 = await db
      .select({ s: guardianReviews.streamingUk })
      .from(guardianReviews)
      .where(sql`${guardianReviews.streamingUk} IS NOT NULL`);

    const set = new Set<string>();
    for (const row of [...rows1, ...rows2]) {
      const s = row.s as Array<{ provider?: string }> | null;
      if (!Array.isArray(s)) continue;
      for (const p of s) if (p?.provider) set.add(p.provider);
    }
    return [...set].sort((a, b) => a.localeCompare(b));
  },

  async cleanOldGuardianReviews(daysOld = 400): Promise<void> {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - daysOld);
    const cutoffStr = cutoff.toISOString().split("T")[0];
    await db
      .delete(guardianReviews)
      .where(sql`${guardianReviews.publishedDate} < ${cutoffStr}`);
  },

  // --- User Guardian picks ---

  async insertUserGuardianPick(data: Omit<InsertUserGuardianPick, "id">): Promise<void> {
    // Never create a second pick for a review the user already has (any
    // status) — an actioned pick must not resurface as "new".
    const [existing] = await db
      .select()
      .from(userGuardianPicks)
      .where(
        and(
          eq(userGuardianPicks.userId, data.userId!),
          eq(userGuardianPicks.reviewId, data.reviewId!)
        )
      );
    if (existing) return;

    const id = randomUUID();
    await db.insert(userGuardianPicks).values({ ...data, id });
  },

  async deleteStaleUserGuardianPicks(userId: string): Promise<void> {
    await db
      .delete(userGuardianPicks)
      .where(and(eq(userGuardianPicks.userId, userId), eq(userGuardianPicks.status, "new")));
  },

  async getUserGuardianPicks(
    userId: string
  ): Promise<Array<UserGuardianPick & { review: GuardianReview }>> {
    const picks = await db
      .select()
      .from(userGuardianPicks)
      .where(and(eq(userGuardianPicks.userId, userId), eq(userGuardianPicks.status, "new")))
      .orderBy(desc(userGuardianPicks.relevanceScore));

    const results: Array<UserGuardianPick & { review: GuardianReview }> = [];
    for (const pick of picks) {
      const [review] = await db
        .select()
        .from(guardianReviews)
        .where(eq(guardianReviews.id, pick.reviewId));
      if (!review) continue;
      results.push({ ...pick, review });
    }
    return results;
  },

  async updateUserGuardianPickStatus(
    id: string,
    status: "new" | "added_to_watchlist" | "watched" | "rejected"
  ): Promise<void> {
    await db.update(userGuardianPicks).set({ status }).where(eq(userGuardianPicks.id, id));
  },
};
