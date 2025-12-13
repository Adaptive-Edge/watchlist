import OpenAI from "openai";

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

interface Recommendation {
  title: string;
  year: number;
  mediaType: "film" | "tv";
  reason: string;
  imdbScore: number | null;
  rottenTomatoesScore: number | null;
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
      "rottenTomatoesScore": 92
    }
  ]
}

For scores:
- imdbScore: IMDB rating out of 10 (e.g., 8.5). Use null if unknown.
- rottenTomatoesScore: Rotten Tomatoes critic score as percentage (e.g., 92 for 92%). Use null if unknown.

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

  // Favourite titles
  if (profile.favourites.length > 0) {
    const favList = profile.favourites
      .map((f) => `${f.title} (${f.mediaType})${f.reason ? ` - "${f.reason}"` : ""}`)
      .join("; ");
    sections.push(`LOVED TITLES: ${favList}`);
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

  // Rejected titles
  if (profile.rejected.length > 0) {
    const rejectedList = profile.rejected
      .slice(0, 10)
      .map((r) => r.title)
      .join(", ");
    sections.push(`ALREADY REJECTED (don't suggest): ${rejectedList}`);
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
