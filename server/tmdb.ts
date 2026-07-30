const TMDB_BASE = "https://api.themoviedb.org/3";
const TMDB_IMAGE_BASE = "https://image.tmdb.org/t/p";

function apiKey(): string {
  const key = process.env.TMDB_API_KEY;
  if (!key) throw new Error("TMDB_API_KEY not set");
  return key;
}

async function tmdbGet(path: string, params: Record<string, string> = {}): Promise<any> {
  const url = new URL(`${TMDB_BASE}${path}`);
  url.searchParams.set("api_key", apiKey());
  url.searchParams.set("language", "en-GB");
  for (const [k, v] of Object.entries(params)) {
    url.searchParams.set(k, v);
  }
  const res = await fetch(url.toString());
  if (!res.ok) {
    throw new Error(`TMDB ${path} failed: ${res.status} ${res.statusText}`);
  }
  return res.json();
}

interface RawTitle {
  tmdbId: number;
  title: string;
  mediaType: "film" | "tv";
  year: number | null;
  releaseDate: string | null;
  overview: string;
  posterPath: string | null;
  tmdbRating: string;
  genreIds: number[];
  inCinemas: boolean;
}

export async function fetchNewReleases(): Promise<RawTitle[]> {
  const seen = new Set<string>();
  const results: RawTitle[] = [];

  // Track cinema titles separately so we can flag them
  const cinemaTmdbIds = new Set<number>();

  const endpoints = [
    { path: "/movie/now_playing", type: "film" as const, params: { region: "GB" }, cinema: true },
    { path: "/movie/upcoming", type: "film" as const, params: { region: "GB" }, cinema: false },
    { path: "/tv/airing_today", type: "tv" as const, params: {} as Record<string, string>, cinema: false },
    { path: "/tv/on_the_air", type: "tv" as const, params: {} as Record<string, string>, cinema: false },
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
          inCinemas: cinemaTmdbIds.has(item.id),
        });
      }
    } catch (err) {
      console.error(`Failed to fetch ${ep.path}:`, err);
    }
  }

  return results;
}

interface TitleDetails {
  genres: string[];
  cast: string[];
  directors: string[];
  streamingUk: Array<{ provider: string; logoPath: string }>;
  trailerKey: string | null;
  imdbId: string | null;
}

export async function fetchTitleDetails(
  tmdbId: number,
  mediaType: "film" | "tv"
): Promise<TitleDetails> {
  const type = mediaType === "film" ? "movie" : "tv";
  const data = await tmdbGet(`/${type}/${tmdbId}`, {
    append_to_response: "credits,watch/providers,videos,external_ids",
  });

  const genres = (data.genres || []).map((g: any) => g.name);

  const credits = data.credits || {};
  const cast = (credits.cast || [])
    .slice(0, 5)
    .map((c: any) => c.name);

  let directors: string[];
  if (mediaType === "film") {
    directors = (credits.crew || [])
      .filter((c: any) => c.job === "Director")
      .map((c: any) => c.name);
  } else {
    directors = (data.created_by || []).map((c: any) => c.name);
  }

  const gbProviders = data["watch/providers"]?.results?.GB || {};
  const flatrate = (gbProviders.flatrate || []).map((p: any) => ({
    provider: p.provider_name,
    logoPath: p.logo_path,
    type: "stream" as const,
  }));
  const rent = (gbProviders.rent || []).map((p: any) => ({
    provider: p.provider_name,
    logoPath: p.logo_path,
    type: "rent" as const,
  }));
  const buy = (gbProviders.buy || []).map((p: any) => ({
    provider: p.provider_name,
    logoPath: p.logo_path,
    type: "buy" as const,
  }));
  const streamingUk = [...flatrate, ...rent.slice(0, 3), ...buy.slice(0, 3)];

  const trailerKey = extractTrailerKey(data.videos?.results || []);

  // IMDB ID: directly on movies, via external_ids for TV
  const imdbId = data.imdb_id || data.external_ids?.imdb_id || null;

  return { genres, cast, directors, streamingUk, trailerKey, imdbId };
}

function extractTrailerKey(videos: any[]): string | null {
  // Prefer official YouTube trailers, then teasers
  const trailer = videos.find(
    (v: any) => v.site === "YouTube" && v.type === "Trailer" && v.official
  ) || videos.find(
    (v: any) => v.site === "YouTube" && v.type === "Trailer"
  ) || videos.find(
    (v: any) => v.site === "YouTube" && v.type === "Teaser"
  );
  return trailer?.key || null;
}

export interface SearchResult {
  tmdbId: number;
  posterPath: string | null;
  trailerKey: string | null;
}

export async function searchTitle(
  title: string,
  year: number | null,
  mediaType: "film" | "tv"
): Promise<SearchResult | null> {
  try {
    const type = mediaType === "film" ? "movie" : "tv";
    const params: Record<string, string> = { query: title };
    if (year) params.year = year.toString();

    const data = await tmdbGet(`/search/${type}`, params);
    const first = data.results?.[0];
    if (!first) return null;

    // Fetch trailer
    let trailerKey: string | null = null;
    try {
      const videos = await tmdbGet(`/${type}/${first.id}/videos`);
      trailerKey = extractTrailerKey(videos.results || []);
    } catch {}

    return {
      tmdbId: first.id,
      posterPath: first.poster_path || null,
      trailerKey,
    };
  } catch {
    return null;
  }
}

export function buildPosterUrl(posterPath: string, size = "w300"): string {
  return `${TMDB_IMAGE_BASE}/${size}${posterPath}`;
}

export async function fetchBasicInfo(
  tmdbId: number,
  mediaType: "film" | "tv"
): Promise<{ year: number | null; tmdbRating: string | null }> {
  try {
    const type = mediaType === "film" ? "movie" : "tv";
    const data = await tmdbGet(`/${type}/${tmdbId}`);
    const date = data.release_date || data.first_air_date;
    return {
      year: date ? parseInt(date.substring(0, 4)) : null,
      tmdbRating: data.vote_average ? (data.vote_average as number).toFixed(1) : null,
    };
  } catch {
    return { year: null, tmdbRating: null };
  }
}

export async function enrichReleases(
  rawTitles: RawTitle[]
): Promise<Array<RawTitle & TitleDetails>> {
  const results: Array<RawTitle & TitleDetails> = [];
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
            inCinemas: title.inCinemas,
          };
        }
      })
    );
    results.push(...details);
  }

  return results;
}
