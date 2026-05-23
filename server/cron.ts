import cron from "node-cron";
import { storage } from "./storage";
import { fetchNewReleases, enrichReleases, fetchTitleDetails } from "./tmdb";
import { fetchRecentReviews, matchReviewsToReleases } from "./guardian";
import { fetchAndStoreGuardianArchive } from "./guardianArchive";
import { scoreReleasesForUser, scoreGuardianArchiveForUser } from "./ai";

const TMDB_BASE = "https://api.themoviedb.org/3";

export function initCronJobs() {
  // Run daily at 06:00 UTC
  cron.schedule("0 6 * * *", () => {
    console.log("[cron] Starting daily new releases job...");
    runDailyNewReleases().catch((err) => {
      console.error("[cron] Daily job failed:", err);
    });
  });

  console.log("[cron] Daily new releases job scheduled for 06:00 UTC");
}

export async function runDailyNewReleases(): Promise<{
  releasesFound: number;
  usersScored: number;
}> {
  const batchDate = new Date().toISOString().split("T")[0];
  console.log(`[cron] Batch date: ${batchDate}`);

  // Phase 1: Fetch from TMDB
  console.log("[cron] Fetching new releases from TMDB...");
  const rawTitles = await fetchNewReleases();
  console.log(`[cron] Found ${rawTitles.length} raw titles`);

  // Phase 2: Enrich with details (cast, directors, streaming)
  console.log("[cron] Enriching with TMDB details...");
  const enriched = await enrichReleases(rawTitles);

  // Phase 3: Fetch Guardian reviews and match
  console.log("[cron] Fetching Guardian reviews...");
  const reviews = await fetchRecentReviews();
  console.log(`[cron] Found ${reviews.length} Guardian reviews`);

  const reviewMap = matchReviewsToReleases(
    reviews,
    enriched.map((r) => ({ tmdbId: r.tmdbId, title: r.title, year: r.year }))
  );
  console.log(`[cron] Matched ${reviewMap.size} reviews to releases`);

  // Phase 4: Upsert into new_releases table
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
      guardianBody: review?.body || null,
    });
  }

  // Phase 5: Score for each user
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

  // Phase 6: Cleanup old data — keep ~12 months so films that fall out of
  // TMDB's now_playing/upcoming feeds don't disappear from picks the moment
  // they leave the cinema window. Old data is cheap; silent deletion is not.
  await storage.cleanOldReleases(400);

  // Phase 7: Guardian archive refresh (incremental) + per-user scoring
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

export async function addTmdbRelease(
  tmdbId: number,
  mediaType: "film" | "tv"
): Promise<{ title: string; year: number | null; guardianMatched: boolean }> {
  const type = mediaType === "film" ? "movie" : "tv";
  const res = await fetch(
    `${TMDB_BASE}/${type}/${tmdbId}?api_key=${process.env.TMDB_API_KEY}&language=en-GB`
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
    guardianBody: review?.body || null,
  });

  return { title, year, guardianMatched: !!review };
}

export async function scoreGuardianPicksForUser(
  userId: string,
  batchDate?: string,
  guidance?: string
): Promise<void> {
  const date = batchDate || new Date().toISOString().split("T")[0];
  const reviews = await storage.getGuardianReviewsForScoring(365);
  if (reviews.length === 0) return;

  const profile = await storage.getUserProfile(userId);
  if (!profile.user) return;

  const excludeTitles = [
    ...profile.history.map((h) => h.title),
    ...profile.rejected.map((r) => r.title),
    ...(await storage.getWatchlist(userId)).map((w) => w.title),
  ];

  const scored = await scoreGuardianArchiveForUser(
    {
      genres: profile.genres,
      actors: profile.actors,
      directors: profile.directors,
      moods: profile.moods,
      favourites: profile.favourites,
      history: profile.history,
      rejected: profile.rejected,
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
      batchDate: date,
    });
  }
}

export async function scoreNewReleasesForUser(
  userId: string,
  releases?: Awaited<ReturnType<typeof storage.getRecentNewReleases>>,
  batchDate?: string,
  guidance?: string
): Promise<void> {
  const date = batchDate || new Date().toISOString().split("T")[0];
  const recentReleases = releases || (await storage.getRecentNewReleases(14));

  if (recentReleases.length === 0) {
    console.log(`[cron] No recent releases to score for user ${userId}`);
    return;
  }

  const profile = await storage.getUserProfile(userId);
  if (!profile.user) return;

  // Build exclude list from watchlist, history, and rejected
  const excludeTitles = [
    ...profile.history.map((h) => h.title),
    ...profile.rejected.map((r) => r.title),
    ...(await storage.getWatchlist(userId)).map((w) => w.title),
  ];

  const scored = await scoreReleasesForUser(
    {
      genres: profile.genres,
      actors: profile.actors,
      directors: profile.directors,
      moods: profile.moods,
      favourites: profile.favourites,
      history: profile.history,
      rejected: profile.rejected,
    },
    recentReleases,
    excludeTitles,
    guidance
  );

  // Replace stale picks
  await storage.deleteStaleUserPicks(userId);

  // Insert new picks
  for (const pick of scored) {
    const release = await storage.getNewReleaseByTmdbId(pick.tmdbId);
    if (!release) continue;

    await storage.insertUserPick({
      userId,
      releaseId: release.id,
      relevanceScore: pick.relevanceScore,
      reason: pick.reason,
      batchDate: date,
    });
  }
}
