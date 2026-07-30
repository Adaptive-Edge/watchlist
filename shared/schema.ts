import { mysqlTable, text, varchar, int, timestamp, mysqlEnum, json } from "drizzle-orm/mysql-core";
import { sql, relations } from "drizzle-orm";

// Users table
export const users = mysqlTable("users", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`(UUID())`),
  email: varchar("email", { length: 255 }).unique(),
  passwordHash: varchar("password_hash", { length: 255 }),
  createdAt: timestamp("created_at").defaultNow(),
  onboardingComplete: int("onboarding_complete").default(0),
});

// Genre preferences - normalized table for user genre preferences
export const genrePreferences = mysqlTable("genre_preferences", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`(UUID())`),
  userId: varchar("user_id", { length: 36 }).notNull(),
  genre: varchar("genre", { length: 100 }).notNull(),
  rating: int("rating").notNull().default(3), // 1-5 scale
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow(),
});

// Actor preferences
export const actorPreferences = mysqlTable("actor_preferences", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`(UUID())`),
  userId: varchar("user_id", { length: 36 }).notNull(),
  actorName: varchar("actor_name", { length: 255 }).notNull(),
  rating: int("rating").notNull().default(3),
  createdAt: timestamp("created_at").defaultNow(),
});

// Director preferences
export const directorPreferences = mysqlTable("director_preferences", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`(UUID())`),
  userId: varchar("user_id", { length: 36 }).notNull(),
  directorName: varchar("director_name", { length: 255 }).notNull(),
  rating: int("rating").notNull().default(3),
  createdAt: timestamp("created_at").defaultNow(),
});

// Mood preferences
export const moodPreferences = mysqlTable("mood_preferences", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`(UUID())`),
  userId: varchar("user_id", { length: 36 }).notNull(),
  mood: varchar("mood", { length: 100 }).notNull(), // e.g., "relaxing", "intense", "thought-provoking"
  rating: int("rating").notNull().default(3),
  createdAt: timestamp("created_at").defaultNow(),
});

// Favourite titles - films/shows the user loves (used for recommendations)
export const favouriteTitles = mysqlTable("favourite_titles", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`(UUID())`),
  userId: varchar("user_id", { length: 36 }).notNull(),
  title: varchar("title", { length: 500 }).notNull(),
  mediaType: mysqlEnum("media_type", ["film", "tv"]).notNull(),
  year: int("year"),
  reason: text("reason"), // Why they love it
  createdAt: timestamp("created_at").defaultNow(),
});

// Watch history - what the user has watched
export const watchHistory = mysqlTable("watch_history", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`(UUID())`),
  userId: varchar("user_id", { length: 36 }).notNull(),
  title: varchar("title", { length: 500 }).notNull(),
  mediaType: mysqlEnum("media_type", ["film", "tv"]).notNull(),
  year: int("year"),
  watchedDate: timestamp("watched_date").defaultNow(),
  rating: mysqlEnum("rating", ["loved", "ok", "disliked"]),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow(),
});

// Rejected items - user said "not interested"
export const rejectedItems = mysqlTable("rejected_items", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`(UUID())`),
  userId: varchar("user_id", { length: 36 }).notNull(),
  title: varchar("title", { length: 500 }).notNull(),
  mediaType: mysqlEnum("media_type", ["film", "tv"]).notNull(),
  year: int("year"),
  reason: text("reason"), // Why they're not interested
  createdAt: timestamp("created_at").defaultNow(),
});

// Watchlist - saved for later
export const watchlist = mysqlTable("watchlist", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`(UUID())`),
  userId: varchar("user_id", { length: 36 }).notNull(),
  title: varchar("title", { length: 500 }).notNull(),
  mediaType: mysqlEnum("media_type", ["film", "tv"]).notNull(),
  year: int("year"),
  priority: int("priority").default(0), // Higher = more important
  recommendationReason: text("recommendation_reason"), // Why we recommended it
  addedDate: timestamp("added_date").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Recommendations log - track what we've recommended
export const recommendationLog = mysqlTable("recommendation_log", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`(UUID())`),
  userId: varchar("user_id", { length: 36 }).notNull(),
  title: varchar("title", { length: 500 }).notNull(),
  mediaType: mysqlEnum("media_type", ["film", "tv"]).notNull(),
  year: int("year"),
  reason: text("reason"),
  prompt: text("prompt"), // The prompt used to generate this recommendation
  outcome: mysqlEnum("outcome", ["added_to_watchlist", "watched", "rejected", "no_action"]),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow(),
});

// New releases - cached TMDB + Guardian data (fetched daily)
export const newReleases = mysqlTable("new_releases", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`(UUID())`),
  tmdbId: int("tmdb_id").notNull().unique(),
  imdbId: varchar("imdb_id", { length: 20 }),
  title: varchar("title", { length: 500 }).notNull(),
  mediaType: mysqlEnum("media_type", ["film", "tv"]).notNull(),
  year: int("year"),
  releaseDate: varchar("release_date", { length: 20 }),
  overview: text("overview"),
  genres: json("genres"), // string[]
  posterPath: varchar("poster_path", { length: 500 }),
  tmdbRating: varchar("tmdb_rating", { length: 10 }),
  voteCount: int("vote_count"), // TMDB vote count — low counts make ratings unreliable
  originalLanguage: varchar("original_language", { length: 10 }),
  cast: json("cast"), // string[] (top 5)
  directors: json("directors"), // string[]
  streamingUk: json("streaming_uk"), // { provider: string, logoPath: string }[]
  trailerKey: varchar("trailer_key", { length: 50 }),
  inCinemas: int("in_cinemas").default(0),
  guardianUrl: varchar("guardian_url", { length: 1000 }),
  guardianRating: int("guardian_rating"), // 1-5 stars
  guardianExcerpt: text("guardian_excerpt"),
  guardianBody: text("guardian_body"),
  fetchedDate: timestamp("fetched_date").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow(),
});

// Guardian reviews archive — kept independently of new_releases so we can show
// older reviews and score them for personalised "Guardian — for you" picks.
export const guardianReviews = mysqlTable("guardian_reviews", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`(UUID())`),
  url: varchar("url", { length: 500 }).notNull().unique(),
  title: varchar("title", { length: 500 }).notNull(),
  section: varchar("section", { length: 50 }), // 'film' | 'tv-and-radio'
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
  createdAt: timestamp("created_at").defaultNow(),
});

// Per-user scored Guardian archive picks
export const userGuardianPicks = mysqlTable("user_guardian_picks", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`(UUID())`),
  userId: varchar("user_id", { length: 36 }).notNull(),
  reviewId: varchar("review_id", { length: 36 }).notNull(),
  relevanceScore: int("relevance_score"),
  reason: text("reason"),
  status: mysqlEnum("status", ["new", "added_to_watchlist", "watched", "rejected"]).default("new"),
  batchDate: varchar("batch_date", { length: 20 }),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow(),
});

// User picks - per-user scored recommendations from daily job
export const userPicks = mysqlTable("user_picks", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`(UUID())`),
  userId: varchar("user_id", { length: 36 }).notNull(),
  releaseId: varchar("release_id", { length: 36 }).notNull(),
  relevanceScore: int("relevance_score"),
  reason: text("reason"),
  status: mysqlEnum("status", ["new", "added_to_watchlist", "watched", "rejected"]).default("new"),
  batchDate: varchar("batch_date", { length: 20 }),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow(),
});

// Types
export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

export type GenrePreference = typeof genrePreferences.$inferSelect;
export type InsertGenrePreference = typeof genrePreferences.$inferInsert;

export type ActorPreference = typeof actorPreferences.$inferSelect;
export type InsertActorPreference = typeof actorPreferences.$inferInsert;

export type DirectorPreference = typeof directorPreferences.$inferSelect;
export type InsertDirectorPreference = typeof directorPreferences.$inferInsert;

export type MoodPreference = typeof moodPreferences.$inferSelect;
export type InsertMoodPreference = typeof moodPreferences.$inferInsert;

export type FavouriteTitle = typeof favouriteTitles.$inferSelect;
export type InsertFavouriteTitle = typeof favouriteTitles.$inferInsert;

export type WatchHistoryItem = typeof watchHistory.$inferSelect;
export type InsertWatchHistoryItem = typeof watchHistory.$inferInsert;

export type RejectedItem = typeof rejectedItems.$inferSelect;
export type InsertRejectedItem = typeof rejectedItems.$inferInsert;

export type WatchlistItem = typeof watchlist.$inferSelect;
export type InsertWatchlistItem = typeof watchlist.$inferInsert;

export type RecommendationLogItem = typeof recommendationLog.$inferSelect;
export type InsertRecommendationLogItem = typeof recommendationLog.$inferInsert;

export type NewRelease = typeof newReleases.$inferSelect;
export type InsertNewRelease = typeof newReleases.$inferInsert;

export type UserPick = typeof userPicks.$inferSelect;
export type InsertUserPick = typeof userPicks.$inferInsert;

export type GuardianReview = typeof guardianReviews.$inferSelect;
export type InsertGuardianReview = typeof guardianReviews.$inferInsert;

export type UserGuardianPick = typeof userGuardianPicks.$inferSelect;
export type InsertUserGuardianPick = typeof userGuardianPicks.$inferInsert;
