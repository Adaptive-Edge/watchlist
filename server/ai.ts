import OpenAI from "openai";
import type { NewRelease, GuardianReview } from "@shared/schema";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

interface UserProfile {
  genres: Array<{ genre: string; rating: number }>;
  actors: Array<{ actorName: string; rating: number }>;
  directors: Array<{ directorName: string; rating: number }>;
  moods: Array<{ mood: string; rating: number }>;
  favourites: Array<{ title: string; mediaType: string; reason?: string | null }>;
  history: Array<{ title: string; mediaType: string; rating?: string | null }>;
  rejected: Array<{ title: string; reason?: string | null }>;
}

export interface Recommendation {
  title: string;
  year: number;
  mediaType: "film" | "tv";
  reason: string;
  imdbScore: number | null;
  rottenTomatoesScore: number | null;
  matchScore: number | null;
  genres: string[];
  posterPath?: string | null;
  trailerUrl?: string | null;
}

export async function generateRecommendations(
  profile: UserProfile,
  userRequest?: string
): Promise<Recommendation[]> {
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
Focus on lesser-known gems alongside popular choices. Consider both what they love AND what they've disliked to refine suggestions.`,
      },
      {
        role: "user",
        content: prompt,
      },
    ],
    response_format: { type: "json_object" },
    temperature: 0.8,
  });

  const content = response.choices[0].message.content;
  if (!content) {
    throw new Error("No response from AI");
  }

  const parsed = JSON.parse(content);
  return parsed.recommendations || [];
}

function buildPrompt(profile: UserProfile, userRequest?: string): string {
  const sections: string[] = [];

  // User request
  if (userRequest) {
    sections.push(`USER REQUEST: "${userRequest}"`);
  }

  // Favourite genres
  const likedGenres = profile.genres.filter((g) => g.rating >= 4).map((g) => g.genre);
  const dislikedGenres = profile.genres.filter((g) => g.rating <= 2).map((g) => g.genre);

  if (likedGenres.length > 0) {
    sections.push(`FAVOURITE GENRES: ${likedGenres.join(", ")}`);
  }
  if (dislikedGenres.length > 0) {
    sections.push(`GENRES TO AVOID: ${dislikedGenres.join(", ")}`);
  }

  // Favourite actors
  if (profile.actors.length > 0) {
    const likedActors = profile.actors.filter((a) => a.rating >= 4).map((a) => a.actorName);
    if (likedActors.length > 0) {
      sections.push(`FAVOURITE ACTORS: ${likedActors.join(", ")}`);
    }
  }

  // Favourite directors
  if (profile.directors.length > 0) {
    const likedDirectors = profile.directors.filter((d) => d.rating >= 4).map((d) => d.directorName);
    if (likedDirectors.length > 0) {
      sections.push(`FAVOURITE DIRECTORS: ${likedDirectors.join(", ")}`);
    }
  }

  // Mood preferences
  if (profile.moods.length > 0) {
    const likedMoods = profile.moods.filter((m) => m.rating >= 4).map((m) => m.mood);
    if (likedMoods.length > 0) {
      sections.push(`PREFERRED MOODS: ${likedMoods.join(", ")}`);
    }
  }

  // Favourite titles (use for context, but also exclude from suggestions)
  if (profile.favourites.length > 0) {
    const favList = profile.favourites
      .map((f) => `${f.title} (${f.mediaType})${f.reason ? ` - "${f.reason}"` : ""}`)
      .join("; ");
    sections.push(`LOVED TITLES (use as reference for taste, but DON'T recommend these - user has already seen them): ${favList}`);
  }

  // Watch history with ratings
  const lovedHistory = profile.history.filter((h) => h.rating === "loved");
  const dislikedHistory = profile.history.filter((h) => h.rating === "disliked");

  if (lovedHistory.length > 0) {
    sections.push(`RECENTLY LOVED: ${lovedHistory.map((h) => h.title).join(", ")}`);
  }
  if (dislikedHistory.length > 0) {
    sections.push(`RECENTLY DISLIKED: ${dislikedHistory.map((h) => h.title).join(", ")}`);
  }

  // Rejected titles with reasons
  if (profile.rejected.length > 0) {
    const withReasons = profile.rejected
      .slice(0, 15)
      .map((r) => r.reason && r.reason !== "Not interested"
        ? `${r.title} (reason: ${r.reason})`
        : r.title)
      .join("; ");
    sections.push(`ALREADY REJECTED (don't suggest these, and learn from the reasons to avoid similar titles): ${withReasons}`);
  }

  // Already watched (don't suggest again)
  if (profile.history.length > 0) {
    const watchedList = profile.history
      .slice(0, 20)
      .map((h) => h.title)
      .join(", ");
    sections.push(`ALREADY WATCHED (don't suggest): ${watchedList}`);
  }

  if (sections.length === 0) {
    return "Please suggest 5 popular, highly-rated films and TV shows across different genres for a new user.";
  }

  return sections.join("\n\n");
}

export async function parseNaturalLanguageRequest(request: string): Promise<{
  intent: "recommendation" | "add_favourite" | "unknown";
  details: Record<string, string>;
}> {
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
}`,
      },
      {
        role: "user",
        content: request,
      },
    ],
    response_format: { type: "json_object" },
    temperature: 0.3,
  });

  const content = response.choices[0].message.content;
  if (!content) {
    return { intent: "unknown", details: {} };
  }

  return JSON.parse(content);
}

export interface TasteInsights {
  summary: string;
  topThemes: string[];
  watchingStyle: string;
  moodProfile: string;
  hiddenGem: string;
}

export async function generateTasteInsights(profile: UserProfile): Promise<TasteInsights> {
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

Be specific and insightful, not generic. Reference actual titles from their profile when relevant.`,
      },
      {
        role: "user",
        content: profileSummary,
      },
    ],
    response_format: { type: "json_object" },
    temperature: 0.7,
  });

  const content = response.choices[0].message.content;
  if (!content) {
    throw new Error("No response from AI");
  }

  return JSON.parse(content);
}

function buildInsightsPrompt(profile: UserProfile): string {
  const sections: string[] = [];

  if (profile.favourites.length > 0) {
    sections.push(`FAVOURITE TITLES: ${profile.favourites.map(f => f.title).join(", ")}`);
  }

  const likedGenres = profile.genres.filter(g => g.rating >= 4).map(g => g.genre);
  const dislikedGenres = profile.genres.filter(g => g.rating <= 2).map(g => g.genre);
  if (likedGenres.length > 0) {
    sections.push(`LIKED GENRES: ${likedGenres.join(", ")}`);
  }
  if (dislikedGenres.length > 0) {
    sections.push(`DISLIKED GENRES: ${dislikedGenres.join(", ")}`);
  }

  const likedMoods = profile.moods.filter(m => m.rating >= 4).map(m => m.mood);
  if (likedMoods.length > 0) {
    sections.push(`PREFERRED MOODS: ${likedMoods.join(", ")}`);
  }

  const lovedHistory = profile.history.filter(h => h.rating === "loved");
  const dislikedHistory = profile.history.filter(h => h.rating === "disliked");
  if (lovedHistory.length > 0) {
    sections.push(`RECENTLY LOVED: ${lovedHistory.map(h => h.title).join(", ")}`);
  }
  if (dislikedHistory.length > 0) {
    sections.push(`RECENTLY DISLIKED: ${dislikedHistory.map(h => h.title).join(", ")}`);
  }

  sections.push(`STATS: ${profile.favourites.length} favourites, ${profile.history.length} watched, ${profile.rejected.length} rejected`);

  return sections.join("\n");
}

// === New For You: Score releases against user taste ===

export interface ScoredPick {
  tmdbId: number;
  relevanceScore: number;
  reason: string;
}

export async function scoreReleasesForUser(
  profile: UserProfile,
  releases: NewRelease[],
  excludeTitles: string[],
  guidance?: string
): Promise<ScoredPick[]> {
  const tasteProfile = buildPrompt(profile);
  const excludeSet = new Set(excludeTitles.map((t) => t.toLowerCase()));

  const candidates = releases.filter(
    (r) => !excludeSet.has(r.title.toLowerCase())
  );

  if (candidates.length === 0) return [];

  const releasesBlock = candidates
    .map((r, i) => {
      const genres = Array.isArray(r.genres) ? (r.genres as string[]).join(", ") : "";
      const cast = Array.isArray(r.cast) ? (r.cast as string[]).join(", ") : "";
      const directors = Array.isArray(r.directors) ? (r.directors as string[]).join(", ") : "";
      const guardian = r.guardianRating ? `Guardian: ${r.guardianRating}/5` : "";
      return `${i + 1}. [TMDB:${r.tmdbId}] "${r.title}" (${r.year || "?"}, ${r.mediaType}) — Genres: ${genres} | Cast: ${cast} | Directors: ${directors} | TMDB: ${r.tmdbRating}/10 ${guardian}\n   ${(r.overview || "").substring(0, 150)}`;
    })
    .join("\n");

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
- Titles with Guardian 4-5 star ratings are critically acclaimed — give them a +10 scoring boost as they represent quality-vetted content. Guardian 3-star titles get a +5 boost.
- "titleMatch" MUST be the exact title of the candidate you are scoring, copied verbatim from the candidate list. This is a self-check — it must agree with the tmdbId.
- The "reason" must describe THIS candidate (the one identified by tmdbId/titleMatch). NEVER write "In '[Other Film]', ..." where [Other Film] is anything other than the candidate itself.
- If comparing to one of the user's favourites, phrase it as "Like your favourite [X], this one ..." — never put the favourite in the subject position.
- The "reason" should be personal — reference their specific tastes, not generic praise. If the candidate has a Guardian rating, mention it (e.g., "Guardian 5-star reviewed").
- Be selective — a mediocre match at 65 is less useful than no match`,
      },
      {
        role: "user",
        content: `USER TASTE PROFILE:\n${tasteProfile}${guidance ? `\n\nUSER GUIDANCE (apply this as a strong filter on top of their taste profile):\n"${guidance}"` : ""}\n\nNEW RELEASES TO SCORE:\n${releasesBlock}`,
      },
    ],
    response_format: { type: "json_object" },
    temperature: 0.5,
  });

  const content = response.choices[0].message.content;
  if (!content) return [];

  const parsed = JSON.parse(content);
  const rawPicks: Array<ScoredPick & { titleMatch?: string }> = parsed.picks || [];

  // Defensive filter: drop picks where the AI's titleMatch doesn't agree with
  // the title we provided for that tmdbId, and drop picks whose reason opens by
  // naming a different film ("In '[Other]', ...") — both are hallucination signals.
  const titleByTmdbId = new Map(candidates.map((r) => [r.tmdbId, r.title.toLowerCase()]));
  const validPicks: ScoredPick[] = [];
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
      reason: pick.reason,
    });
  }
  return validPicks;
}

// === Score Guardian archive reviews against user taste ===

export interface GuardianScoredPick {
  reviewId: string;
  relevanceScore: number;
  reason: string;
}

export async function scoreGuardianArchiveForUser(
  profile: UserProfile,
  reviews: GuardianReview[],
  excludeTitles: string[],
  guidance?: string
): Promise<GuardianScoredPick[]> {
  const tasteProfile = buildPrompt(profile);
  const excludeSet = new Set(excludeTitles.map((t) => t.toLowerCase()));

  const candidates = reviews.filter((r) => !excludeSet.has(r.title.toLowerCase()));
  if (candidates.length === 0) return [];

  // Keep the candidate list bounded so the context stays reasonable. Prefer
  // recent + higher-rated reviews when trimming.
  const ranked = [...candidates].sort((a, b) => {
    const ar = (a.starRating || 0) * 10 + (a.publishedDate || "").localeCompare(b.publishedDate || "");
    const br = (b.starRating || 0) * 10;
    return br - ar;
  });
  const trimmed = ranked.slice(0, 80);

  const block = trimmed
    .map((r, i) => {
      const genres = Array.isArray(r.genres) ? (r.genres as string[]).join(", ") : "";
      const cast = Array.isArray(r.cast) ? (r.cast as string[]).join(", ") : "";
      const directors = Array.isArray(r.directors) ? (r.directors as string[]).join(", ") : "";
      const stars = r.starRating ? `Guardian: ${r.starRating}/5` : "";
      const tmdb = r.tmdbRating ? `TMDB: ${r.tmdbRating}/10` : "";
      return `${i + 1}. [ID:${r.id}] "${r.title}" (${r.year || "?"}, ${r.mediaType}) — ${stars} ${tmdb} | Genres: ${genres} | Cast: ${cast} | Directors: ${directors}\n   ${(r.excerpt || "").substring(0, 200)}`;
    })
    .join("\n");

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
- "reason" must describe THIS candidate (identified by reviewId/titleMatch). NEVER write "In '[Other Film]', ..." — never put a different film as the subject.
- If comparing to a user favourite, phrase it as "Like your favourite [X], this one ..." — never put the favourite in the subject.
- If a title has a Guardian star rating, mention it.
- Be selective — a mediocre match at 65 is less useful than no match.`,
      },
      {
        role: "user",
        content: `USER TASTE PROFILE:\n${tasteProfile}${guidance ? `\n\nUSER GUIDANCE:\n"${guidance}"` : ""}\n\nGUARDIAN REVIEWS TO SCORE:\n${block}`,
      },
    ],
    response_format: { type: "json_object" },
    temperature: 0.5,
  });

  const content = response.choices[0].message.content;
  if (!content) return [];

  const parsed = JSON.parse(content);
  const raw: Array<GuardianScoredPick & { titleMatch?: string }> = parsed.picks || [];

  const titleById = new Map(trimmed.map((r) => [r.id, r.title.toLowerCase()]));
  const valid: GuardianScoredPick[] = [];
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
      reason: pick.reason,
    });
  }
  return valid;
}
