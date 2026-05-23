import { storage } from "./storage";
import { fetchRecentReviews } from "./guardian";
import { searchTitle, fetchTitleDetails } from "./tmdb";

const TMDB_BASE = "https://api.themoviedb.org/3";

async function tmdbGet(path: string, params: Record<string, string> = {}): Promise<any> {
  const url = new URL(`${TMDB_BASE}${path}`);
  url.searchParams.set("api_key", process.env.TMDB_API_KEY || "");
  url.searchParams.set("language", "en-GB");
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  const res = await fetch(url.toString());
  if (!res.ok) throw new Error(`TMDB ${path} ${res.status}`);
  return res.json();
}

// For each Guardian review, try to find a matching TMDB title + fetch full
// details (poster, rating, cast, directors, trailer, streaming).
async function enrichFromTmdb(
  title: string,
  year: number | null,
  mediaType: "film" | "tv"
): Promise<{
  tmdbId: number | null;
  imdbId: string | null;
  year: number | null;
  posterPath: string | null;
  tmdbRating: string | null;
  genres: string[];
  cast: string[];
  directors: string[];
  streamingUk: any[];
  trailerKey: string | null;
}> {
  const empty = {
    tmdbId: null,
    imdbId: null,
    year,
    posterPath: null,
    tmdbRating: null as string | null,
    genres: [] as string[],
    cast: [] as string[],
    directors: [] as string[],
    streamingUk: [] as any[],
    trailerKey: null as string | null,
  };

  const search = await searchTitle(title, year, mediaType);
  if (!search) return empty;

  try {
    const type = mediaType === "film" ? "movie" : "tv";
    const basic = await tmdbGet(`/${type}/${search.tmdbId}`);
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
      tmdbRating: basic.vote_average ? (basic.vote_average as number).toFixed(1) : null,
      genres: details.genres,
      cast: details.cast,
      directors: details.directors,
      streamingUk: details.streamingUk,
      trailerKey: search.trailerKey || details.trailerKey,
    };
  } catch (err) {
    console.error(`[archive] TMDB detail lookup failed for "${title}":`, err);
    return { ...empty, tmdbId: search.tmdbId, posterPath: search.posterPath };
  }
}

export async function fetchAndStoreGuardianArchive(daysBack: number): Promise<{
  fetched: number;
  enriched: number;
  skipped: number;
}> {
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
        // Section inferred from URL path
        const section = /\/tv-and-radio\//.test(review.url) ? "tv-and-radio" : "film";
        const mediaType: "film" | "tv" = section === "tv-and-radio" ? "tv" : "film";

        // Approximate release year from Guardian publication date minus ~0-1y
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
            trailerKey: tmdb.trailerKey,
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
