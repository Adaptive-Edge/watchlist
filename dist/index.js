var __defProp = Object.defineProperty;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __esm = (fn, res) => function __init() {
  return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
};
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// server/tmdb.ts
var tmdb_exports = {};
__export(tmdb_exports, {
  buildPosterUrl: () => buildPosterUrl,
  enrichReleases: () => enrichReleases,
  fetchNewReleases: () => fetchNewReleases,
  fetchTitleDetails: () => fetchTitleDetails,
  searchTitle: () => searchTitle
});
function apiKey() {
  const key = process.env.TMDB_API_KEY;
  if (!key) throw new Error("TMDB_API_KEY not set");
  return key;
}
async function tmdbGet(path2, params = {}) {
  const url = new URL(`${TMDB_BASE}${path2}`);
  url.searchParams.set("api_key", apiKey());
  url.searchParams.set("language", "en-GB");
  for (const [k, v] of Object.entries(params)) {
    url.searchParams.set(k, v);
  }
  const res = await fetch(url.toString());
  if (!res.ok) {
    throw new Error(`TMDB ${path2} failed: ${res.status} ${res.statusText}`);
  }
  return res.json();
}
async function fetchNewReleases() {
  const seen = /* @__PURE__ */ new Set();
  const results = [];
  const cinemaTmdbIds = /* @__PURE__ */ new Set();
  const endpoints = [
    { path: "/movie/now_playing", type: "film", params: { region: "GB" }, cinema: true },
    { path: "/movie/upcoming", type: "film", params: { region: "GB" }, cinema: false },
    { path: "/tv/airing_today", type: "tv", params: {}, cinema: false },
    { path: "/tv/on_the_air", type: "tv", params: {}, cinema: false }
  ];
  for (const ep of endpoints) {
    try {
      const data = await tmdbGet(ep.path, ep.params);
      for (const item of data.results || []) {
        if (ep.cinema) cinemaTmdbIds.add(item.id);
        const key = `${ep.type}-${item.id}`;
        if (seen.has(key)) continue;
        seen.add(key);
        const title = item.title || item.name || "";
        const date = item.release_date || item.first_air_date || null;
        const year = date ? parseInt(date.substring(0, 4)) : null;
        results.push({
          tmdbId: item.id,
          title,
          mediaType: ep.type,
          year,
          releaseDate: date,
          overview: item.overview || "",
          posterPath: item.poster_path || null,
          tmdbRating: (item.vote_average || 0).toFixed(1),
          genreIds: item.genre_ids || [],
          inCinemas: cinemaTmdbIds.has(item.id)
        });
      }
    } catch (err) {
      console.error(`Failed to fetch ${ep.path}:`, err);
    }
  }
  return results;
}
async function fetchTitleDetails(tmdbId, mediaType) {
  const type = mediaType === "film" ? "movie" : "tv";
  const data = await tmdbGet(`/${type}/${tmdbId}`, {
    append_to_response: "credits,watch/providers,videos,external_ids"
  });
  const genres = (data.genres || []).map((g) => g.name);
  const credits = data.credits || {};
  const cast = (credits.cast || []).slice(0, 5).map((c) => c.name);
  let directors;
  if (mediaType === "film") {
    directors = (credits.crew || []).filter((c) => c.job === "Director").map((c) => c.name);
  } else {
    directors = (data.created_by || []).map((c) => c.name);
  }
  const gbProviders = data["watch/providers"]?.results?.GB || {};
  const flatrate = (gbProviders.flatrate || []).map((p) => ({
    provider: p.provider_name,
    logoPath: p.logo_path,
    type: "stream"
  }));
  const rent = (gbProviders.rent || []).map((p) => ({
    provider: p.provider_name,
    logoPath: p.logo_path,
    type: "rent"
  }));
  const buy = (gbProviders.buy || []).map((p) => ({
    provider: p.provider_name,
    logoPath: p.logo_path,
    type: "buy"
  }));
  const streamingUk = [...flatrate, ...rent.slice(0, 3), ...buy.slice(0, 3)];
  const trailerKey = extractTrailerKey(data.videos?.results || []);
  const imdbId = data.imdb_id || data.external_ids?.imdb_id || null;
  return { genres, cast, directors, streamingUk, trailerKey, imdbId };
}
function extractTrailerKey(videos) {
  const trailer = videos.find(
    (v) => v.site === "YouTube" && v.type === "Trailer" && v.official
  ) || videos.find(
    (v) => v.site === "YouTube" && v.type === "Trailer"
  ) || videos.find(
    (v) => v.site === "YouTube" && v.type === "Teaser"
  );
  return trailer?.key || null;
}
async function searchTitle(title, year, mediaType) {
  try {
    const type = mediaType === "film" ? "movie" : "tv";
    const params = { query: title };
    if (year) params.year = year.toString();
    const data = await tmdbGet(`/search/${type}`, params);
    const first = data.results?.[0];
    if (!first) return null;
    let trailerKey = null;
    try {
      const videos = await tmdbGet(`/${type}/${first.id}/videos`);
      trailerKey = extractTrailerKey(videos.results || []);
    } catch {
    }
    return {
      tmdbId: first.id,
      posterPath: first.poster_path || null,
      trailerKey
    };
  } catch {
    return null;
  }
}
function buildPosterUrl(posterPath, size = "w300") {
  return `${TMDB_IMAGE_BASE}/${size}${posterPath}`;
}
async function enrichReleases(rawTitles) {
  const results = [];
  const CONCURRENCY = 10;
  for (let i = 0; i < rawTitles.length; i += CONCURRENCY) {
    const batch = rawTitles.slice(i, i + CONCURRENCY);
    const details = await Promise.all(
      batch.map(async (title) => {
        try {
          const detail = await fetchTitleDetails(title.tmdbId, title.mediaType);
          return { ...title, ...detail };
        } catch (err) {
          console.error(`Failed to fetch details for ${title.title}:`, err);
          return {
            ...title,
            genres: [],
            cast: [],
            directors: [],
            streamingUk: [],
            trailerKey: null,
            imdbId: null,
            inCinemas: title.inCinemas
          };
        }
      })
    );
    results.push(...details);
  }
  return results;
}
var TMDB_BASE, TMDB_IMAGE_BASE;
var init_tmdb = __esm({
  "server/tmdb.ts"() {
    "use strict";
    TMDB_BASE = "https://api.themoviedb.org/3";
    TMDB_IMAGE_BASE = "https://image.tmdb.org/t/p";
  }
});

// server/index.ts
import express from "express";
import session from "express-session";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";

// server/db.ts
import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";

// shared/schema.ts
var schema_exports = {};
__export(schema_exports, {
  actorPreferences: () => actorPreferences,
  directorPreferences: () => directorPreferences,
  favouriteTitles: () => favouriteTitles,
  genrePreferences: () => genrePreferences,
  guardianReviews: () => guardianReviews,
  moodPreferences: () => moodPreferences,
  newReleases: () => newReleases,
  recommendationLog: () => recommendationLog,
  rejectedItems: () => rejectedItems,
  userGuardianPicks: () => userGuardianPicks,
  userPicks: () => userPicks,
  users: () => users,
  watchHistory: () => watchHistory,
  watchlist: () => watchlist
});
import { mysqlTable, text, varchar, int, timestamp, mysqlEnum, json } from "drizzle-orm/mysql-core";
import { sql } from "drizzle-orm";
var users = mysqlTable("users", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`(UUID())`),
  email: varchar("email", { length: 255 }).unique(),
  passwordHash: varchar("password_hash", { length: 255 }),
  createdAt: timestamp("created_at").defaultNow(),
  onboardingComplete: int("onboarding_complete").default(0)
});
var genrePreferences = mysqlTable("genre_preferences", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`(UUID())`),
  userId: varchar("user_id", { length: 36 }).notNull(),
  genre: varchar("genre", { length: 100 }).notNull(),
  rating: int("rating").notNull().default(3),
  // 1-5 scale
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow()
});
var actorPreferences = mysqlTable("actor_preferences", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`(UUID())`),
  userId: varchar("user_id", { length: 36 }).notNull(),
  actorName: varchar("actor_name", { length: 255 }).notNull(),
  rating: int("rating").notNull().default(3),
  createdAt: timestamp("created_at").defaultNow()
});
var directorPreferences = mysqlTable("director_preferences", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`(UUID())`),
  userId: varchar("user_id", { length: 36 }).notNull(),
  directorName: varchar("director_name", { length: 255 }).notNull(),
  rating: int("rating").notNull().default(3),
  createdAt: timestamp("created_at").defaultNow()
});
var moodPreferences = mysqlTable("mood_preferences", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`(UUID())`),
  userId: varchar("user_id", { length: 36 }).notNull(),
  mood: varchar("mood", { length: 100 }).notNull(),
  // e.g., "relaxing", "intense", "thought-provoking"
  rating: int("rating").notNull().default(3),
  createdAt: timestamp("created_at").defaultNow()
});
var favouriteTitles = mysqlTable("favourite_titles", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`(UUID())`),
  userId: varchar("user_id", { length: 36 }).notNull(),
  title: varchar("title", { length: 500 }).notNull(),
  mediaType: mysqlEnum("media_type", ["film", "tv"]).notNull(),
  year: int("year"),
  reason: text("reason"),
  // Why they love it
  createdAt: timestamp("created_at").defaultNow()
});
var watchHistory = mysqlTable("watch_history", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`(UUID())`),
  userId: varchar("user_id", { length: 36 }).notNull(),
  title: varchar("title", { length: 500 }).notNull(),
  mediaType: mysqlEnum("media_type", ["film", "tv"]).notNull(),
  year: int("year"),
  watchedDate: timestamp("watched_date").defaultNow(),
  rating: mysqlEnum("rating", ["loved", "ok", "disliked"]),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow()
});
var rejectedItems = mysqlTable("rejected_items", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`(UUID())`),
  userId: varchar("user_id", { length: 36 }).notNull(),
  title: varchar("title", { length: 500 }).notNull(),
  mediaType: mysqlEnum("media_type", ["film", "tv"]).notNull(),
  year: int("year"),
  reason: text("reason"),
  // Why they're not interested
  createdAt: timestamp("created_at").defaultNow()
});
var watchlist = mysqlTable("watchlist", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`(UUID())`),
  userId: varchar("user_id", { length: 36 }).notNull(),
  title: varchar("title", { length: 500 }).notNull(),
  mediaType: mysqlEnum("media_type", ["film", "tv"]).notNull(),
  year: int("year"),
  priority: int("priority").default(0),
  // Higher = more important
  recommendationReason: text("recommendation_reason"),
  // Why we recommended it
  addedDate: timestamp("added_date").defaultNow(),
  createdAt: timestamp("created_at").defaultNow()
});
var recommendationLog = mysqlTable("recommendation_log", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`(UUID())`),
  userId: varchar("user_id", { length: 36 }).notNull(),
  title: varchar("title", { length: 500 }).notNull(),
  mediaType: mysqlEnum("media_type", ["film", "tv"]).notNull(),
  year: int("year"),
  reason: text("reason"),
  prompt: text("prompt"),
  // The prompt used to generate this recommendation
  outcome: mysqlEnum("outcome", ["added_to_watchlist", "watched", "rejected", "no_action"]),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow()
});
var newReleases = mysqlTable("new_releases", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`(UUID())`),
  tmdbId: int("tmdb_id").notNull().unique(),
  imdbId: varchar("imdb_id", { length: 20 }),
  title: varchar("title", { length: 500 }).notNull(),
  mediaType: mysqlEnum("media_type", ["film", "tv"]).notNull(),
  year: int("year"),
  releaseDate: varchar("release_date", { length: 20 }),
  overview: text("overview"),
  genres: json("genres"),
  // string[]
  posterPath: varchar("poster_path", { length: 500 }),
  tmdbRating: varchar("tmdb_rating", { length: 10 }),
  cast: json("cast"),
  // string[] (top 5)
  directors: json("directors"),
  // string[]
  streamingUk: json("streaming_uk"),
  // { provider: string, logoPath: string }[]
  trailerKey: varchar("trailer_key", { length: 50 }),
  inCinemas: int("in_cinemas").default(0),
  guardianUrl: varchar("guardian_url", { length: 1e3 }),
  guardianRating: int("guardian_rating"),
  // 1-5 stars
  guardianExcerpt: text("guardian_excerpt"),
  guardianBody: text("guardian_body"),
  fetchedDate: timestamp("fetched_date").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow()
});
var guardianReviews = mysqlTable("guardian_reviews", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`(UUID())`),
  url: varchar("url", { length: 500 }).notNull().unique(),
  title: varchar("title", { length: 500 }).notNull(),
  section: varchar("section", { length: 50 }),
  // 'film' | 'tv-and-radio'
  mediaType: mysqlEnum("media_type", ["film", "tv"]).notNull(),
  starRating: int("star_rating"),
  excerpt: text("excerpt"),
  body: text("body"),
  publishedDate: varchar("published_date", { length: 20 }),
  // TMDB enrichment (optional — null when we can't find a match)
  tmdbId: int("tmdb_id"),
  imdbId: varchar("imdb_id", { length: 20 }),
  year: int("year"),
  posterPath: varchar("poster_path", { length: 500 }),
  tmdbRating: varchar("tmdb_rating", { length: 10 }),
  genres: json("genres"),
  cast: json("cast"),
  directors: json("directors"),
  trailerKey: varchar("trailer_key", { length: 50 }),
  streamingUk: json("streaming_uk"),
  fetchedDate: timestamp("fetched_date").defaultNow(),
  createdAt: timestamp("created_at").defaultNow()
});
var userGuardianPicks = mysqlTable("user_guardian_picks", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`(UUID())`),
  userId: varchar("user_id", { length: 36 }).notNull(),
  reviewId: varchar("review_id", { length: 36 }).notNull(),
  relevanceScore: int("relevance_score"),
  reason: text("reason"),
  status: mysqlEnum("status", ["new", "added_to_watchlist", "watched", "rejected"]).default("new"),
  batchDate: varchar("batch_date", { length: 20 }),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow()
});
var userPicks = mysqlTable("user_picks", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`(UUID())`),
  userId: varchar("user_id", { length: 36 }).notNull(),
  releaseId: varchar("release_id", { length: 36 }).notNull(),
  relevanceScore: int("relevance_score"),
  reason: text("reason"),
  status: mysqlEnum("status", ["new", "added_to_watchlist", "watched", "rejected"]).default("new"),
  batchDate: varchar("batch_date", { length: 20 }),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow()
});

// server/db.ts
var pool = mysql.createPool({
  host: process.env.DB_HOST || "localhost",
  user: process.env.DB_USER || "admin",
  password: process.env.DB_PASSWORD || "",
  database: process.env.DB_NAME || "watchlist",
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  enableKeepAlive: true,
  keepAliveInitialDelay: 1e4
});
var db = drizzle(pool, { schema: schema_exports, mode: "default" });

// server/storage.ts
import { eq, desc, and, gte, sql as sql2 } from "drizzle-orm";
import { randomUUID } from "crypto";
import bcrypt from "bcrypt";
var SALT_ROUNDS = 10;
var storage = {
  // Users
  async createUser() {
    const id = randomUUID();
    await db.insert(users).values({ id });
    const [created] = await db.select().from(users).where(eq(users.id, id));
    return created;
  },
  async getUser(id) {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  },
  async getUserByEmail(email) {
    const [user] = await db.select().from(users).where(eq(users.email, email.toLowerCase()));
    return user;
  },
  async registerUser(email, password) {
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
  async verifyPassword(user, password) {
    if (!user.passwordHash) return false;
    return bcrypt.compare(password, user.passwordHash);
  },
  async linkEmailToUser(userId, email, password) {
    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
    await db.update(users).set({
      email: email.toLowerCase(),
      passwordHash
    }).where(eq(users.id, userId));
    const [updated] = await db.select().from(users).where(eq(users.id, userId));
    return updated;
  },
  async completeOnboarding(userId) {
    await db.update(users).set({ onboardingComplete: 1 }).where(eq(users.id, userId));
  },
  // Genre Preferences
  async getGenrePreferences(userId) {
    return db.select().from(genrePreferences).where(eq(genrePreferences.userId, userId));
  },
  async setGenrePreference(data) {
    const [existing] = await db.select().from(genrePreferences).where(and(eq(genrePreferences.userId, data.userId), eq(genrePreferences.genre, data.genre)));
    if (existing) {
      await db.update(genrePreferences).set({ rating: data.rating }).where(eq(genrePreferences.id, existing.id));
      return { ...existing, rating: data.rating };
    }
    const id = randomUUID();
    await db.insert(genrePreferences).values({ ...data, id });
    const [created] = await db.select().from(genrePreferences).where(eq(genrePreferences.id, id));
    return created;
  },
  // Actor Preferences
  async getActorPreferences(userId) {
    return db.select().from(actorPreferences).where(eq(actorPreferences.userId, userId));
  },
  async addActorPreference(data) {
    const id = randomUUID();
    await db.insert(actorPreferences).values({ ...data, id });
    const [created] = await db.select().from(actorPreferences).where(eq(actorPreferences.id, id));
    return created;
  },
  async deleteActorPreference(id) {
    await db.delete(actorPreferences).where(eq(actorPreferences.id, id));
  },
  // Director Preferences
  async getDirectorPreferences(userId) {
    return db.select().from(directorPreferences).where(eq(directorPreferences.userId, userId));
  },
  async addDirectorPreference(data) {
    const id = randomUUID();
    await db.insert(directorPreferences).values({ ...data, id });
    const [created] = await db.select().from(directorPreferences).where(eq(directorPreferences.id, id));
    return created;
  },
  async deleteDirectorPreference(id) {
    await db.delete(directorPreferences).where(eq(directorPreferences.id, id));
  },
  // Mood Preferences
  async getMoodPreferences(userId) {
    return db.select().from(moodPreferences).where(eq(moodPreferences.userId, userId));
  },
  async setMoodPreference(data) {
    const [existing] = await db.select().from(moodPreferences).where(and(eq(moodPreferences.userId, data.userId), eq(moodPreferences.mood, data.mood)));
    if (existing) {
      await db.update(moodPreferences).set({ rating: data.rating }).where(eq(moodPreferences.id, existing.id));
      return { ...existing, rating: data.rating };
    }
    const id = randomUUID();
    await db.insert(moodPreferences).values({ ...data, id });
    const [created] = await db.select().from(moodPreferences).where(eq(moodPreferences.id, id));
    return created;
  },
  // Favourite Titles
  async getFavouriteTitles(userId) {
    return db.select().from(favouriteTitles).where(eq(favouriteTitles.userId, userId));
  },
  async addFavouriteTitle(data) {
    const id = randomUUID();
    await db.insert(favouriteTitles).values({ ...data, id });
    const [created] = await db.select().from(favouriteTitles).where(eq(favouriteTitles.id, id));
    return created;
  },
  async deleteFavouriteTitle(id) {
    await db.delete(favouriteTitles).where(eq(favouriteTitles.id, id));
  },
  // Watch History
  async getWatchHistory(userId) {
    return db.select().from(watchHistory).where(eq(watchHistory.userId, userId)).orderBy(desc(watchHistory.watchedDate));
  },
  async addToWatchHistory(data) {
    const id = randomUUID();
    await db.insert(watchHistory).values({ ...data, id });
    const [created] = await db.select().from(watchHistory).where(eq(watchHistory.id, id));
    return created;
  },
  async updateWatchHistoryRating(id, rating) {
    await db.update(watchHistory).set({ rating }).where(eq(watchHistory.id, id));
  },
  // Rejected Items
  async getRejectedItems(userId) {
    return db.select().from(rejectedItems).where(eq(rejectedItems.userId, userId));
  },
  async addRejectedItem(data) {
    const id = randomUUID();
    await db.insert(rejectedItems).values({ ...data, id });
    const [created] = await db.select().from(rejectedItems).where(eq(rejectedItems.id, id));
    return created;
  },
  // Watchlist
  async getWatchlist(userId) {
    return db.select().from(watchlist).where(eq(watchlist.userId, userId)).orderBy(desc(watchlist.priority), desc(watchlist.addedDate));
  },
  async getEnrichedWatchlist(userId) {
    const items = await this.getWatchlist(userId);
    const allReleases = await db.select().from(newReleases);
    const releaseMap = /* @__PURE__ */ new Map();
    for (const r of allReleases) {
      releaseMap.set(r.title.toLowerCase(), r);
    }
    const unmatched = items.filter((item) => !releaseMap.has(item.title.toLowerCase()));
    if (unmatched.length > 0) {
      const { searchTitle: searchTitle2, fetchTitleDetails: fetchTitleDetails2 } = await Promise.resolve().then(() => (init_tmdb(), tmdb_exports));
      for (const item of unmatched) {
        try {
          const result = await searchTitle2(item.title, item.year, item.mediaType);
          if (!result) continue;
          const details = await fetchTitleDetails2(result.tmdbId, item.mediaType);
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
            trailerKey: details.trailerKey || result.trailerKey
          });
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
  async addToWatchlist(data) {
    const id = randomUUID();
    await db.insert(watchlist).values({ ...data, id });
    const [created] = await db.select().from(watchlist).where(eq(watchlist.id, id));
    return created;
  },
  async removeFromWatchlist(id) {
    await db.delete(watchlist).where(eq(watchlist.id, id));
  },
  async updateWatchlistPriority(id, priority) {
    await db.update(watchlist).set({ priority }).where(eq(watchlist.id, id));
  },
  // Recommendation Log
  async getRecommendationLog(userId) {
    return db.select().from(recommendationLog).where(eq(recommendationLog.userId, userId)).orderBy(desc(recommendationLog.createdAt));
  },
  async logRecommendation(data) {
    const id = randomUUID();
    await db.insert(recommendationLog).values({ ...data, id });
    const [created] = await db.select().from(recommendationLog).where(eq(recommendationLog.id, id));
    return created;
  },
  async updateRecommendationOutcome(id, outcome) {
    await db.update(recommendationLog).set({ outcome }).where(eq(recommendationLog.id, id));
  },
  // Get full user profile for recommendations
  async getUserProfile(userId) {
    const [user, genres, actors, directors, moods, favourites, history, rejected] = await Promise.all([
      this.getUser(userId),
      this.getGenrePreferences(userId),
      this.getActorPreferences(userId),
      this.getDirectorPreferences(userId),
      this.getMoodPreferences(userId),
      this.getFavouriteTitles(userId),
      this.getWatchHistory(userId),
      this.getRejectedItems(userId)
    ]);
    return {
      user,
      genres,
      actors,
      directors,
      moods,
      favourites,
      history,
      rejected
    };
  },
  // New Releases
  async upsertNewRelease(data) {
    const [existing] = await db.select().from(newReleases).where(eq(newReleases.tmdbId, data.tmdbId));
    if (existing) {
      await db.update(newReleases).set(data).where(eq(newReleases.id, existing.id));
    } else {
      const id = randomUUID();
      await db.insert(newReleases).values({ ...data, id });
    }
  },
  async getRecentNewReleases(daysBack = 14) {
    const cutoff = /* @__PURE__ */ new Date();
    cutoff.setDate(cutoff.getDate() - daysBack);
    return db.select().from(newReleases).where(gte(newReleases.fetchedDate, cutoff)).orderBy(desc(newReleases.fetchedDate));
  },
  async getNewReleaseById(id) {
    const [release] = await db.select().from(newReleases).where(eq(newReleases.id, id));
    return release;
  },
  async getNewReleaseByTmdbId(tmdbId) {
    const [release] = await db.select().from(newReleases).where(eq(newReleases.tmdbId, tmdbId));
    return release;
  },
  async cleanOldReleases(daysOld = 30) {
    const cutoff = /* @__PURE__ */ new Date();
    cutoff.setDate(cutoff.getDate() - daysOld);
    await db.delete(newReleases).where(sql2`${newReleases.fetchedDate} < ${cutoff}`);
  },
  // User Picks
  async getUserPicks(userId, mediaTypeFilter) {
    const picks = await db.select().from(userPicks).where(and(eq(userPicks.userId, userId), eq(userPicks.status, "new"))).orderBy(desc(userPicks.relevanceScore));
    const results = [];
    for (const pick of picks) {
      const release = await this.getNewReleaseById(pick.releaseId);
      if (!release) continue;
      if (mediaTypeFilter && release.mediaType !== mediaTypeFilter) continue;
      results.push({ ...pick, release });
    }
    return results;
  },
  async updateUserPickStatus(id, status) {
    await db.update(userPicks).set({ status }).where(eq(userPicks.id, id));
  },
  async deleteStaleUserPicks(userId) {
    await db.delete(userPicks).where(and(eq(userPicks.userId, userId), eq(userPicks.status, "new")));
  },
  async insertUserPick(data) {
    const [existing] = await db.select().from(userPicks).where(and(eq(userPicks.userId, data.userId), eq(userPicks.releaseId, data.releaseId)));
    if (existing) return;
    const id = randomUUID();
    await db.insert(userPicks).values({ ...data, id });
  },
  async getAllUsers() {
    return db.select().from(users);
  },
  async getRecommendationStats(userId) {
    const log = await db.select().from(recommendationLog).where(eq(recommendationLog.userId, userId));
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
      watchlistRate: total > 0 ? Math.round(addedToWatchlist / total * 100) : 0,
      watchedRate: total > 0 ? Math.round(watched / total * 100) : 0,
      rejectedRate: total > 0 ? Math.round(rejected / total * 100) : 0
    };
  },
  // --- Guardian archive ---
  async upsertGuardianReview(data) {
    const [existing] = await db.select().from(guardianReviews).where(eq(guardianReviews.url, data.url));
    if (existing) {
      await db.update(guardianReviews).set(data).where(eq(guardianReviews.id, existing.id));
      return existing.id;
    }
    const id = randomUUID();
    await db.insert(guardianReviews).values({ ...data, id });
    return id;
  },
  async getRecentGuardianReviews(daysBack = 60, limit = 50) {
    const cutoff = /* @__PURE__ */ new Date();
    cutoff.setDate(cutoff.getDate() - daysBack);
    const cutoffStr = cutoff.toISOString().split("T")[0];
    return db.select().from(guardianReviews).where(sql2`${guardianReviews.publishedDate} >= ${cutoffStr}`).orderBy(desc(guardianReviews.publishedDate)).limit(limit);
  },
  async getGuardianReviewsForScoring(daysBack = 365) {
    const cutoff = /* @__PURE__ */ new Date();
    cutoff.setDate(cutoff.getDate() - daysBack);
    const cutoffStr = cutoff.toISOString().split("T")[0];
    return db.select().from(guardianReviews).where(sql2`${guardianReviews.publishedDate} >= ${cutoffStr}`).orderBy(desc(guardianReviews.publishedDate));
  },
  async getGuardianReviewById(id) {
    const [r] = await db.select().from(guardianReviews).where(eq(guardianReviews.id, id));
    return r;
  },
  async getStreamingProviders() {
    const rows1 = await db.select({ s: newReleases.streamingUk }).from(newReleases).where(sql2`${newReleases.streamingUk} IS NOT NULL`);
    const rows2 = await db.select({ s: guardianReviews.streamingUk }).from(guardianReviews).where(sql2`${guardianReviews.streamingUk} IS NOT NULL`);
    const set = /* @__PURE__ */ new Set();
    for (const row of [...rows1, ...rows2]) {
      const s = row.s;
      if (!Array.isArray(s)) continue;
      for (const p of s) if (p?.provider) set.add(p.provider);
    }
    return [...set].sort((a, b) => a.localeCompare(b));
  },
  async cleanOldGuardianReviews(daysOld = 400) {
    const cutoff = /* @__PURE__ */ new Date();
    cutoff.setDate(cutoff.getDate() - daysOld);
    const cutoffStr = cutoff.toISOString().split("T")[0];
    await db.delete(guardianReviews).where(sql2`${guardianReviews.publishedDate} < ${cutoffStr}`);
  },
  // --- User Guardian picks ---
  async insertUserGuardianPick(data) {
    const id = randomUUID();
    await db.insert(userGuardianPicks).values({ ...data, id });
  },
  async deleteStaleUserGuardianPicks(userId) {
    await db.delete(userGuardianPicks).where(and(eq(userGuardianPicks.userId, userId), eq(userGuardianPicks.status, "new")));
  },
  async getUserGuardianPicks(userId) {
    const picks = await db.select().from(userGuardianPicks).where(and(eq(userGuardianPicks.userId, userId), eq(userGuardianPicks.status, "new"))).orderBy(desc(userGuardianPicks.relevanceScore));
    const results = [];
    for (const pick of picks) {
      const [review] = await db.select().from(guardianReviews).where(eq(guardianReviews.id, pick.reviewId));
      if (!review) continue;
      results.push({ ...pick, review });
    }
    return results;
  },
  async updateUserGuardianPickStatus(id, status) {
    await db.update(userGuardianPicks).set({ status }).where(eq(userGuardianPicks.id, id));
  }
};

// server/ai.ts
import OpenAI from "openai";
var openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});
async function generateRecommendations(profile, userRequest) {
  const prompt = buildPrompt(profile, userRequest);
  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      {
        role: "system",
        content: `You are a film and TV recommendation expert. You analyze user preferences and suggest personalized recommendations.

Always respond with valid JSON in this exact format:
{
  "recommendations": [
    {
      "title": "Title Name",
      "year": 2020,
      "mediaType": "film" or "tv",
      "reason": "Brief explanation of why this matches their taste",
      "imdbScore": 8.5,
      "rottenTomatoesScore": 92,
      "matchScore": 87,
      "genres": ["Drama", "Thriller"]
    }
  ]
}

For scores:
- imdbScore: IMDB rating out of 10 (e.g., 8.5). Use null if unknown.
- rottenTomatoesScore: Rotten Tomatoes critic score as percentage (e.g., 92 for 92%). Use null if unknown.
- matchScore: How well this matches the user's specific taste profile, as a percentage 60-99. Higher = stronger match to their stated preferences, viewing history, and favourites.
- genres: Array of 1-3 genre strings (e.g. ["Drama", "Thriller", "Crime"]).

Provide 3-5 recommendations. Be specific about why each recommendation fits the user's profile.
Focus on lesser-known gems alongside popular choices. Consider both what they love AND what they've disliked to refine suggestions.`
      },
      {
        role: "user",
        content: prompt
      }
    ],
    response_format: { type: "json_object" },
    temperature: 0.8
  });
  const content = response.choices[0].message.content;
  if (!content) {
    throw new Error("No response from AI");
  }
  const parsed = JSON.parse(content);
  return parsed.recommendations || [];
}
function buildPrompt(profile, userRequest) {
  const sections = [];
  if (userRequest) {
    sections.push(`USER REQUEST: "${userRequest}"`);
  }
  const likedGenres = profile.genres.filter((g) => g.rating >= 4).map((g) => g.genre);
  const dislikedGenres = profile.genres.filter((g) => g.rating <= 2).map((g) => g.genre);
  if (likedGenres.length > 0) {
    sections.push(`FAVOURITE GENRES: ${likedGenres.join(", ")}`);
  }
  if (dislikedGenres.length > 0) {
    sections.push(`GENRES TO AVOID: ${dislikedGenres.join(", ")}`);
  }
  if (profile.actors.length > 0) {
    const likedActors = profile.actors.filter((a) => a.rating >= 4).map((a) => a.actorName);
    if (likedActors.length > 0) {
      sections.push(`FAVOURITE ACTORS: ${likedActors.join(", ")}`);
    }
  }
  if (profile.directors.length > 0) {
    const likedDirectors = profile.directors.filter((d) => d.rating >= 4).map((d) => d.directorName);
    if (likedDirectors.length > 0) {
      sections.push(`FAVOURITE DIRECTORS: ${likedDirectors.join(", ")}`);
    }
  }
  if (profile.moods.length > 0) {
    const likedMoods = profile.moods.filter((m) => m.rating >= 4).map((m) => m.mood);
    if (likedMoods.length > 0) {
      sections.push(`PREFERRED MOODS: ${likedMoods.join(", ")}`);
    }
  }
  if (profile.favourites.length > 0) {
    const favList = profile.favourites.map((f) => `${f.title} (${f.mediaType})${f.reason ? ` - "${f.reason}"` : ""}`).join("; ");
    sections.push(`LOVED TITLES (use as reference for taste, but DON'T recommend these - user has already seen them): ${favList}`);
  }
  const lovedHistory = profile.history.filter((h) => h.rating === "loved");
  const dislikedHistory = profile.history.filter((h) => h.rating === "disliked");
  if (lovedHistory.length > 0) {
    sections.push(`RECENTLY LOVED: ${lovedHistory.map((h) => h.title).join(", ")}`);
  }
  if (dislikedHistory.length > 0) {
    sections.push(`RECENTLY DISLIKED: ${dislikedHistory.map((h) => h.title).join(", ")}`);
  }
  if (profile.rejected.length > 0) {
    const withReasons = profile.rejected.slice(0, 15).map((r) => r.reason && r.reason !== "Not interested" ? `${r.title} (reason: ${r.reason})` : r.title).join("; ");
    sections.push(`ALREADY REJECTED (don't suggest these, and learn from the reasons to avoid similar titles): ${withReasons}`);
  }
  if (profile.history.length > 0) {
    const watchedList = profile.history.slice(0, 20).map((h) => h.title).join(", ");
    sections.push(`ALREADY WATCHED (don't suggest): ${watchedList}`);
  }
  if (sections.length === 0) {
    return "Please suggest 5 popular, highly-rated films and TV shows across different genres for a new user.";
  }
  return sections.join("\n\n");
}
async function parseNaturalLanguageRequest(request) {
  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      {
        role: "system",
        content: `Parse the user's request about films/TV. Identify the intent and extract details.

Respond with JSON:
{
  "intent": "recommendation" | "add_favourite" | "unknown",
  "details": {
    "mood": "optional mood they want",
    "similar_to": "optional title they want something similar to",
    "genre": "optional genre",
    "mediaType": "film" | "tv" | "any"
  }
}`
      },
      {
        role: "user",
        content: request
      }
    ],
    response_format: { type: "json_object" },
    temperature: 0.3
  });
  const content = response.choices[0].message.content;
  if (!content) {
    return { intent: "unknown", details: {} };
  }
  return JSON.parse(content);
}
async function generateTasteInsights(profile) {
  const profileSummary = buildInsightsPrompt(profile);
  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      {
        role: "system",
        content: `You are analyzing a user's film and TV taste profile. Based on their favourites, watch history, and preferences, generate insights about what they enjoy.

Respond with JSON in this exact format:
{
  "summary": "A 2-3 sentence personalized summary of their taste (speak directly to them using 'you')",
  "topThemes": ["theme1", "theme2", "theme3"],
  "watchingStyle": "One sentence describing their watching habits (e.g., 'You gravitate towards complex character studies' or 'You enjoy binge-worthy series with twists')",
  "moodProfile": "One sentence about the emotional experiences they seek (e.g., 'You like to be intellectually challenged' or 'You prefer feel-good escapism')",
  "hiddenGem": "Based on their taste, suggest one lesser-known title they might love with a brief reason"
}

Be specific and insightful, not generic. Reference actual titles from their profile when relevant.`
      },
      {
        role: "user",
        content: profileSummary
      }
    ],
    response_format: { type: "json_object" },
    temperature: 0.7
  });
  const content = response.choices[0].message.content;
  if (!content) {
    throw new Error("No response from AI");
  }
  return JSON.parse(content);
}
function buildInsightsPrompt(profile) {
  const sections = [];
  if (profile.favourites.length > 0) {
    sections.push(`FAVOURITE TITLES: ${profile.favourites.map((f) => f.title).join(", ")}`);
  }
  const likedGenres = profile.genres.filter((g) => g.rating >= 4).map((g) => g.genre);
  const dislikedGenres = profile.genres.filter((g) => g.rating <= 2).map((g) => g.genre);
  if (likedGenres.length > 0) {
    sections.push(`LIKED GENRES: ${likedGenres.join(", ")}`);
  }
  if (dislikedGenres.length > 0) {
    sections.push(`DISLIKED GENRES: ${dislikedGenres.join(", ")}`);
  }
  const likedMoods = profile.moods.filter((m) => m.rating >= 4).map((m) => m.mood);
  if (likedMoods.length > 0) {
    sections.push(`PREFERRED MOODS: ${likedMoods.join(", ")}`);
  }
  const lovedHistory = profile.history.filter((h) => h.rating === "loved");
  const dislikedHistory = profile.history.filter((h) => h.rating === "disliked");
  if (lovedHistory.length > 0) {
    sections.push(`RECENTLY LOVED: ${lovedHistory.map((h) => h.title).join(", ")}`);
  }
  if (dislikedHistory.length > 0) {
    sections.push(`RECENTLY DISLIKED: ${dislikedHistory.map((h) => h.title).join(", ")}`);
  }
  sections.push(`STATS: ${profile.favourites.length} favourites, ${profile.history.length} watched, ${profile.rejected.length} rejected`);
  return sections.join("\n");
}
async function scoreReleasesForUser(profile, releases, excludeTitles, guidance) {
  const tasteProfile = buildPrompt(profile);
  const excludeSet = new Set(excludeTitles.map((t) => t.toLowerCase()));
  const candidates = releases.filter(
    (r) => !excludeSet.has(r.title.toLowerCase())
  );
  if (candidates.length === 0) return [];
  const releasesBlock = candidates.map((r, i) => {
    const genres = Array.isArray(r.genres) ? r.genres.join(", ") : "";
    const cast = Array.isArray(r.cast) ? r.cast.join(", ") : "";
    const directors = Array.isArray(r.directors) ? r.directors.join(", ") : "";
    const guardian = r.guardianRating ? `Guardian: ${r.guardianRating}/5` : "";
    return `${i + 1}. [TMDB:${r.tmdbId}] "${r.title}" (${r.year || "?"}, ${r.mediaType}) \u2014 Genres: ${genres} | Cast: ${cast} | Directors: ${directors} | TMDB: ${r.tmdbRating}/10 ${guardian}
   ${(r.overview || "").substring(0, 150)}`;
  }).join("\n");
  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      {
        role: "system",
        content: `You are scoring new film and TV releases against a user's taste profile. For each release that's a good match (score 60+), provide a relevanceScore (1-100) and a short personalised reason explaining why they'd enjoy it.

Respond with valid JSON:
{
  "picks": [
    { "tmdbId": 12345, "titleMatch": "Exact title from the candidate list", "relevanceScore": 85, "reason": "Brief personalised reason about this title" }
  ]
}

Rules:
- Only include titles scoring 60 or above
- Return maximum 10 picks, sorted by score descending
- Consider: genre match, actor/director overlap, mood alignment, similarity to favourites
- Titles with Guardian 4-5 star ratings are critically acclaimed \u2014 give them a +10 scoring boost as they represent quality-vetted content. Guardian 3-star titles get a +5 boost.
- "titleMatch" MUST be the exact title of the candidate you are scoring, copied verbatim from the candidate list. This is a self-check \u2014 it must agree with the tmdbId.
- The "reason" must describe THIS candidate (the one identified by tmdbId/titleMatch). NEVER write "In '[Other Film]', ..." where [Other Film] is anything other than the candidate itself.
- If comparing to one of the user's favourites, phrase it as "Like your favourite [X], this one ..." \u2014 never put the favourite in the subject position.
- The "reason" should be personal \u2014 reference their specific tastes, not generic praise. If the candidate has a Guardian rating, mention it (e.g., "Guardian 5-star reviewed").
- Be selective \u2014 a mediocre match at 65 is less useful than no match`
      },
      {
        role: "user",
        content: `USER TASTE PROFILE:
${tasteProfile}${guidance ? `

USER GUIDANCE (apply this as a strong filter on top of their taste profile):
"${guidance}"` : ""}

NEW RELEASES TO SCORE:
${releasesBlock}`
      }
    ],
    response_format: { type: "json_object" },
    temperature: 0.5
  });
  const content = response.choices[0].message.content;
  if (!content) return [];
  const parsed = JSON.parse(content);
  const rawPicks = parsed.picks || [];
  const titleByTmdbId = new Map(candidates.map((r) => [r.tmdbId, r.title.toLowerCase()]));
  const validPicks = [];
  for (const pick of rawPicks) {
    const expected = titleByTmdbId.get(pick.tmdbId);
    if (!expected) continue;
    if (pick.titleMatch && pick.titleMatch.toLowerCase().trim() !== expected) {
      console.warn(
        `[ai] Dropping pick: titleMatch "${pick.titleMatch}" != expected "${expected}" (tmdbId=${pick.tmdbId})`
      );
      continue;
    }
    const reasonOpener = /^\s*in\s+['"“]([^'"”]+)['"”]/i.exec(pick.reason || "");
    if (reasonOpener && reasonOpener[1].toLowerCase().trim() !== expected) {
      console.warn(
        `[ai] Dropping pick: reason opens with "${reasonOpener[1]}" but candidate is "${expected}" (tmdbId=${pick.tmdbId})`
      );
      continue;
    }
    validPicks.push({
      tmdbId: pick.tmdbId,
      relevanceScore: pick.relevanceScore,
      reason: pick.reason
    });
  }
  return validPicks;
}
async function scoreGuardianArchiveForUser(profile, reviews, excludeTitles, guidance) {
  const tasteProfile = buildPrompt(profile);
  const excludeSet = new Set(excludeTitles.map((t) => t.toLowerCase()));
  const candidates = reviews.filter((r) => !excludeSet.has(r.title.toLowerCase()));
  if (candidates.length === 0) return [];
  const ranked = [...candidates].sort((a, b) => {
    const ar = (a.starRating || 0) * 10 + (a.publishedDate || "").localeCompare(b.publishedDate || "");
    const br = (b.starRating || 0) * 10;
    return br - ar;
  });
  const trimmed = ranked.slice(0, 80);
  const block = trimmed.map((r, i) => {
    const genres = Array.isArray(r.genres) ? r.genres.join(", ") : "";
    const cast = Array.isArray(r.cast) ? r.cast.join(", ") : "";
    const directors = Array.isArray(r.directors) ? r.directors.join(", ") : "";
    const stars = r.starRating ? `Guardian: ${r.starRating}/5` : "";
    const tmdb = r.tmdbRating ? `TMDB: ${r.tmdbRating}/10` : "";
    return `${i + 1}. [ID:${r.id}] "${r.title}" (${r.year || "?"}, ${r.mediaType}) \u2014 ${stars} ${tmdb} | Genres: ${genres} | Cast: ${cast} | Directors: ${directors}
   ${(r.excerpt || "").substring(0, 200)}`;
  }).join("\n");
  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      {
        role: "system",
        content: `You are scoring Guardian-reviewed films and TV from the last 12 months against a user's taste profile. For each candidate that's a strong match (score 60+), provide a relevanceScore (1-100) and a short personalised reason.

Respond with valid JSON:
{
  "picks": [
    { "reviewId": "<id>", "titleMatch": "Exact title from the candidate", "relevanceScore": 85, "reason": "Brief personalised reason about this title" }
  ]
}

Rules:
- Only include titles scoring 60 or above
- Return maximum 12 picks, sorted by score descending
- Consider: genre match, actor/director overlap, mood alignment, similarity to favourites
- Titles with Guardian 4-5 stars get a +10 boost; 3-star titles get +5
- "titleMatch" MUST be the exact candidate title, copied verbatim. It must agree with the reviewId.
- "reason" must describe THIS candidate (identified by reviewId/titleMatch). NEVER write "In '[Other Film]', ..." \u2014 never put a different film as the subject.
- If comparing to a user favourite, phrase it as "Like your favourite [X], this one ..." \u2014 never put the favourite in the subject.
- If a title has a Guardian star rating, mention it.
- Be selective \u2014 a mediocre match at 65 is less useful than no match.`
      },
      {
        role: "user",
        content: `USER TASTE PROFILE:
${tasteProfile}${guidance ? `

USER GUIDANCE:
"${guidance}"` : ""}

GUARDIAN REVIEWS TO SCORE:
${block}`
      }
    ],
    response_format: { type: "json_object" },
    temperature: 0.5
  });
  const content = response.choices[0].message.content;
  if (!content) return [];
  const parsed = JSON.parse(content);
  const raw = parsed.picks || [];
  const titleById = new Map(trimmed.map((r) => [r.id, r.title.toLowerCase()]));
  const valid = [];
  for (const pick of raw) {
    const expected = titleById.get(pick.reviewId);
    if (!expected) continue;
    if (pick.titleMatch && pick.titleMatch.toLowerCase().trim() !== expected) {
      console.warn(
        `[ai] Dropping guardian pick: titleMatch "${pick.titleMatch}" != expected "${expected}" (id=${pick.reviewId})`
      );
      continue;
    }
    const opener = /^\s*in\s+['"“]([^'"”]+)['"”]/i.exec(pick.reason || "");
    if (opener && opener[1].toLowerCase().trim() !== expected) {
      console.warn(
        `[ai] Dropping guardian pick: reason opens with "${opener[1]}" but candidate is "${expected}" (id=${pick.reviewId})`
      );
      continue;
    }
    valid.push({
      reviewId: pick.reviewId,
      relevanceScore: pick.relevanceScore,
      reason: pick.reason
    });
  }
  return valid;
}

// server/cron.ts
import cron from "node-cron";
init_tmdb();

// server/guardian.ts
var GUARDIAN_BASE = "https://content.guardianapis.com";
function apiKey2() {
  const key = process.env.GUARDIAN_API_KEY;
  if (!key) throw new Error("GUARDIAN_API_KEY not set");
  return key;
}
async function fetchRecentReviews(daysBack = 60) {
  const fromDate = /* @__PURE__ */ new Date();
  fromDate.setDate(fromDate.getDate() - daysBack);
  const fromStr = fromDate.toISOString().split("T")[0];
  const reviews = [];
  for (const section of ["film", "tv-and-radio"]) {
    try {
      let page = 1;
      let totalPages = 1;
      while (page <= totalPages && page <= 5) {
        const url = new URL(`${GUARDIAN_BASE}/search`);
        url.searchParams.set("api-key", apiKey2());
        url.searchParams.set("section", section);
        url.searchParams.set("tag", "tone/reviews");
        url.searchParams.set("from-date", fromStr);
        url.searchParams.set("show-fields", "starRating,standfirst,headline,bodyText");
        url.searchParams.set("page-size", "200");
        url.searchParams.set("page", page.toString());
        url.searchParams.set("order-by", "newest");
        const res = await fetch(url.toString());
        if (!res.ok) {
          console.error(`Guardian API ${section} page ${page} failed: ${res.status}`);
          break;
        }
        const data = await res.json();
        totalPages = data.response?.pages || 1;
        const results = data.response?.results || [];
        for (const item of results) {
          const fields = item.fields || {};
          const headline = fields.headline || item.webTitle || "";
          const title = extractTitleFromHeadline(headline);
          reviews.push({
            title,
            url: item.webUrl || "",
            starRating: fields.starRating ? parseInt(fields.starRating) : null,
            excerpt: fields.standfirst ? stripHtml(fields.standfirst).substring(0, 300) : "",
            body: fields.bodyText || "",
            publishedDate: item.webPublicationDate || ""
          });
        }
        page++;
      }
    } catch (err) {
      console.error(`Failed to fetch Guardian ${section} reviews:`, err);
    }
  }
  return reviews;
}
function extractTitleFromHeadline(headline) {
  let title = headline.replace(/\s+review\b.*$/i, "").replace(/\s+–\s+.*$/, "").replace(/\s+—\s+.*$/, "").replace(/\s+-\s+.*$/, "").trim();
  return title;
}
function stripHtml(html) {
  return html.replace(/<[^>]*>/g, "").trim();
}
function normalise(s) {
  return s.toLowerCase().replace(/^the\s+/, "").replace(/['']/g, "'").replace(/[^a-z0-9' ]/g, "").trim();
}
function tokens(s) {
  return normalise(s).split(/\s+/).filter(Boolean);
}
function reviewYear(r) {
  const y = parseInt((r.publishedDate || "").slice(0, 4), 10);
  return Number.isFinite(y) ? y : null;
}
function hasTokenRun(haystack, needle) {
  if (needle.length === 0 || needle.length > haystack.length) return false;
  outer: for (let i = 0; i <= haystack.length - needle.length; i++) {
    for (let j = 0; j < needle.length; j++) {
      if (haystack[i + j] !== needle[j]) continue outer;
    }
    return true;
  }
  return false;
}
function matchReviewsToReleases(reviews, releases) {
  const matched = /* @__PURE__ */ new Map();
  for (const review of reviews) {
    const reviewTokens = tokens(review.title);
    if (reviewTokens.length === 0) continue;
    const rYear = reviewYear(review);
    for (const release of releases) {
      const releaseTokens = tokens(release.title);
      if (releaseTokens.length === 0) continue;
      const exact = reviewTokens.length === releaseTokens.length && reviewTokens.every((t, i) => t === releaseTokens[i]);
      const bothMulti = reviewTokens.length >= 2 && releaseTokens.length >= 2;
      const reviewContainsRelease = bothMulti && hasTokenRun(reviewTokens, releaseTokens);
      const releaseContainsReview = bothMulti && hasTokenRun(releaseTokens, reviewTokens);
      if (!exact && !reviewContainsRelease && !releaseContainsReview) continue;
      if (release.year && rYear && Math.abs(rYear - release.year) > 2) continue;
      const existing = matched.get(release.tmdbId);
      if (!existing || review.starRating && !existing.starRating) {
        matched.set(release.tmdbId, review);
      }
    }
  }
  return matched;
}

// server/guardianArchive.ts
init_tmdb();
var TMDB_BASE2 = "https://api.themoviedb.org/3";
async function tmdbGet2(path2, params = {}) {
  const url = new URL(`${TMDB_BASE2}${path2}`);
  url.searchParams.set("api_key", process.env.TMDB_API_KEY || "");
  url.searchParams.set("language", "en-GB");
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  const res = await fetch(url.toString());
  if (!res.ok) throw new Error(`TMDB ${path2} ${res.status}`);
  return res.json();
}
async function enrichFromTmdb(title, year, mediaType) {
  const empty = {
    tmdbId: null,
    imdbId: null,
    year,
    posterPath: null,
    tmdbRating: null,
    genres: [],
    cast: [],
    directors: [],
    streamingUk: [],
    trailerKey: null
  };
  const search = await searchTitle(title, year, mediaType);
  if (!search) return empty;
  try {
    const type = mediaType === "film" ? "movie" : "tv";
    const basic = await tmdbGet2(`/${type}/${search.tmdbId}`);
    const details = await fetchTitleDetails(search.tmdbId, mediaType);
    const tmdbYear = (() => {
      const d = basic.release_date || basic.first_air_date;
      return d ? parseInt(d.substring(0, 4)) : year;
    })();
    return {
      tmdbId: search.tmdbId,
      imdbId: details.imdbId,
      year: tmdbYear,
      posterPath: search.posterPath,
      tmdbRating: basic.vote_average ? basic.vote_average.toFixed(1) : null,
      genres: details.genres,
      cast: details.cast,
      directors: details.directors,
      streamingUk: details.streamingUk,
      trailerKey: search.trailerKey || details.trailerKey
    };
  } catch (err) {
    console.error(`[archive] TMDB detail lookup failed for "${title}":`, err);
    return { ...empty, tmdbId: search.tmdbId, posterPath: search.posterPath };
  }
}
async function fetchAndStoreGuardianArchive(daysBack) {
  console.log(`[archive] Fetching Guardian reviews back ${daysBack} days...`);
  const reviews = await fetchRecentReviews(daysBack);
  console.log(`[archive] Got ${reviews.length} reviews, enriching via TMDB...`);
  let enriched = 0;
  let skipped = 0;
  const CONCURRENCY = 5;
  for (let i = 0; i < reviews.length; i += CONCURRENCY) {
    const batch = reviews.slice(i, i + CONCURRENCY);
    await Promise.all(
      batch.map(async (review) => {
        if (!review.url || !review.title) {
          skipped++;
          return;
        }
        const section = /\/tv-and-radio\//.test(review.url) ? "tv-and-radio" : "film";
        const mediaType = section === "tv-and-radio" ? "tv" : "film";
        const pubYear = parseInt((review.publishedDate || "").slice(0, 4)) || null;
        const tmdb = await enrichFromTmdb(review.title, pubYear, mediaType);
        try {
          await storage.upsertGuardianReview({
            url: review.url,
            title: review.title,
            section,
            mediaType,
            starRating: review.starRating,
            excerpt: review.excerpt,
            body: review.body,
            publishedDate: (review.publishedDate || "").slice(0, 10),
            tmdbId: tmdb.tmdbId,
            imdbId: tmdb.imdbId,
            year: tmdb.year,
            posterPath: tmdb.posterPath,
            tmdbRating: tmdb.tmdbRating,
            genres: tmdb.genres,
            cast: tmdb.cast,
            directors: tmdb.directors,
            streamingUk: tmdb.streamingUk,
            trailerKey: tmdb.trailerKey
          });
          enriched++;
        } catch (err) {
          console.error(`[archive] Failed to upsert "${review.title}":`, err);
          skipped++;
        }
      })
    );
  }
  return { fetched: reviews.length, enriched, skipped };
}

// server/cron.ts
var TMDB_BASE3 = "https://api.themoviedb.org/3";
function initCronJobs() {
  cron.schedule("0 6 * * *", () => {
    console.log("[cron] Starting daily new releases job...");
    runDailyNewReleases().catch((err) => {
      console.error("[cron] Daily job failed:", err);
    });
  });
  console.log("[cron] Daily new releases job scheduled for 06:00 UTC");
}
async function runDailyNewReleases() {
  const batchDate = (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
  console.log(`[cron] Batch date: ${batchDate}`);
  console.log("[cron] Fetching new releases from TMDB...");
  const rawTitles = await fetchNewReleases();
  console.log(`[cron] Found ${rawTitles.length} raw titles`);
  console.log("[cron] Enriching with TMDB details...");
  const enriched = await enrichReleases(rawTitles);
  console.log("[cron] Fetching Guardian reviews...");
  const reviews = await fetchRecentReviews();
  console.log(`[cron] Found ${reviews.length} Guardian reviews`);
  const reviewMap = matchReviewsToReleases(
    reviews,
    enriched.map((r) => ({ tmdbId: r.tmdbId, title: r.title, year: r.year }))
  );
  console.log(`[cron] Matched ${reviewMap.size} reviews to releases`);
  console.log("[cron] Saving releases to database...");
  for (const title of enriched) {
    const review = reviewMap.get(title.tmdbId);
    await storage.upsertNewRelease({
      tmdbId: title.tmdbId,
      imdbId: title.imdbId || null,
      title: title.title,
      mediaType: title.mediaType,
      year: title.year,
      releaseDate: title.releaseDate,
      overview: title.overview,
      genres: title.genres,
      posterPath: title.posterPath,
      tmdbRating: title.tmdbRating,
      cast: title.cast,
      directors: title.directors,
      streamingUk: title.streamingUk,
      trailerKey: title.trailerKey || null,
      inCinemas: title.inCinemas ? 1 : 0,
      guardianUrl: review?.url || null,
      guardianRating: review?.starRating || null,
      guardianExcerpt: review?.excerpt || null,
      guardianBody: review?.body || null
    });
  }
  console.log("[cron] Scoring releases for users...");
  const allUsers = await storage.getAllUsers();
  const recentReleases = await storage.getRecentNewReleases(14);
  let usersScored = 0;
  for (const user of allUsers) {
    try {
      await scoreNewReleasesForUser(user.id, recentReleases, batchDate);
      usersScored++;
    } catch (err) {
      console.error(`[cron] Failed to score for user ${user.id}:`, err);
    }
  }
  await storage.cleanOldReleases(400);
  try {
    console.log("[cron] Refreshing Guardian archive (incremental 14 days)...");
    await fetchAndStoreGuardianArchive(14);
    await storage.cleanOldGuardianReviews(400);
    for (const user of allUsers) {
      try {
        await scoreGuardianPicksForUser(user.id, batchDate);
      } catch (err) {
        console.error(`[cron] Guardian scoring failed for user ${user.id}:`, err);
      }
    }
  } catch (err) {
    console.error("[cron] Guardian archive refresh failed:", err);
  }
  console.log(
    `[cron] Done. ${enriched.length} releases, ${usersScored} users scored.`
  );
  return { releasesFound: enriched.length, usersScored };
}
async function addTmdbRelease(tmdbId, mediaType) {
  const type = mediaType === "film" ? "movie" : "tv";
  const res = await fetch(
    `${TMDB_BASE3}/${type}/${tmdbId}?api_key=${process.env.TMDB_API_KEY}&language=en-GB`
  );
  if (!res.ok) throw new Error(`TMDB ${type}/${tmdbId} failed: ${res.status}`);
  const data = await res.json();
  const title = data.title || data.name || "";
  const releaseDate = data.release_date || data.first_air_date || null;
  const year = releaseDate ? parseInt(releaseDate.substring(0, 4)) : null;
  const details = await fetchTitleDetails(tmdbId, mediaType);
  const reviews = await fetchRecentReviews(90);
  const reviewMap = matchReviewsToReleases(reviews, [{ tmdbId, title, year }]);
  const review = reviewMap.get(tmdbId);
  await storage.upsertNewRelease({
    tmdbId,
    imdbId: details.imdbId || null,
    title,
    mediaType,
    year,
    releaseDate,
    overview: data.overview || "",
    genres: details.genres,
    posterPath: data.poster_path || null,
    tmdbRating: (data.vote_average || 0).toFixed(1),
    cast: details.cast,
    directors: details.directors,
    streamingUk: details.streamingUk,
    trailerKey: details.trailerKey || null,
    inCinemas: 0,
    guardianUrl: review?.url || null,
    guardianRating: review?.starRating || null,
    guardianExcerpt: review?.excerpt || null,
    guardianBody: review?.body || null
  });
  return { title, year, guardianMatched: !!review };
}
async function scoreGuardianPicksForUser(userId, batchDate, guidance) {
  const date = batchDate || (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
  const reviews = await storage.getGuardianReviewsForScoring(365);
  if (reviews.length === 0) return;
  const profile = await storage.getUserProfile(userId);
  if (!profile.user) return;
  const excludeTitles = [
    ...profile.history.map((h) => h.title),
    ...profile.rejected.map((r) => r.title),
    ...(await storage.getWatchlist(userId)).map((w) => w.title)
  ];
  const scored = await scoreGuardianArchiveForUser(
    {
      genres: profile.genres,
      actors: profile.actors,
      directors: profile.directors,
      moods: profile.moods,
      favourites: profile.favourites,
      history: profile.history,
      rejected: profile.rejected
    },
    reviews,
    excludeTitles,
    guidance
  );
  await storage.deleteStaleUserGuardianPicks(userId);
  for (const pick of scored) {
    await storage.insertUserGuardianPick({
      userId,
      reviewId: pick.reviewId,
      relevanceScore: pick.relevanceScore,
      reason: pick.reason,
      batchDate: date
    });
  }
}
async function scoreNewReleasesForUser(userId, releases, batchDate, guidance) {
  const date = batchDate || (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
  const recentReleases = releases || await storage.getRecentNewReleases(14);
  if (recentReleases.length === 0) {
    console.log(`[cron] No recent releases to score for user ${userId}`);
    return;
  }
  const profile = await storage.getUserProfile(userId);
  if (!profile.user) return;
  const excludeTitles = [
    ...profile.history.map((h) => h.title),
    ...profile.rejected.map((r) => r.title),
    ...(await storage.getWatchlist(userId)).map((w) => w.title)
  ];
  const scored = await scoreReleasesForUser(
    {
      genres: profile.genres,
      actors: profile.actors,
      directors: profile.directors,
      moods: profile.moods,
      favourites: profile.favourites,
      history: profile.history,
      rejected: profile.rejected
    },
    recentReleases,
    excludeTitles,
    guidance
  );
  await storage.deleteStaleUserPicks(userId);
  for (const pick of scored) {
    const release = await storage.getNewReleaseByTmdbId(pick.tmdbId);
    if (!release) continue;
    await storage.insertUserPick({
      userId,
      releaseId: release.id,
      relevanceScore: pick.relevanceScore,
      reason: pick.reason,
      batchDate: date
    });
  }
}

// server/routes.ts
init_tmdb();
function registerRoutes(app2) {
  app2.post("/api/users", async (req, res) => {
    try {
      const user = await storage.createUser();
      res.status(201).json(user);
    } catch (error) {
      console.error("Error creating user:", error);
      res.status(500).json({ error: "Failed to create user" });
    }
  });
  app2.get("/api/users/:id", async (req, res) => {
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
  app2.post("/api/users/:id/complete-onboarding", async (req, res) => {
    try {
      await storage.completeOnboarding(req.params.id);
      res.json({ success: true });
    } catch (error) {
      console.error("Error completing onboarding:", error);
      res.status(500).json({ error: "Failed to complete onboarding" });
    }
  });
  app2.get("/api/users/:id/profile", async (req, res) => {
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
  app2.get("/api/users/:userId/genres", async (req, res) => {
    try {
      const genres = await storage.getGenrePreferences(req.params.userId);
      res.json(genres);
    } catch (error) {
      console.error("Error fetching genres:", error);
      res.status(500).json({ error: "Failed to fetch genres" });
    }
  });
  app2.post("/api/users/:userId/genres", async (req, res) => {
    try {
      const genre = await storage.setGenrePreference({
        userId: req.params.userId,
        genre: req.body.genre,
        rating: req.body.rating
      });
      res.status(201).json(genre);
    } catch (error) {
      console.error("Error setting genre preference:", error);
      res.status(500).json({ error: "Failed to set genre preference" });
    }
  });
  app2.get("/api/users/:userId/actors", async (req, res) => {
    try {
      const actors = await storage.getActorPreferences(req.params.userId);
      res.json(actors);
    } catch (error) {
      console.error("Error fetching actors:", error);
      res.status(500).json({ error: "Failed to fetch actors" });
    }
  });
  app2.post("/api/users/:userId/actors", async (req, res) => {
    try {
      const actor = await storage.addActorPreference({
        userId: req.params.userId,
        actorName: req.body.actorName,
        rating: req.body.rating || 5
      });
      res.status(201).json(actor);
    } catch (error) {
      console.error("Error adding actor:", error);
      res.status(500).json({ error: "Failed to add actor" });
    }
  });
  app2.delete("/api/actors/:id", async (req, res) => {
    try {
      await storage.deleteActorPreference(req.params.id);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting actor:", error);
      res.status(500).json({ error: "Failed to delete actor" });
    }
  });
  app2.get("/api/users/:userId/directors", async (req, res) => {
    try {
      const directors = await storage.getDirectorPreferences(req.params.userId);
      res.json(directors);
    } catch (error) {
      console.error("Error fetching directors:", error);
      res.status(500).json({ error: "Failed to fetch directors" });
    }
  });
  app2.post("/api/users/:userId/directors", async (req, res) => {
    try {
      const director = await storage.addDirectorPreference({
        userId: req.params.userId,
        directorName: req.body.directorName,
        rating: req.body.rating || 5
      });
      res.status(201).json(director);
    } catch (error) {
      console.error("Error adding director:", error);
      res.status(500).json({ error: "Failed to add director" });
    }
  });
  app2.delete("/api/directors/:id", async (req, res) => {
    try {
      await storage.deleteDirectorPreference(req.params.id);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting director:", error);
      res.status(500).json({ error: "Failed to delete director" });
    }
  });
  app2.get("/api/users/:userId/moods", async (req, res) => {
    try {
      const moods = await storage.getMoodPreferences(req.params.userId);
      res.json(moods);
    } catch (error) {
      console.error("Error fetching moods:", error);
      res.status(500).json({ error: "Failed to fetch moods" });
    }
  });
  app2.post("/api/users/:userId/moods", async (req, res) => {
    try {
      const mood = await storage.setMoodPreference({
        userId: req.params.userId,
        mood: req.body.mood,
        rating: req.body.rating
      });
      res.status(201).json(mood);
    } catch (error) {
      console.error("Error setting mood:", error);
      res.status(500).json({ error: "Failed to set mood" });
    }
  });
  app2.get("/api/users/:userId/favourites", async (req, res) => {
    try {
      const favourites = await storage.getFavouriteTitles(req.params.userId);
      res.json(favourites);
    } catch (error) {
      console.error("Error fetching favourites:", error);
      res.status(500).json({ error: "Failed to fetch favourites" });
    }
  });
  app2.post("/api/users/:userId/favourites", async (req, res) => {
    try {
      const favourite = await storage.addFavouriteTitle({
        userId: req.params.userId,
        title: req.body.title,
        mediaType: req.body.mediaType,
        year: req.body.year,
        reason: req.body.reason
      });
      res.status(201).json(favourite);
    } catch (error) {
      console.error("Error adding favourite:", error);
      res.status(500).json({ error: "Failed to add favourite" });
    }
  });
  app2.delete("/api/favourites/:id", async (req, res) => {
    try {
      await storage.deleteFavouriteTitle(req.params.id);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting favourite:", error);
      res.status(500).json({ error: "Failed to delete favourite" });
    }
  });
  app2.get("/api/users/:userId/history", async (req, res) => {
    try {
      const history = await storage.getWatchHistory(req.params.userId);
      res.json(history);
    } catch (error) {
      console.error("Error fetching history:", error);
      res.status(500).json({ error: "Failed to fetch history" });
    }
  });
  app2.post("/api/users/:userId/history", async (req, res) => {
    try {
      const item = await storage.addToWatchHistory({
        userId: req.params.userId,
        title: req.body.title,
        mediaType: req.body.mediaType,
        year: req.body.year,
        rating: req.body.rating,
        notes: req.body.notes
      });
      res.status(201).json(item);
    } catch (error) {
      console.error("Error adding to history:", error);
      res.status(500).json({ error: "Failed to add to history" });
    }
  });
  app2.patch("/api/history/:id/rating", async (req, res) => {
    try {
      await storage.updateWatchHistoryRating(req.params.id, req.body.rating);
      res.json({ success: true });
    } catch (error) {
      console.error("Error updating rating:", error);
      res.status(500).json({ error: "Failed to update rating" });
    }
  });
  app2.get("/api/users/:userId/rejected", async (req, res) => {
    try {
      const rejected = await storage.getRejectedItems(req.params.userId);
      res.json(rejected);
    } catch (error) {
      console.error("Error fetching rejected:", error);
      res.status(500).json({ error: "Failed to fetch rejected" });
    }
  });
  app2.post("/api/users/:userId/rejected", async (req, res) => {
    try {
      const item = await storage.addRejectedItem({
        userId: req.params.userId,
        title: req.body.title,
        mediaType: req.body.mediaType,
        year: req.body.year,
        reason: req.body.reason
      });
      res.status(201).json(item);
    } catch (error) {
      console.error("Error rejecting item:", error);
      res.status(500).json({ error: "Failed to reject item" });
    }
  });
  app2.get("/api/users/:userId/watchlist", async (req, res) => {
    try {
      const watchlist2 = await storage.getEnrichedWatchlist(req.params.userId);
      res.json(watchlist2);
    } catch (error) {
      console.error("Error fetching watchlist:", error);
      res.status(500).json({ error: "Failed to fetch watchlist" });
    }
  });
  app2.post("/api/users/:userId/watchlist", async (req, res) => {
    try {
      const item = await storage.addToWatchlist({
        userId: req.params.userId,
        title: req.body.title,
        mediaType: req.body.mediaType,
        year: req.body.year,
        priority: req.body.priority || 0,
        recommendationReason: req.body.recommendationReason
      });
      res.status(201).json(item);
    } catch (error) {
      console.error("Error adding to watchlist:", error);
      res.status(500).json({ error: "Failed to add to watchlist" });
    }
  });
  app2.delete("/api/watchlist/:id", async (req, res) => {
    try {
      await storage.removeFromWatchlist(req.params.id);
      res.json({ success: true });
    } catch (error) {
      console.error("Error removing from watchlist:", error);
      res.status(500).json({ error: "Failed to remove from watchlist" });
    }
  });
  app2.patch("/api/watchlist/:id/priority", async (req, res) => {
    try {
      await storage.updateWatchlistPriority(req.params.id, req.body.priority);
      res.json({ success: true });
    } catch (error) {
      console.error("Error updating priority:", error);
      res.status(500).json({ error: "Failed to update priority" });
    }
  });
  app2.post("/api/users/:userId/recommendations", async (req, res) => {
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
          rejected: profile.rejected
        },
        req.body.request
      );
      const enriched = await Promise.all(
        recommendations.map(async (rec) => {
          try {
            const tmdb = await searchTitle(rec.title, rec.year, rec.mediaType);
            if (tmdb) {
              rec.posterPath = tmdb.posterPath;
              rec.trailerUrl = tmdb.trailerKey ? `https://www.youtube.com/watch?v=${tmdb.trailerKey}` : null;
            }
          } catch {
          }
          return rec;
        })
      );
      for (const rec of enriched) {
        await storage.logRecommendation({
          userId: req.params.userId,
          title: rec.title,
          mediaType: rec.mediaType,
          year: rec.year,
          reason: rec.reason,
          prompt: req.body.request || "profile-based"
        });
      }
      res.json(enriched);
    } catch (error) {
      console.error("Error generating recommendations:", error);
      res.status(500).json({ error: "Failed to generate recommendations" });
    }
  });
  app2.post("/api/parse-request", async (req, res) => {
    try {
      const parsed = await parseNaturalLanguageRequest(req.body.request);
      res.json(parsed);
    } catch (error) {
      console.error("Error parsing request:", error);
      res.status(500).json({ error: "Failed to parse request" });
    }
  });
  app2.get("/api/users/:userId/insights", async (req, res) => {
    try {
      const profile = await storage.getUserProfile(req.params.userId);
      if (!profile.user) {
        return res.status(404).json({ error: "User not found" });
      }
      const insights = await generateTasteInsights({
        genres: profile.genres,
        actors: profile.actors,
        directors: profile.directors,
        moods: profile.moods,
        favourites: profile.favourites,
        history: profile.history,
        rejected: profile.rejected
      });
      res.json(insights);
    } catch (error) {
      console.error("Error generating insights:", error);
      res.status(500).json({ error: "Failed to generate insights" });
    }
  });
  app2.get("/api/users/:userId/recommendation-log", async (req, res) => {
    try {
      const log = await storage.getRecommendationLog(req.params.userId);
      res.json(log);
    } catch (error) {
      console.error("Error fetching log:", error);
      res.status(500).json({ error: "Failed to fetch log" });
    }
  });
  app2.patch("/api/recommendation-log/:id/outcome", async (req, res) => {
    try {
      await storage.updateRecommendationOutcome(req.params.id, req.body.outcome);
      res.json({ success: true });
    } catch (error) {
      console.error("Error updating outcome:", error);
      res.status(500).json({ error: "Failed to update outcome" });
    }
  });
  app2.get("/api/users/:userId/recommendation-stats", async (req, res) => {
    try {
      const stats = await storage.getRecommendationStats(req.params.userId);
      res.json(stats);
    } catch (error) {
      console.error("Error fetching stats:", error);
      res.status(500).json({ error: "Failed to fetch stats" });
    }
  });
  app2.get("/api/streaming-providers", async (req, res) => {
    try {
      const providers = await storage.getStreamingProviders();
      res.json(providers);
    } catch (error) {
      console.error("Error fetching streaming providers:", error);
      res.status(500).json({ error: "Failed to fetch streaming providers" });
    }
  });
  app2.get("/api/users/:userId/picks", async (req, res) => {
    try {
      const userId = req.params.userId;
      const mediaType = req.query.mediaType;
      const provider = req.query.provider;
      const [newPicks, guardianPicks] = await Promise.all([
        storage.getUserPicks(userId, mediaType),
        storage.getUserGuardianPicks(userId)
      ]);
      const filterByProvider = (streamingUk) => {
        if (!provider) return true;
        if (!Array.isArray(streamingUk)) return false;
        return streamingUk.some(
          (s) => s?.provider === provider
        );
      };
      const unified = [];
      for (const p of newPicks) {
        if (mediaType && p.release.mediaType !== mediaType) continue;
        if (!filterByProvider(p.release.streamingUk)) continue;
        unified.push({
          id: p.id,
          source: "new_release",
          relevanceScore: p.relevanceScore,
          reason: p.reason,
          status: p.status || "new",
          item: p.release
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
          item: p.review
        });
      }
      unified.sort((a, b) => (b.relevanceScore || 0) - (a.relevanceScore || 0));
      res.json(unified);
    } catch (error) {
      console.error("Error fetching unified picks:", error);
      res.status(500).json({ error: "Failed to fetch picks" });
    }
  });
  app2.post("/api/users/:userId/picks/:pickId/action", async (req, res) => {
    try {
      const userId = req.params.userId;
      const pickId = req.params.pickId;
      const { action, rating, reason } = req.body;
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
            recommendationReason: gpick.reason
          });
          await storage.updateUserGuardianPickStatus(pickId, "added_to_watchlist");
        } else if (action === "watched") {
          await storage.addToWatchHistory({
            userId,
            title: r.title,
            mediaType: r.mediaType,
            year: r.year,
            rating
          });
          await storage.updateUserGuardianPickStatus(pickId, "watched");
        } else if (action === "rejected") {
          await storage.addRejectedItem({
            userId,
            title: r.title,
            mediaType: r.mediaType,
            year: r.year,
            reason: reason || "Not interested"
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
            recommendationReason: npick.reason
          });
          await storage.updateUserPickStatus(pickId, "added_to_watchlist");
        } else if (action === "watched") {
          await storage.addToWatchHistory({
            userId,
            title: r.title,
            mediaType: r.mediaType,
            year: r.year,
            rating
          });
          await storage.updateUserPickStatus(pickId, "watched");
        } else if (action === "rejected") {
          await storage.addRejectedItem({
            userId,
            title: r.title,
            mediaType: r.mediaType,
            year: r.year,
            reason: reason || "Not interested"
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
  app2.post("/api/users/:userId/picks/refresh", async (req, res) => {
    try {
      const userId = req.params.userId;
      const guidance = req.body?.guidance;
      await Promise.all([
        scoreNewReleasesForUser(userId, void 0, void 0, guidance),
        scoreGuardianPicksForUser(userId, void 0, guidance)
      ]);
      res.json({ success: true });
    } catch (error) {
      console.error("Error refreshing picks:", error);
      res.status(500).json({ error: "Failed to refresh picks" });
    }
  });
  app2.get("/api/guardian-reviews-recent", async (req, res) => {
    try {
      const days = req.query.days ? parseInt(req.query.days, 10) : 60;
      const limit = req.query.limit ? parseInt(req.query.limit, 10) : 50;
      const reviews = await storage.getRecentGuardianReviews(days, limit);
      res.json(reviews);
    } catch (error) {
      console.error("Error fetching recent guardian reviews:", error);
      res.status(500).json({ error: "Failed to fetch recent guardian reviews" });
    }
  });
  app2.get("/api/users/:userId/guardian-picks", async (req, res) => {
    try {
      const picks = await storage.getUserGuardianPicks(req.params.userId);
      res.json(picks);
    } catch (error) {
      console.error("Error fetching guardian picks:", error);
      res.status(500).json({ error: "Failed to fetch guardian picks" });
    }
  });
  app2.post("/api/users/:userId/guardian-picks/refresh", async (req, res) => {
    try {
      const guidance = req.body?.guidance;
      await scoreGuardianPicksForUser(req.params.userId, void 0, guidance);
      const picks = await storage.getUserGuardianPicks(req.params.userId);
      res.json(picks);
    } catch (error) {
      console.error("Error refreshing guardian picks:", error);
      res.status(500).json({ error: "Failed to refresh guardian picks" });
    }
  });
  app2.post("/api/users/:userId/guardian-picks/:pickId/action", async (req, res) => {
    try {
      const { action, rating } = req.body;
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
          recommendationReason: pick.reason
        });
        await storage.updateUserGuardianPickStatus(pickId, "added_to_watchlist");
      } else if (action === "watched") {
        await storage.addToWatchHistory({
          userId,
          title: review.title,
          mediaType: review.mediaType,
          year: review.year,
          rating: rating || void 0
        });
        await storage.updateUserGuardianPickStatus(pickId, "watched");
      } else if (action === "rejected") {
        await storage.addRejectedItem({
          userId,
          title: review.title,
          mediaType: review.mediaType,
          year: review.year,
          reason: req.body?.reason || "Not interested"
        });
        await storage.updateUserGuardianPickStatus(pickId, "rejected");
      }
      res.json({ success: true });
    } catch (error) {
      console.error("Error handling guardian pick action:", error);
      res.status(500).json({ error: "Failed to handle action" });
    }
  });
  app2.post("/api/admin/guardian-archive-backfill", async (req, res) => {
    const adminSecret = process.env.ADMIN_SECRET;
    if (adminSecret && req.headers["x-admin-key"] !== adminSecret) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    try {
      const days = req.body?.days ? parseInt(req.body.days, 10) : 365;
      const result = await fetchAndStoreGuardianArchive(days);
      res.json({ success: true, ...result });
    } catch (error) {
      console.error("Error backfilling archive:", error);
      res.status(500).json({ error: "Failed to backfill archive" });
    }
  });
  app2.get("/api/users/:userId/new-for-you", async (req, res) => {
    try {
      const mediaType = req.query.mediaType;
      const picks = await storage.getUserPicks(req.params.userId, mediaType);
      res.json(picks);
    } catch (error) {
      console.error("Error fetching picks:", error);
      res.status(500).json({ error: "Failed to fetch picks" });
    }
  });
  app2.post("/api/users/:userId/new-for-you/:pickId/action", async (req, res) => {
    try {
      const { action, rating } = req.body;
      const userId = req.params.userId;
      const pickId = req.params.pickId;
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
          recommendationReason: pick.reason
        });
        await storage.updateUserPickStatus(pickId, "added_to_watchlist");
      } else if (action === "watched") {
        await storage.addToWatchHistory({
          userId,
          title: release.title,
          mediaType: release.mediaType,
          year: release.year,
          rating: rating || void 0
        });
        await storage.updateUserPickStatus(pickId, "watched");
      } else if (action === "rejected") {
        await storage.addRejectedItem({
          userId,
          title: release.title,
          mediaType: release.mediaType,
          year: release.year,
          reason: req.body.reason || "Not interested"
        });
        await storage.updateUserPickStatus(pickId, "rejected");
      }
      res.json({ success: true });
    } catch (error) {
      console.error("Error handling pick action:", error);
      res.status(500).json({ error: "Failed to handle action" });
    }
  });
  app2.post("/api/users/:userId/new-for-you/refresh", async (req, res) => {
    try {
      const guidance = req.body.guidance;
      await scoreNewReleasesForUser(req.params.userId, void 0, void 0, guidance);
      const picks = await storage.getUserPicks(req.params.userId);
      res.json(picks);
    } catch (error) {
      console.error("Error refreshing picks:", error);
      res.status(500).json({ error: "Failed to refresh picks" });
    }
  });
  app2.post("/api/admin/add-release", async (req, res) => {
    const adminSecret = process.env.ADMIN_SECRET;
    if (adminSecret && req.headers["x-admin-key"] !== adminSecret) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    const { tmdbId, mediaType } = req.body;
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
  app2.post("/api/admin/run-new-releases", async (req, res) => {
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

// server/auth.ts
function safeUser(user) {
  if (!user) return null;
  const { passwordHash, ...safe } = user;
  return safe;
}
function registerAuthRoutes(app2) {
  app2.post("/api/auth/register", async (req, res) => {
    try {
      const { email, password } = req.body;
      if (!email || !password) {
        return res.status(400).json({ error: "Email and password required" });
      }
      if (password.length < 6) {
        return res.status(400).json({ error: "Password must be at least 6 characters" });
      }
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
  app2.post("/api/auth/login", async (req, res) => {
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
  app2.post("/api/auth/logout", (req, res) => {
    req.session.destroy((err) => {
      if (err) {
        console.error("Logout error:", err);
        return res.status(500).json({ error: "Failed to logout" });
      }
      res.json({ success: true });
    });
  });
  app2.get("/api/auth/me", async (req, res) => {
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
  app2.post("/api/auth/link", async (req, res) => {
    try {
      const { userId, email, password } = req.body;
      if (!userId || !email || !password) {
        return res.status(400).json({ error: "userId, email, and password required" });
      }
      if (password.length < 6) {
        return res.status(400).json({ error: "Password must be at least 6 characters" });
      }
      const existing = await storage.getUserByEmail(email);
      if (existing) {
        return res.status(409).json({ error: "Email already registered" });
      }
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }
      const updated = await storage.linkEmailToUser(userId, email, password);
      req.session.userId = updated.id;
      res.json(safeUser(updated));
    } catch (error) {
      console.error("Link error:", error);
      res.status(500).json({ error: "Failed to link account" });
    }
  });
  app2.post("/api/auth/anonymous", async (req, res) => {
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

// server/index.ts
var __filename = fileURLToPath(import.meta.url);
var __dirname = path.dirname(__filename);
var app = express();
app.set("trust proxy", 1);
app.use(cors({
  origin: [
    "https://adaptiveedge.uk",
    "capacitor://localhost",
    "http://localhost",
    "https://localhost"
  ],
  credentials: true
}));
app.use(express.json());
app.use(session({
  secret: process.env.SESSION_SECRET || "watchlist-secret-change-in-production",
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: false,
    httpOnly: true,
    sameSite: "none",
    maxAge: 30 * 24 * 60 * 60 * 1e3
    // 30 days
  }
}));
registerAuthRoutes(app);
registerRoutes(app);
var publicPath = path.join(__dirname, "public");
app.use(express.static(publicPath));
app.get("*", (req, res) => {
  if (!req.path.startsWith("/api")) {
    res.sendFile(path.join(publicPath, "index.html"));
  }
});
var PORT = process.env.PORT || 5031;
app.listen(PORT, () => {
  console.log(`Watchlist server running on port ${PORT}`);
  initCronJobs();
});
