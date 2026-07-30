import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useUser } from "@/hooks/use-user";
import { apiRequest } from "@/lib/queryClient";
import { TrailerPlayer } from "@/components/TrailerPlayer";
import { Film, Tv, Heart, Loader2, Star, Smile, User, Video, Brain, Sparkles, RefreshCw, Lightbulb, BarChart3, Plus, Eye, X, Play } from "lucide-react";

interface FavouriteTitle {
  id: string;
  title: string;
  mediaType: "film" | "tv";
  year: number | null;
  reason: string | null;
}

interface GenrePreference {
  id: string;
  genre: string;
  rating: number;
}

interface MoodPreference {
  id: string;
  mood: string;
  rating: number;
}

interface ActorPreference {
  id: string;
  name: string;
}

interface DirectorPreference {
  id: string;
  name: string;
}

interface RecommendationStats {
  total: number;
  addedToWatchlist: number;
  watched: number;
  rejected: number;
  noAction: number;
  watchlistRate: number;
  watchedRate: number;
  rejectedRate: number;
}

interface HiddenGem {
  title: string;
  mediaType: "film" | "tv";
  reason: string;
  year?: number | null;
  posterPath?: string | null;
  trailerKey?: string | null;
  tmdbRating?: string | null;
}

interface TasteInsights {
  summary: string;
  topThemes: string[];
  watchingStyle: string;
  moodProfile: string;
  // string = legacy cached shape from before the actionable-card change
  hiddenGem: HiddenGem | string | null;
}

export function PreferencesView() {
  const { user } = useUser();

  const { data: favourites, isLoading: loadingFavourites } = useQuery<FavouriteTitle[]>({
    queryKey: [`/api/users/${user?.id}/favourites`],
    enabled: !!user,
  });

  const { data: genres, isLoading: loadingGenres } = useQuery<GenrePreference[]>({
    queryKey: [`/api/users/${user?.id}/genres`],
    enabled: !!user,
  });

  const { data: moods, isLoading: loadingMoods } = useQuery<MoodPreference[]>({
    queryKey: [`/api/users/${user?.id}/moods`],
    enabled: !!user,
  });

  const { data: actors, isLoading: loadingActors } = useQuery<ActorPreference[]>({
    queryKey: [`/api/users/${user?.id}/actors`],
    enabled: !!user,
  });

  const { data: directors, isLoading: loadingDirectors } = useQuery<DirectorPreference[]>({
    queryKey: [`/api/users/${user?.id}/directors`],
    enabled: !!user,
  });

  const { data: insights, isLoading: loadingInsights, refetch: refetchInsights, isFetching: fetchingInsights } = useQuery<TasteInsights>({
    queryKey: [`/api/users/${user?.id}/insights`],
    enabled: !!user && (favourites?.length ?? 0) > 0,
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });

  const { data: stats } = useQuery<RecommendationStats>({
    queryKey: [`/api/users/${user?.id}/recommendation-stats`],
    enabled: !!user,
  });

  const isLoading = loadingFavourites || loadingGenres || loadingMoods || loadingActors || loadingDirectors;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const likedGenres = genres?.filter(g => g.rating >= 4) || [];
  const likedMoods = moods?.filter(m => m.rating >= 4) || [];

  return (
    <div className="space-y-6">
      {/* AI Taste Insights */}
      <Card className="bg-card border border-accent/40 shadow-md overflow-hidden">
        <CardContent className="p-0">
          <div className="bg-accent/10 p-4 border-b border-border/50">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Brain className="w-5 h-5 text-accent" />
                <h2 className="text-lg font-bold">Your Taste Profile</h2>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => refetchInsights()}
                disabled={fetchingInsights}
                className="text-muted-foreground"
              >
                <RefreshCw className={`w-4 h-4 ${fetchingInsights ? "animate-spin" : ""}`} />
              </Button>
            </div>
          </div>

          <div className="p-4 space-y-4">
            {loadingInsights || fetchingInsights ? (
              <div className="flex items-center gap-3 py-4">
                <Loader2 className="w-5 h-5 animate-spin text-primary" />
                <span className="text-sm text-muted-foreground">Analyzing your taste...</span>
              </div>
            ) : insights ? (
              <>
                {/* Summary */}
                <p className="text-sm leading-relaxed">{insights.summary}</p>

                {/* Top Themes */}
                {insights.topThemes.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {insights.topThemes.map((theme, i) => (
                      <span
                        key={i}
                        className="px-2 py-1 text-xs rounded-full bg-accent/20 text-accent border border-accent/30"
                      >
                        {theme}
                      </span>
                    ))}
                  </div>
                )}

                {/* Watching Style & Mood */}
                <div className="grid gap-3 text-sm">
                  <div className="flex items-start gap-2">
                    <Sparkles className="w-4 h-4 text-[#fec666] mt-0.5 shrink-0" />
                    <span className="text-muted-foreground">{insights.watchingStyle}</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <Smile className="w-4 h-4 text-[#93b6ee] mt-0.5 shrink-0" />
                    <span className="text-muted-foreground">{insights.moodProfile}</span>
                  </div>
                </div>

                {/* Hidden Gem Suggestion */}
                {insights.hiddenGem &&
                  (typeof insights.hiddenGem === "string" ? (
                    <div className="p-3 rounded-lg bg-primary/10 border border-primary/20">
                      <div className="flex items-start gap-2">
                        <Lightbulb className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                        <div>
                          <span className="text-xs font-medium text-primary">Hidden Gem</span>
                          <p className="text-sm mt-1">{insights.hiddenGem}</p>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <HiddenGemCard
                      gem={insights.hiddenGem}
                      onActioned={() => refetchInsights()}
                    />
                  ))}
              </>
            ) : (
              <p className="text-sm text-muted-foreground">
                Add more favourites to unlock personalized insights about your taste.
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Recommendation Stats */}
      {stats && stats.total > 0 && (
        <Card className="bg-card border border-border shadow-md">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <BarChart3 className="w-5 h-5 text-accent" />
              <h2 className="text-lg font-semibold">Your Stats</h2>
            </div>
            <div className="grid grid-cols-4 gap-3">
              <div className="text-center">
                <div className="text-2xl font-bold">{stats.total}</div>
                <div className="text-xs text-muted-foreground">Recommended</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-accent">{stats.watchlistRate}%</div>
                <div className="text-xs text-muted-foreground">Saved</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-primary">{stats.watched}</div>
                <div className="text-xs text-muted-foreground">Watched</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-muted-foreground">{stats.rejectedRate}%</div>
                <div className="text-xs text-muted-foreground">Skipped</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Favourite Titles */}
      <section>
        <div className="flex items-center gap-2 mb-3">
          <Heart className="w-5 h-5 text-primary fill-primary" />
          <h2 className="text-lg font-semibold">Favourite Titles</h2>
          <span className="text-sm text-muted-foreground">({favourites?.length || 0})</span>
        </div>

        {favourites && favourites.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {favourites.map((fav) => (
              <div
                key={fav.id}
                className="flex items-center gap-2 px-3 py-2 rounded-lg bg-muted/50 border border-border"
              >
                {fav.mediaType === "film" ? (
                  <Film className="w-4 h-4 text-accent" />
                ) : (
                  <Tv className="w-4 h-4 text-primary" />
                )}
                <span className="text-sm font-medium">{fav.title}</span>
                {fav.year && (
                  <span className="text-xs text-muted-foreground">({fav.year})</span>
                )}
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">No favourites added yet</p>
        )}
      </section>

      {/* Genre Preferences — tap to cycle love / neutral / avoid */}
      <GenreTuner genres={genres || []} />

      {/* Mood Preferences */}
      {likedMoods.length > 0 && (
        <section>
          <div className="flex items-center gap-2 mb-3">
            <Smile className="w-5 h-5 text-[#93b6ee]" />
            <h2 className="text-lg font-semibold">Preferred Moods</h2>
          </div>
          <div className="flex flex-wrap gap-2">
            {likedMoods.map((mood) => (
              <span
                key={mood.id}
                className="px-3 py-1.5 rounded-full bg-muted/50 border border-border text-sm"
              >
                {mood.mood}
              </span>
            ))}
          </div>
        </section>
      )}

      {/* Actors */}
      {actors && actors.length > 0 && (
        <section>
          <div className="flex items-center gap-2 mb-3">
            <User className="w-5 h-5 text-accent" />
            <h2 className="text-lg font-semibold">Favourite Actors</h2>
          </div>
          <div className="flex flex-wrap gap-2">
            {actors.map((actor) => (
              <span
                key={actor.id}
                className="px-3 py-1.5 rounded-full bg-muted/50 border border-border text-sm"
              >
                {actor.name}
              </span>
            ))}
          </div>
        </section>
      )}

      {/* Directors */}
      {directors && directors.length > 0 && (
        <section>
          <div className="flex items-center gap-2 mb-3">
            <Video className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-semibold">Favourite Directors</h2>
          </div>
          <div className="flex flex-wrap gap-2">
            {directors.map((director) => (
              <span
                key={director.id}
                className="px-3 py-1.5 rounded-full bg-muted/50 border border-border text-sm"
              >
                {director.name}
              </span>
            ))}
          </div>
        </section>
      )}

    </div>
  );
}
const TMDB_IMAGE_BASE = "https://image.tmdb.org/t/p";

function HiddenGemCard({
  gem,
  onActioned,
}: {
  gem: HiddenGem;
  onActioned: () => void;
}) {
  const { user } = useUser();
  const queryClient = useQueryClient();
  const [busy, setBusy] = useState<null | "watchlist" | "watched" | "dismiss">(null);
  const [done, setDone] = useState<null | "watchlist" | "watched" | "dismiss">(null);
  const [trailerOpen, setTrailerOpen] = useState(false);

  const doAction = async (kind: "watchlist" | "watched" | "dismiss") => {
    if (!user || busy || done) return;
    setBusy(kind);
    try {
      if (kind === "watchlist") {
        await apiRequest("POST", `/api/users/${user.id}/watchlist`, {
          title: gem.title,
          mediaType: gem.mediaType,
          year: gem.year ?? null,
          recommendationReason: gem.reason,
        });
      } else if (kind === "watched") {
        await apiRequest("POST", `/api/users/${user.id}/history`, {
          title: gem.title,
          mediaType: gem.mediaType,
          year: gem.year ?? null,
        });
      } else {
        await apiRequest("POST", `/api/users/${user.id}/rejected`, {
          title: gem.title,
          mediaType: gem.mediaType,
          year: gem.year ?? null,
          reason: "Not interested",
        });
      }
      setDone(kind);
      queryClient.invalidateQueries({ queryKey: [`/api/users/${user.id}/watchlist`] });
      queryClient.invalidateQueries({ queryKey: [`/api/users/${user.id}/history`] });
      queryClient.invalidateQueries({ queryKey: [`/api/users/${user.id}/rejected`] });
      // Fetch a fresh gem once this one has been dealt with
      setTimeout(onActioned, 900);
    } finally {
      setBusy(null);
    }
  };

  const posterUrl = gem.posterPath ? `${TMDB_IMAGE_BASE}/w300${gem.posterPath}` : null;

  return (
    <div className="p-3 rounded-lg bg-primary/10 border border-primary/20">
      <div className="flex items-center gap-2 mb-2">
        <Lightbulb className="w-4 h-4 text-primary shrink-0" />
        <span className="text-xs font-medium text-primary">Hidden Gem</span>
      </div>
      <div className="flex gap-3">
        {posterUrl ? (
          <img
            src={posterUrl}
            alt={gem.title}
            className="w-[72px] h-[108px] rounded-lg object-cover shrink-0"
            loading="lazy"
          />
        ) : (
          <div className="w-[72px] h-[108px] rounded-lg bg-muted flex items-center justify-center shrink-0">
            {gem.mediaType === "film" ? (
              <Film className="w-6 h-6 text-muted-foreground" />
            ) : (
              <Tv className="w-6 h-6 text-muted-foreground" />
            )}
          </div>
        )}
        <div className="flex-1 min-w-0">
          <h4 className="font-semibold text-base leading-snug mb-1">{gem.title}</h4>
          <div className="flex items-center flex-wrap gap-x-2 gap-y-0.5 text-xs text-muted-foreground mb-2">
            {gem.year && <span>{gem.year}</span>}
            <span className="opacity-40">·</span>
            <span className="capitalize">{gem.mediaType}</span>
            {gem.tmdbRating && (
              <>
                <span className="opacity-40">·</span>
                <span className="px-1.5 py-0.5 rounded bg-[#fec666]/20 text-[#fec666] font-medium">
                  {gem.tmdbRating}
                </span>
              </>
            )}
          </div>
          <p className="text-sm text-muted-foreground leading-relaxed mb-2">{gem.reason}</p>
          {gem.trailerKey && (
            <button
              onClick={() => setTrailerOpen(true)}
              className="inline-flex items-center gap-1 text-xs text-accent hover:underline mb-2"
            >
              <Play className="w-2.5 h-2.5" /> Trailer
            </button>
          )}
          <div className="flex items-center gap-3 flex-wrap">
            <button
              onClick={() => doAction("watchlist")}
              disabled={!!busy || !!done}
              className={`inline-flex items-center gap-1 text-xs ${
                done === "watchlist"
                  ? "text-[#93b6ee]"
                  : "text-accent hover:underline disabled:opacity-40"
              }`}
            >
              {busy === "watchlist" ? (
                <Loader2 className="w-3 h-3 animate-spin" />
              ) : done === "watchlist" ? (
                <>Added</>
              ) : (
                <><Plus className="w-3 h-3" /> Watchlist</>
              )}
            </button>
            <button
              onClick={() => doAction("watched")}
              disabled={!!busy || !!done}
              className={`inline-flex items-center gap-1 text-xs ${
                done === "watched"
                  ? "text-[#93b6ee]"
                  : "text-muted-foreground hover:text-foreground disabled:opacity-40"
              }`}
            >
              {busy === "watched" ? (
                <Loader2 className="w-3 h-3 animate-spin" />
              ) : done === "watched" ? (
                <>Watched</>
              ) : (
                <><Eye className="w-3 h-3" /> Watched</>
              )}
            </button>
            <button
              onClick={() => doAction("dismiss")}
              disabled={!!busy || !!done}
              aria-label="Dismiss"
              className={`inline-flex items-center text-muted-foreground hover:text-foreground disabled:opacity-40 ${
                done === "dismiss" ? "text-[#93b6ee]" : ""
              }`}
            >
              {busy === "dismiss" ? (
                <Loader2 className="w-3 h-3 animate-spin" />
              ) : (
                <X className="w-3.5 h-3.5" />
              )}
            </button>
          </div>
        </div>
      </div>
      {trailerOpen && gem.trailerKey && (
        <TrailerPlayer
          trailerKey={gem.trailerKey}
          title={gem.title}
          onClose={() => setTrailerOpen(false)}
        />
      )}
    </div>
  );
}

// Canonical genre list shown in the tuner even if never rated — includes the
// avoid-worthy ones (Soap, Reality, Animation) that onboarding never offered.
const ALL_GENRES = [
  "Action", "Adventure", "Animation", "Comedy", "Crime", "Documentary",
  "Drama", "Fantasy", "History", "Horror", "Musical", "Mystery", "Reality",
  "Romance", "Sci-Fi", "Soap", "Thriller", "War", "Western",
];

function GenreTuner({ genres }: { genres: GenrePreference[] }) {
  const { user } = useUser();
  const queryClient = useQueryClient();
  const [saving, setSaving] = useState<string | null>(null);

  const ratingFor = (genre: string): number =>
    genres.find((g) => g.genre === genre)?.rating ?? 3;

  const stateFor = (rating: number): "love" | "neutral" | "avoid" =>
    rating >= 4 ? "love" : rating <= 2 ? "avoid" : "neutral";

  // love -> avoid -> neutral -> love
  const nextRating = (rating: number): number => {
    const s = stateFor(rating);
    return s === "love" ? 1 : s === "avoid" ? 3 : 5;
  };

  const cycle = async (genre: string) => {
    if (!user || saving) return;
    setSaving(genre);
    try {
      await apiRequest("POST", `/api/users/${user.id}/genres`, {
        genre,
        rating: nextRating(ratingFor(genre)),
      });
      queryClient.invalidateQueries({ queryKey: [`/api/users/${user.id}/genres`] });
    } finally {
      setSaving(null);
    }
  };

  const extras = genres.filter((g) => !ALL_GENRES.includes(g.genre)).map((g) => g.genre);
  const list = [...ALL_GENRES, ...extras];

  return (
    <section>
      <div className="flex items-center gap-2 mb-1">
        <Star className="w-5 h-5 text-[#fec666] fill-[#fec666]" />
        <h2 className="text-lg font-semibold">Genres</h2>
      </div>
      <p className="text-xs text-muted-foreground mb-3">
        Tap to cycle: love, avoid, neutral. Avoided genres are excluded from your picks.
      </p>
      <div className="flex flex-wrap gap-2">
        {list.map((genre) => {
          const state = stateFor(ratingFor(genre));
          return (
            <button
              key={genre}
              onClick={() => cycle(genre)}
              disabled={saving === genre}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-sm transition-colors ${
                state === "love"
                  ? "bg-[#fec666]/20 border-[#fec666]/50 text-[#fec666]"
                  : state === "avoid"
                    ? "bg-destructive/15 border-destructive/40 text-destructive line-through"
                    : "bg-muted/50 border-border text-muted-foreground hover:text-foreground"
              }`}
            >
              {saving === genre ? (
                <Loader2 className="w-3 h-3 animate-spin" />
              ) : state === "love" ? (
                <Heart className="w-3 h-3 fill-current" />
              ) : state === "avoid" ? (
                <X className="w-3 h-3" />
              ) : null}
              {genre}
            </button>
          );
        })}
      </div>
    </section>
  );
}
