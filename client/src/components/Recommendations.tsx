import { useState } from "react";
import { isTV, startVoice } from "@/lib/tv";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { TrailerPlayer } from "@/components/TrailerPlayer";
import { useUser } from "@/hooks/use-user";
import { apiRequest } from "@/lib/queryClient";
import {
  Film,
  Tv,
  Sparkles,
  Plus,
  X,
  Eye,
  Heart,
  Meh,
  ThumbsDown,
  Loader2,
  Send,
  RefreshCw,
  Play,
  Mic,
} from "lucide-react";

const TMDB_IMAGE_BASE = "https://image.tmdb.org/t/p";

interface Recommendation {
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

interface GenrePreference {
  id: string;
  genre: string;
  rating: number;
}

type MediaFilter = "all" | "film" | "tv";

function matchColor(score: number): string {
  if (score >= 85) return "bg-emerald-500/90 text-white";
  if (score >= 70) return "bg-sky-500/90 text-white";
  return "bg-amber-500/90 text-white";
}

export function Recommendations() {
  const { user } = useUser();
  const queryClient = useQueryClient();
  const [request, setRequest] = useState("");
  const [listening, setListening] = useState(false);
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [celebrating, setCelebrating] = useState<string | null>(null);
  const [filter, setFilter] = useState<MediaFilter>("all");

  const { data: genres } = useQuery<GenrePreference[]>({
    queryKey: [`/api/users/${user?.id}/genres`],
    enabled: !!user?.id,
  });

  const likedGenres = (genres || [])
    .filter((g) => g.rating >= 4)
    .map((g) => g.genre)
    .slice(0, 4);

  const generateMutation = useMutation({
    mutationFn: async (userRequest?: string) => {
      return apiRequest("POST", `/api/users/${user?.id}/recommendations`, {
        request: userRequest,
      });
    },
    onSuccess: (data) => {
      setRecommendations(data);
    },
  });

  const handleGenerate = () => {
    generateMutation.mutate(request || undefined);
    setRequest("");
  };

  const handleAddToWatchlist = async (rec: Recommendation) => {
    if (!user) return;
    setActionLoading(rec.title);
    try {
      await apiRequest("POST", `/api/users/${user.id}/watchlist`, {
        title: rec.title,
        mediaType: rec.mediaType,
        year: rec.year,
        recommendationReason: rec.reason,
      });
      setRecommendations((prev) => prev.filter((r) => r.title !== rec.title));
      queryClient.invalidateQueries({ queryKey: [`/api/users/${user.id}/watchlist`] });
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async (rec: Recommendation) => {
    if (!user) return;
    setActionLoading(rec.title);
    try {
      await apiRequest("POST", `/api/users/${user.id}/rejected`, {
        title: rec.title,
        mediaType: rec.mediaType,
        year: rec.year,
        reason: "Not interested",
      });
      setRecommendations((prev) => prev.filter((r) => r.title !== rec.title));
    } finally {
      setActionLoading(null);
    }
  };

  const handleWatched = async (rec: Recommendation, rating: "loved" | "ok" | "disliked") => {
    if (!user) return;
    setActionLoading(rec.title);
    try {
      await apiRequest("POST", `/api/users/${user.id}/history`, {
        title: rec.title,
        mediaType: rec.mediaType,
        year: rec.year,
        rating,
      });

      if (rating === "loved") {
        setCelebrating(rec.title);
        setTimeout(() => {
          setRecommendations((prev) => prev.filter((r) => r.title !== rec.title));
          setCelebrating(null);
        }, 600);
      } else {
        setRecommendations((prev) => prev.filter((r) => r.title !== rec.title));
      }
      queryClient.invalidateQueries({ queryKey: [`/api/users/${user.id}/history`] });
    } finally {
      setActionLoading(null);
    }
  };

  const visible = recommendations.filter(
    (r) => filter === "all" || r.mediaType === filter
  );

  return (
    <div className="space-y-5">
      {/* Taste profile header */}
      {likedGenres.length > 0 && (
        <div className="space-y-1.5">
          <p className="text-xs text-muted-foreground">Curated for your love of</p>
          <div className="flex flex-wrap gap-2">
            {likedGenres.map((g) => (
              <span
                key={g}
                className="px-3 py-1 rounded-full text-xs font-medium border border-[#93b6ee]/30 bg-[#93b6ee]/10 text-[#93b6ee]"
              >
                {g}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Search / steer */}
      <div className="flex gap-2">
        <input
          type="text"
          value={request}
          onChange={(e) => setRequest(e.target.value)}
          tabIndex={0}
          onKeyDown={(e) => e.key === "Enter" && handleGenerate()}
          onClick={() => { if (isTV() && window.TVKeyboard) window.TVKeyboard.showKeyboard(); }}
          onBlur={() => { if (isTV() && window.TVKeyboard) window.TVKeyboard.hideKeyboard(); }}
          placeholder="Steer your picks… e.g. 'more comedy', 'less dark', 'nothing too heavy'"
          className="flex-1 px-4 py-3 rounded-lg bg-muted/50 border border-border focus:border-primary outline-none text-sm"
        />
        {isTV() && (
          <button
            onClick={() => startVoice((text) => { setRequest(text); setListening(false); }, () => setListening(false)) && setListening(true)}
            className={`shrink-0 w-11 h-11 rounded-lg flex items-center justify-center transition-colors ${listening ? "bg-primary text-primary-foreground animate-pulse" : "bg-muted/50 text-muted-foreground hover:text-foreground"}`}
            aria-label="Voice input"
          >
            <Mic className="w-5 h-5" />
          </button>
        )}
        <Button onClick={handleGenerate} disabled={generateMutation.isPending} className="shrink-0">
          {generateMutation.isPending ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : request ? (
            <Send className="w-5 h-5" />
          ) : (
            <Sparkles className="w-5 h-5" />
          )}
        </Button>
      </div>

      {/* Loading */}
      {generateMutation.isPending && recommendations.length === 0 && (
        <div className="flex flex-col items-center justify-center py-12 space-y-4">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <p className="text-muted-foreground text-sm">Finding perfect recommendations for you…</p>
        </div>
      )}

      {/* Results */}
      {recommendations.length > 0 && (
        <div className="space-y-4">
          {/* Filter row */}
          <div className="flex items-center justify-between">
            <div className="flex gap-2">
              {(["all", "film", "tv"] as const).map((f) => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
                    filter === f
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted/50 text-muted-foreground hover:text-foreground hover:bg-muted"
                  }`}
                >
                  {f === "all" ? "All" : f === "film" ? "Films" : "TV"}
                </button>
              ))}
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => generateMutation.mutate(undefined)}
              disabled={generateMutation.isPending}
            >
              <RefreshCw className={`w-4 h-4 mr-1.5 ${generateMutation.isPending ? "animate-spin" : ""}`} />
              Refresh
            </Button>
          </div>

          <div className="grid gap-3">
            {visible.map((rec) => (
              <RecommendationCard
                key={rec.title}
                recommendation={rec}
                loading={actionLoading === rec.title}
                celebrating={celebrating === rec.title}
                onAddToWatchlist={() => handleAddToWatchlist(rec)}
                onReject={() => handleReject(rec)}
                onWatched={(rating) => handleWatched(rec, rating)}
              />
            ))}
            {visible.length === 0 && (
              <p className="text-center text-muted-foreground text-sm py-6">
                No {filter === "film" ? "films" : "TV shows"} in this batch.
              </p>
            )}
          </div>
        </div>
      )}

      {/* Empty state */}
      {!generateMutation.isPending && recommendations.length === 0 && (
        <div className="text-center py-12">
          <Sparkles className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium mb-2">Ready for recommendations?</h3>
          <p className="text-muted-foreground text-sm max-w-md mx-auto">
            Click the sparkle button to get personalised suggestions, or describe what you're in the mood for.
          </p>
        </div>
      )}
    </div>
  );
}

interface RecommendationCardProps {
  recommendation: Recommendation;
  loading: boolean;
  celebrating: boolean;
  onAddToWatchlist: () => void;
  onReject: () => void;
  onWatched: (rating: "loved" | "ok" | "disliked") => void;
}

function RecommendationCard({
  recommendation,
  loading,
  celebrating,
  onAddToWatchlist,
  onReject,
  onWatched,
}: RecommendationCardProps) {
  const [showWatchedOptions, setShowWatchedOptions] = useState(false);
  const [trailerOpen, setTrailerOpen] = useState(false);
  const trailerKey = recommendation.trailerUrl?.match(/v=([^&]+)/)?.[1];

  return (
    <>
      <div
        tabIndex={0}
        className={`relative bg-card border border-border rounded-xl overflow-hidden transition-all duration-500 ${
          celebrating ? "scale-[1.02] shadow-[0_0_30px_rgba(241,108,95,0.4)]" : ""
        }`}
        onKeyDown={(e) => { if (e.key === 'Enter' && trailerKey) setTrailerOpen(true); }}
      >
        {/* Celebration sparkles */}
        {celebrating && (
          <div className="absolute inset-0 pointer-events-none z-10">
            {[...Array(12)].map((_, i) => (
              <span
                key={i}
                className="absolute w-2 h-2 rounded-full animate-sparkle"
                style={{
                  left: `${20 + Math.random() * 60}%`,
                  top: `${20 + Math.random() * 60}%`,
                  backgroundColor: ["#f16c5f", "#ef8b4f", "#fec666", "#93b6ee", "#324376"][i % 5],
                  animationDelay: `${i * 50}ms`,
                }}
              />
            ))}
          </div>
        )}

        {/* Match badge */}
        {recommendation.matchScore != null && (
          <div
            className={`absolute top-3 right-3 z-10 px-2.5 py-1 rounded-full text-xs font-bold tracking-wide ${matchColor(recommendation.matchScore)}`}
          >
            {recommendation.matchScore}% match
          </div>
        )}

        <div className="flex gap-4 p-4">
          {/* Poster */}
          <div className="shrink-0">
            {recommendation.posterPath ? (
              <img
                src={`${TMDB_IMAGE_BASE}/w185${recommendation.posterPath}`}
                alt={recommendation.title}
                className="w-[72px] h-[108px] rounded-lg object-cover"
                loading="lazy"
              />
            ) : (
              <div className="w-[72px] h-[108px] rounded-lg bg-muted flex items-center justify-center">
                {recommendation.mediaType === "film" ? (
                  <Film className="w-7 h-7 text-muted-foreground" />
                ) : (
                  <Tv className="w-7 h-7 text-muted-foreground" />
                )}
              </div>
            )}
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0 pr-16">
            {/* Title + meta */}
            <h3 className="font-semibold text-base leading-snug text-foreground mb-1">
              {recommendation.title}
            </h3>
            <div className="flex items-center flex-wrap gap-x-2 gap-y-1 text-sm text-muted-foreground mb-2">
              <span>{recommendation.year}</span>
              <span className="opacity-40">·</span>
              <span>{recommendation.mediaType === "film" ? "Film" : "TV"}</span>
              {recommendation.imdbScore && (
                <>
                  <span className="opacity-40">·</span>
                  <span className="px-1.5 py-0.5 rounded bg-[#fec666]/20 text-[#fec666] text-xs font-semibold">
                    IMDb {recommendation.imdbScore.toFixed(1)}
                  </span>
                </>
              )}
            </div>

            {/* Genre tags */}
            {recommendation.genres?.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mb-2">
                {recommendation.genres.map((g) => (
                  <span
                    key={g}
                    className="px-2 py-0.5 rounded bg-muted/60 text-muted-foreground text-xs font-medium"
                  >
                    {g}
                  </span>
                ))}
              </div>
            )}

            {/* Reason */}
            <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
              {recommendation.reason}
            </p>

            {/* Trailer link */}
            {trailerKey && (
              <button
                tabIndex={-1}
                onClick={() => { if (isTV()) return; setTrailerOpen(true); }}
                className="inline-flex items-center gap-1 text-xs text-[#93b6ee] hover:underline mb-3"
              >
                <Play className="w-3 h-3" /> Watch trailer
              </button>
            )}

            {/* Actions */}
            {showWatchedOptions ? (
              <div className="flex flex-wrap gap-2 items-center">
                <span className="text-xs text-muted-foreground">Rate it:</span>
                <button
                  tabIndex={-1}
                  onClick={() => { if (isTV()) return; onWatched("loved"); }}
                  disabled={loading}
                  className="flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium bg-muted/50 hover:bg-muted text-foreground disabled:opacity-50 transition-colors"
                >
                  <Heart className="w-3.5 h-3.5 text-[#f16c5f] fill-[#f16c5f]" /> Loved it
                </button>
                <button
                  tabIndex={-1}
                  onClick={() => { if (isTV()) return; onWatched("ok"); }}
                  disabled={loading}
                  className="flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium bg-muted/50 hover:bg-muted text-foreground disabled:opacity-50 transition-colors"
                >
                  <Meh className="w-3.5 h-3.5 text-[#fec666]" /> OK
                </button>
                <button
                  tabIndex={-1}
                  onClick={() => { if (isTV()) return; onWatched("disliked"); }}
                  disabled={loading}
                  className="flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium bg-muted/50 hover:bg-muted text-foreground disabled:opacity-50 transition-colors"
                >
                  <ThumbsDown className="w-3.5 h-3.5 text-destructive" /> Didn't like
                </button>
                <button
                  tabIndex={-1}
                  onClick={() => { if (isTV()) return; setShowWatchedOptions(false); }}
                  className="p-1 rounded-md text-muted-foreground hover:text-foreground transition-colors"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <div className="flex gap-2 flex-wrap">
                <button
                  tabIndex={-1}
                  onClick={() => { if (isTV()) return; onAddToWatchlist(); }}
                  disabled={loading}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-[#93b6ee]/30 bg-[#93b6ee]/10 text-[#93b6ee] hover:bg-[#93b6ee]/20 disabled:opacity-50 transition-colors"
                >
                  {loading ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Plus className="w-3.5 h-3.5" />
                  )}
                  Watchlist
                </button>
                <button
                  tabIndex={-1}
                  onClick={() => { if (isTV()) return; setShowWatchedOptions(true); }}
                  disabled={loading}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-border bg-muted/30 text-muted-foreground hover:text-foreground hover:bg-muted/60 disabled:opacity-50 transition-colors"
                >
                  <Eye className="w-3.5 h-3.5" /> Watched
                </button>
                <button
                  tabIndex={-1}
                  onClick={() => { if (isTV()) return; onReject(); }}
                  disabled={loading}
                  className="flex items-center gap-1 px-2 py-1.5 rounded-lg text-xs text-muted-foreground hover:text-foreground disabled:opacity-50 transition-colors"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {trailerOpen && trailerKey && (
        <TrailerPlayer
          trailerKey={trailerKey}
          title={recommendation.title}
          onClose={() => setTrailerOpen(false)}
        />
      )}
    </>
  );
}
