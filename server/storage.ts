import { db } from "./db";
import { eq, desc, and } from "drizzle-orm";
import { randomUUID } from "crypto";
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
} from "@shared/schema";

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

  async addToWatchlist(data: InsertWatchlistItem): Promise<WatchlistItem> {
    const id = randomUUID();
    await db.insert(watchlist).values({ ...data, id });
    const [created] = await db.select().from(watchlist).where(eq(watchlist.id, id));
    return created;
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
};
