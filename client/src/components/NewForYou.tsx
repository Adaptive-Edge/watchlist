import { useState, useEffect } from "react";
import { isTV } from "@/lib/tv";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { TrailerPlayer } from "@/components/TrailerPlayer";
import { useUser } from "@/hooks/use-user";
import { apiRequest } from "@/lib/queryClient";
import {
  Film,
  Tv,
  Plus,
  X,
  Eye,
  Heart,
  ChevronLeft,
  ChevronRight,
  LayoutGrid,
  Meh,
  ThumbsDown,
  Loader2,
  RefreshCw,
  Zap,
  Star,
  Play,
  ExternalLink,
  SlidersHorizontal,
  Filter,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

const TMDB_IMAGE_BASE = "https://image.tmdb.org/t/p";

interface Release {
  id: string;
  tmdbId: number;
  imdbId: string | null;
  title: string;
  mediaType: "film" | "tv";
  year: number | null;
  overview: string | null;
  genres: string[] | null;
  posterPath: string | null;
  tmdbRating: string | null;
  cast: string[] | null;
  directors: string[] | null;
  streamingUk: Array<{ provider: string; logoPath: string; type?: string }> | null;
  trailerKey: string | null;
  inCinemas: number | null;
  guardianUrl: string | null;
  guardianRating: number | null;
  guardianExcerpt: string | null;
  guardianBody: string | null;
}

interface Pick {
  id: string;
  userId: string;
  releaseId: string;
  relevanceScore: number | null;
  reason: string | null;
  status: string;
  batchDate: string | null;
  release: Release;
}

interface GuardianReviewItem {
  id: string;
  url: string;
  title: string;
  section: string | null;
  mediaType: "film" | "tv";
  starRating: number | null;
  excerpt: string | null;
  body: string | null;
  publishedDate: string | null;
  tmdbId: number | null;
  imdbId: string | null;
  year: number | null;
  posterPath: string | null;
  tmdbRating: string | null;
  genres: string[] | null;
  cast: string[] | null;
  directors: string[] | null;
  streamingUk: Array<{ provider: string; logoPath: string; type?: string }> | null;
  trailerKey: string | null;
}

interface GuardianPick {
  id: string;
  userId: string;
  reviewId: string;
  relevanceScore: number | null;
  reason: string | null;
  status: string;
  batchDate: string | null;
  review: GuardianReviewItem;
}

// Unified pick — what /api/users/:userId/picks returns. The `item` is either
// a Release or a GuardianReviewItem depending on `source`. The card adapts.
interface UnifiedPick {
  id: string;
  source: "new_release" | "guardian_review";
  relevanceScore: number | null;
  reason: string | null;
  status: string;
  item: Release | GuardianReviewItem;
}

type MediaFilter = "all" | "film" | "tv";

interface TasteInsights {
  summary: string;
  topThemes: string[];
  watchingStyle: string;
  moodProfile: string;
  hiddenGem: string;
}

export function NewForYou() {
  const { user } = useUser();
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<MediaFilter>("all");
  const [providerFilter, setProviderFilter] = useState<string | null>(null);
  const [showProviderFilter, setShowProviderFilter] = useState(false);
  const [guidance, setGuidance] = useState("");
  const [activeGuidance, setActiveGuidance] = useState("");
  const [carouselOpen, setCarouselOpen] = useState(false);
  const [carouselIndex, setCarouselIndex] = useState(0);

  const picksQueryKey = `/api/users/${user?.id}/picks${
    filter !== "all" || providerFilter
      ? `?${new URLSearchParams({
          ...(filter !== "all" ? { mediaType: filter } : {}),
          ...(providerFilter ? { provider: providerFilter } : {}),
        }).toString()}`
      : ""
  }`;

  const { data: insights } = useQuery<TasteInsights>({
    queryKey: [`/api/users/${user?.id}/insights`],
    enabled: !!user,
    staleTime: 30 * 60 * 1000,
  });

  const { data: providers = [] } = useQuery<string[]>({
    queryKey: ["/api/streaming-providers"],
    enabled: !!user,
    staleTime: 60 * 60 * 1000,
  });

  const { data: unifiedPicks = [], isLoading } = useQuery<UnifiedPick[]>({
    queryKey: [picksQueryKey],
    enabled: !!user,
  });

  const { data: history = [] } = useQuery<Array<{ title: string; year: number | null }>>({
    queryKey: [`/api/users/${user?.id}/history`],
    enabled: !!user,
  });

  const { data: rejected = [] } = useQuery<Array<{ title: string; year: number | null }>>({
    queryKey: [`/api/users/${user?.id}/rejected`],
    enabled: !!user,
  });

  const { data: watchlistItems = [] } = useQuery<Array<{ title: string; year: number | null }>>({
    queryKey: [`/api/users/${user?.id}/watchlist`],
    enabled: !!user,
  });

  const excludeKeys = new Set<string>([
    ...history.map((h) => `${h.title.toLowerCase()}|${h.year ?? ""}`),
    ...rejected.map((r) => `${r.title.toLowerCase()}|${r.year ?? ""}`),
    ...watchlistItems.map((w) => `${w.title.toLowerCase()}|${w.year ?? ""}`),
  ]);

  const visibleUnifiedPicks = unifiedPicks.filter(
    (p) => !excludeKeys.has(`${p.item.title.toLowerCase()}|${p.item.year ?? ""}`)
  );

  const invalidatePicks = () => {
    if (!user) return;
    const prefix = `/api/users/${user.id}/picks`;
    queryClient.invalidateQueries({
      predicate: (q) => {
        const k = q.queryKey[0];
        return typeof k === "string" && k.startsWith(prefix);
      },
    });
  };

  const refreshMutation = useMutation({
    mutationFn: async () => {
      setActiveGuidance(guidance);
      return apiRequest("POST", `/api/users/${user?.id}/picks/refresh`, {
        guidance: guidance || undefined,
      });
    },
    onSuccess: invalidatePicks,
  });

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-12 space-y-4">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <p className="text-muted-foreground">Loading your picks...</p>
      </div>
    );
  }

  return (
    <>
    <div className="space-y-6">
      {/* Taste banner */}
      {insights?.topThemes && insights.topThemes.length > 0 && (
        <div className="space-y-1.5">
          <p className="text-xs text-muted-foreground">Curated for your love of</p>
          <div className="flex flex-wrap gap-2">
            {insights.topThemes.slice(0, 4).map((theme) => (
              <span
                key={theme}
                className="px-3 py-1 rounded-full text-xs font-medium border border-[#93b6ee]/30 bg-[#93b6ee]/10 text-[#93b6ee]"
              >
                {theme}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Guidance input */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <SlidersHorizontal className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            value={guidance}
            onChange={(e) => setGuidance(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && refreshMutation.mutate()}
            placeholder="Steer your picks... e.g. 'more comedy', 'less dystopic', 'nothing too heavy'"
            className="w-full pl-9 pr-4 py-2.5 rounded-lg bg-muted/50 border border-border focus:border-primary outline-none text-sm"
          />
        </div>
        <Button
          onClick={() => refreshMutation.mutate()}
          disabled={refreshMutation.isPending}
          className="shrink-0"
        >
          {refreshMutation.isPending ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <RefreshCw className="w-4 h-4" />
          )}
        </Button>
      </div>
      {activeGuidance && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span>Tuned for:</span>
          <span className="px-2 py-0.5 rounded-full bg-primary/15 text-primary font-medium">
            {activeGuidance}
          </span>
          <button
            onClick={() => { setGuidance(""); setActiveGuidance(""); }}
            className="text-muted-foreground hover:text-foreground"
          >
            <X className="w-3 h-3" />
          </button>
        </div>
      )}

      {/* Filter row: media type + collapsible provider toggle */}
      <div className="flex items-center gap-2 flex-wrap">
        <FilterPill
          label="All"
          active={filter === "all"}
          onClick={() => setFilter("all")}
        />
        <FilterPill
          label="Films"
          active={filter === "film"}
          onClick={() => setFilter("film")}
        />
        <FilterPill
          label="TV"
          active={filter === "tv"}
          onClick={() => setFilter("tv")}
        />
        {visibleUnifiedPicks.length > 0 && (
          <button
            onClick={() => { setCarouselIndex(0); setCarouselOpen(true); }}
            className="ml-auto inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium bg-muted/50 text-muted-foreground hover:text-foreground transition-colors"
            title="Browse mode"
          >
            <LayoutGrid className="w-3.5 h-3.5" />
            Browse
          </button>
        )}
        {providers.length > 0 && (
          <button
            onClick={() => setShowProviderFilter((v) => !v)}
            className={`ml-auto inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
              providerFilter
                ? "bg-primary text-primary-foreground"
                : "bg-muted/50 text-muted-foreground hover:text-foreground"
            }`}
            aria-expanded={showProviderFilter}
            aria-label="Toggle streaming provider filter"
          >
            <Filter className="w-3.5 h-3.5" />
            {providerFilter || "Provider"}
            {showProviderFilter ? (
              <ChevronUp className="w-3.5 h-3.5" />
            ) : (
              <ChevronDown className="w-3.5 h-3.5" />
            )}
          </button>
        )}
      </div>

      {/* Streaming provider filter pills (collapsible) */}
      {providers.length > 0 && showProviderFilter && (
        <div className="flex items-center gap-2 flex-wrap">
          <FilterPill
            label="Any provider"
            active={providerFilter === null}
            onClick={() => setProviderFilter(null)}
          />
          {providers.map((p) => (
            <FilterPill
              key={p}
              label={p}
              active={providerFilter === p}
              onClick={() =>
                setProviderFilter(providerFilter === p ? null : p)
              }
            />
          ))}
        </div>
      )}

      {/* Unified For You list (new releases + Guardian archive, sorted by score) */}
      {visibleUnifiedPicks.length > 0 ? (
        <div className="grid gap-3 lg:grid-cols-2 lg:gap-4">
          {visibleUnifiedPicks.map((pick) => (
            <UnifiedPickCard key={pick.id} pick={pick} />
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
          <Zap className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium mb-2">No picks yet</h3>
          <p className="text-muted-foreground text-sm max-w-md mx-auto mb-4">
            {refreshMutation.isPending
              ? "Scanning new releases and matching to your taste..."
              : providerFilter
                ? `No picks on ${providerFilter} matching your filters. Try a different provider.`
                : "Hit refresh to scan the latest releases and find matches for your taste."}
          </p>
          {!refreshMutation.isPending && (
            <Button onClick={() => refreshMutation.mutate()}>
              <Zap className="w-4 h-4 mr-2" />
              Find New Releases
            </Button>
          )}
          {refreshMutation.isPending && (
            <Loader2 className="w-6 h-6 animate-spin mx-auto text-accent" />
          )}
        </div>
      )}

    </div>

    {carouselOpen && visibleUnifiedPicks.length > 0 && (
      <CarouselOverlay
        picks={visibleUnifiedPicks}
        initialIndex={Math.min(carouselIndex, visibleUnifiedPicks.length - 1)}
        onClose={() => setCarouselOpen(false)}
      />
    )}
    </>
  );
}

function matchColor(score: number): string {
  if (score >= 85) return "bg-emerald-500/90 text-white";
  if (score >= 70) return "bg-sky-500/90 text-white";
  return "bg-amber-500/90 text-white";
}

function FilterPill({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
        active
          ? "bg-primary text-primary-foreground"
          : "bg-muted/50 text-muted-foreground hover:text-foreground"
      }`}
    >
      {label}
    </button>
  );
}



interface GuardianCardBase {
  id: string;
  title: string;
  mediaType: "film" | "tv";
  year: number | null;
  posterPath: string | null;
  tmdbRating: string | null;
  starRating: number | null;
  excerpt: string | null;
  body: string | null;
  url: string;
  trailerKey: string | null;
  genres: string[] | null;
}

function GuardianCardShell({
  item,
  matchPct,
  personalReason,
  onWatchlist,
  onWatched,
  onDismiss,
  busy,
  done,
  celebrating,
}: {
  item: GuardianCardBase;
  matchPct?: number | null;
  personalReason?: string | null;
  onWatchlist: (e?: React.MouseEvent) => void;
  onWatched: (rating?: "loved" | "ok" | "disliked") => void;
  onDismiss: (e?: React.MouseEvent) => void;
  busy: null | "watchlist" | "watched" | "dismiss";
  done: null | "watchlist" | "watched" | "dismiss";
  celebrating?: boolean;
}) {
  const [reviewOpen, setReviewOpen] = useState(false);
  const [trailerOpen, setTrailerOpen] = useState(false);
  const [showWatchedOptions, setShowWatchedOptions] = useState(false);
  const posterUrl = item.posterPath
    ? `${TMDB_IMAGE_BASE}/w300${item.posterPath}`
    : null;
  const genres = Array.isArray(item.genres) ? item.genres : [];

  const pickRating = (rating: "loved" | "ok" | "disliked") => {
    setShowWatchedOptions(false);
    onWatched(rating);
  };

  return (
    <>
      <Card
        tabIndex={0}
        className={`bg-card border border-border shadow-md cursor-pointer hover:border-accent/40 transition-all duration-500 ${
          celebrating ? "scale-[1.02] shadow-[0_0_30px_rgba(241,108,95,0.4)]" : ""
        }`}
        onClick={() => setReviewOpen(true)}
        onKeyDown={(e) => { if (e.key === 'Enter') setReviewOpen(true); }}
      >
        <CardContent className="p-3 relative overflow-visible">
          {celebrating && (
            <div className="absolute inset-0 pointer-events-none">
              {[...Array(12)].map((_, i) => (
                <span
                  key={i}
                  className="absolute w-2 h-2 rounded-full animate-sparkle"
                  style={{
                    left: `${20 + Math.random() * 60}%`,
                    top: `${20 + Math.random() * 60}%`,
                    backgroundColor: [
                      "#ec4899",
                      "#f472b6",
                      "#fbbf24",
                      "#facc15",
                      "#a855f7",
                    ][i % 5],
                    animationDelay: `${i * 50}ms`,
                  }}
                />
              ))}
            </div>
          )}
          <div className="flex gap-3 relative">
            {posterUrl ? (
              <img
                src={posterUrl}
                alt={item.title}
                className="w-[72px] h-[108px] rounded-lg object-cover shrink-0"
                loading="lazy"
              />
            ) : (
              <div className="w-[72px] h-[108px] rounded-lg bg-muted flex items-center justify-center shrink-0">
                {item.mediaType === "film" ? (
                  <Film className="w-6 h-6 text-muted-foreground" />
                ) : (
                  <Tv className="w-6 h-6 text-muted-foreground" />
                )}
              </div>
            )}
            {matchPct != null && (
              <span className={`absolute top-0 right-0 text-xs px-2 py-0.5 rounded-full font-bold ${matchColor(matchPct)}`}>
                {matchPct}%
              </span>
            )}
            <div className="flex-1 min-w-0">
              {/* 1. Title */}
              <h4 className="font-semibold text-base leading-snug mb-1">{item.title}</h4>

              {/* 2. Meta — year · type · rating · stars */}
              <div className="flex items-center flex-wrap gap-x-2 gap-y-0.5 text-xs text-muted-foreground mb-2">
                {item.year && <span>{item.year}</span>}
                <span className="opacity-40">·</span>
                <span className="capitalize">{item.mediaType}</span>
                {item.tmdbRating && (
                  <>
                    <span className="opacity-40">·</span>
                    <span className="px-1.5 py-0.5 rounded bg-[#fec666]/20 text-[#fec666] font-medium">
                      {item.tmdbRating}
                    </span>
                  </>
                )}
                {item.starRating != null && (
                  <>
                    <span className="opacity-40">·</span>
                    <span className="flex items-center gap-0.5">
                      {[...Array(5)].map((_, i) => (
                        <Star key={i} className={`w-2.5 h-2.5 ${i < item.starRating! ? "text-[#fec666] fill-[#fec666]" : "text-muted-foreground/40"}`} />
                      ))}
                    </span>
                  </>
                )}
              </div>

              {/* 3. Why this is for you — the hook */}
              {(personalReason || item.excerpt) && (
                <p className="text-sm text-muted-foreground leading-relaxed line-clamp-2 mb-2">
                  {personalReason || item.excerpt}
                </p>
              )}

              {/* 4. Genre tags */}
              {genres.length > 0 && (
                <div className="flex flex-wrap gap-1 mb-2">
                  {genres.slice(0, 3).map((g) => (
                    <span key={g} className="text-xs px-2 py-0.5 rounded bg-muted/60 text-muted-foreground">
                      {g}
                    </span>
                  ))}
                </div>
              )}

              {/* 5. Links */}
              {(item.starRating != null || item.trailerKey) && (
                <div className="flex items-center gap-3 mb-1">
                  {item.starRating != null && (
                    <span className="text-xs text-accent">Read review</span>
                  )}
                  {item.trailerKey && (
                    <button
                      tabIndex={-1}
                      onClick={(e) => { e.stopPropagation(); if (isTV()) return; setTrailerOpen(true); }}
                      className="inline-flex items-center gap-1 text-xs text-accent hover:underline"
                    >
                      <Play className="w-2.5 h-2.5" /> Trailer
                    </button>
                  )}
                </div>
              )}
              {showWatchedOptions ? (
                <div
                  className="flex items-center gap-2 mt-2 flex-wrap"
                  onClick={(e) => e.stopPropagation()}
                >
                  <span className="text-xs text-muted-foreground mr-1">Rate:</span>
                  <button
                    tabIndex={-1}
                    onClick={() => { if (isTV()) return; pickRating("loved"); }}
                    disabled={!!busy}
                    className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-muted hover:bg-muted/80 disabled:opacity-40"
                  >
                    <Heart className="w-3 h-3 text-[#f16c5f] fill-[#f16c5f]" /> Loved
                  </button>
                  <button
                    tabIndex={-1}
                    onClick={() => { if (isTV()) return; pickRating("ok"); }}
                    disabled={!!busy}
                    className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-muted hover:bg-muted/80 disabled:opacity-40"
                  >
                    <Meh className="w-3 h-3 text-[#fec666]" /> OK
                  </button>
                  <button
                    tabIndex={-1}
                    onClick={() => { if (isTV()) return; pickRating("disliked"); }}
                    disabled={!!busy}
                    className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-muted hover:bg-muted/80 disabled:opacity-40"
                  >
                    <ThumbsDown className="w-3 h-3 text-destructive" /> Nah
                  </button>
                  <button
                    tabIndex={-1}
                    onClick={() => { if (isTV()) return; setShowWatchedOptions(false); }}
                    className="text-muted-foreground hover:text-foreground ml-0.5"
                    aria-label="Cancel"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-3 mt-2 flex-wrap">
                  <button
                    tabIndex={-1}
                    onClick={(e) => { e.stopPropagation(); if (isTV()) return; onWatchlist(e); }}
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
                    tabIndex={-1}
                    onClick={(e) => { e.stopPropagation(); if (isTV()) return; setShowWatchedOptions(true); }}
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
                    tabIndex={-1}
                    onClick={(e) => { e.stopPropagation(); if (isTV()) return; onDismiss(e); }}
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
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <Dialog open={reviewOpen} onOpenChange={setReviewOpen}>
        <DialogContent className="sm:max-w-xl max-h-[80vh] overflow-hidden flex flex-col" aria-describedby={undefined}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <span>{item.title}</span>
              {item.starRating != null && (
                <div className="flex items-center gap-0.5">
                  {[...Array(5)].map((_, i) => (
                    <Star
                      key={i}
                      className={`w-4 h-4 ${
                        i < item.starRating!
                          ? "text-[#fec666] fill-[#fec666]"
                          : "text-muted-foreground"
                      }`}
                    />
                  ))}
                </div>
              )}
            </DialogTitle>
          </DialogHeader>
          <div className="overflow-y-auto flex-1 pr-2">
            {item.body ? (
              <div className="text-sm leading-relaxed whitespace-pre-line text-muted-foreground">
                {item.body}
              </div>
            ) : item.excerpt ? (
              <p className="text-sm leading-relaxed text-muted-foreground">
                {item.excerpt}
              </p>
            ) : null}
          </div>
          <div className="pt-3 border-t border-border/50 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Button size="sm" onClick={() => onWatchlist()} disabled={!!busy || !!done} className="gap-1">
                {busy === "watchlist" ? <Loader2 className="w-4 h-4 animate-spin" /> : done === "watchlist" ? <>Added</> : <><Plus className="w-4 h-4" /> Watchlist</>}
              </Button>
              <Button size="sm" variant="outline" onClick={() => onWatched()} disabled={!!busy || !!done} className="gap-1">
                {busy === "watched" ? <Loader2 className="w-4 h-4 animate-spin" /> : done === "watched" ? <>Watched</> : <><Eye className="w-4 h-4" /> Watched</>}
              </Button>
              <Button size="sm" variant="ghost" onClick={() => onDismiss()} disabled={!!busy || !!done} aria-label="Dismiss">
                {busy === "dismiss" ? <Loader2 className="w-4 h-4 animate-spin" /> : <X className="w-4 h-4" />}
              </Button>
            </div>
            {item.url && (
              <a
                href={item.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
              >
                theguardian.com <ExternalLink className="w-3 h-3" />
              </a>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {item.trailerKey && (
        <Dialog open={trailerOpen} onOpenChange={setTrailerOpen}>
          <DialogContent className="max-w-[100vw] w-screen h-screen sm:max-w-2xl sm:w-auto sm:h-auto p-0 overflow-hidden border-0 sm:border rounded-none sm:rounded-lg" aria-describedby={undefined}>
            <div className="w-full h-full sm:aspect-video flex items-center justify-center bg-black">
              <iframe
                src={`https://www.youtube.com/embed/${item.trailerKey}?autoplay=1`}
                title={`${item.title} trailer`}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                className="w-full h-full"
              />
            </div>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}


// Map either a Release (new_release) or GuardianReviewItem (guardian_review)
// onto the unified card shape. Released films can also carry an attached
// Guardian review (via guardianRating/guardianExcerpt/guardianBody fields), so
// we surface those when present.
function unifiedCardBase(pick: UnifiedPick): GuardianCardBase {
  if (pick.source === "new_release") {
    const r = pick.item as Release;
    return {
      id: r.id,
      title: r.title,
      mediaType: r.mediaType,
      year: r.year,
      posterPath: r.posterPath,
      tmdbRating: r.tmdbRating,
      starRating: r.guardianRating && r.guardianRating > 0 ? r.guardianRating : null,
      excerpt: r.guardianExcerpt || r.overview,
      body: r.guardianBody,
      url: r.guardianUrl || "",
      trailerKey: r.trailerKey,
      genres: r.genres,
    };
  }
  const r = pick.item as GuardianReviewItem;
  return {
    id: r.id,
    title: r.title,
    mediaType: r.mediaType,
    year: r.year,
    posterPath: r.posterPath,
    tmdbRating: r.tmdbRating,
    starRating: r.starRating && r.starRating > 0 ? r.starRating : null,
    excerpt: r.excerpt,
    body: r.body,
    url: r.url,
    trailerKey: r.trailerKey,
    genres: r.genres,
  };
}

function UnifiedPickCard({ pick }: { pick: UnifiedPick }) {
  const { user } = useUser();
  const queryClient = useQueryClient();
  const [busy, setBusy] = useState<null | "watchlist" | "watched" | "dismiss">(null);
  const [done, setDone] = useState<null | "watchlist" | "watched" | "dismiss">(null);
  const [celebrating, setCelebrating] = useState(false);

  const invalidate = () => {
    if (!user) return;
    queryClient.invalidateQueries({ queryKey: [`/api/users/${user.id}/history`] });
    queryClient.invalidateQueries({ queryKey: [`/api/users/${user.id}/rejected`] });
    queryClient.invalidateQueries({ queryKey: [`/api/users/${user.id}/watchlist`] });
    const prefix = `/api/users/${user.id}/picks`;
    queryClient.invalidateQueries({
      predicate: (q) => {
        const k = q.queryKey[0];
        return typeof k === "string" && k.startsWith(prefix);
      },
    });
  };

  const doAction = async (
    kind: "watchlist" | "watched" | "dismiss",
    rating?: "loved" | "ok" | "disliked"
  ) => {
    if (!user || busy || done) return;
    setBusy(kind);
    try {
      const action =
        kind === "watchlist" ? "add_to_watchlist" : kind === "watched" ? "watched" : "rejected";
      await apiRequest(
        "POST",
        `/api/users/${user.id}/picks/${pick.id}/action`,
        { action, rating }
      );
      setDone(kind);
      if (kind === "watched" && rating === "loved") {
        setCelebrating(true);
        setTimeout(() => {
          setCelebrating(false);
          invalidate();
        }, 800);
      } else {
        invalidate();
      }
    } finally {
      setBusy(null);
    }
  };

  return (
    <GuardianCardShell
      item={unifiedCardBase(pick)}
      matchPct={pick.relevanceScore}
      personalReason={pick.reason}
      onWatchlist={() => doAction("watchlist")}
      onWatched={(rating) => doAction("watched", rating)}
      onDismiss={() => doAction("dismiss")}
      busy={busy}
      done={done}
      celebrating={celebrating}
    />
  );
}

function CarouselOverlay({
  picks,
  initialIndex,
  onClose,
}: {
  picks: UnifiedPick[];
  initialIndex: number;
  onClose: () => void;
}) {
  const { user } = useUser();
  const queryClient = useQueryClient();
  const [index, setIndex] = useState(initialIndex);
  const [trailerOpen, setTrailerOpen] = useState(false);
  const [showWatchedOptions, setShowWatchedOptions] = useState(false);
  const [busy, setBusy] = useState<null | "watchlist" | "watched" | "dismiss">(null);
  const [done, setDone] = useState<null | "watchlist" | "watched" | "dismiss">(null);
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set());

  const visiblePicks = picks.filter((p) => !dismissedIds.has(p.id));
  const safeIndex = Math.min(index, Math.max(0, visiblePicks.length - 1));
  const pick = visiblePicks[safeIndex];
  const total = visiblePicks.length;

  useEffect(() => {
    setDone(null);
    setBusy(null);
    setShowWatchedOptions(false);
    setTrailerOpen(false);
  }, [pick?.id]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      else if (e.key === "ArrowRight") setIndex((i) => Math.min(i + 1, total - 1));
      else if (e.key === "ArrowLeft") setIndex((i) => Math.max(i - 1, 0));
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose, total]);

  const invalidate = () => {
    if (!user) return;
    queryClient.invalidateQueries({ queryKey: [`/api/users/${user.id}/history`] });
    queryClient.invalidateQueries({ queryKey: [`/api/users/${user.id}/rejected`] });
    queryClient.invalidateQueries({ queryKey: [`/api/users/${user.id}/watchlist`] });
    const prefix = `/api/users/${user.id}/picks`;
    queryClient.invalidateQueries({
      predicate: (q) => {
        const k = q.queryKey[0];
        return typeof k === "string" && k.startsWith(prefix);
      },
    });
  };

  const doAction = async (
    kind: "watchlist" | "watched" | "dismiss",
    rating?: "loved" | "ok" | "disliked"
  ) => {
    if (!user || busy || done || !pick) return;
    setBusy(kind);
    try {
      const action =
        kind === "watchlist" ? "add_to_watchlist" : kind === "watched" ? "watched" : "rejected";
      await apiRequest("POST", `/api/users/${user.id}/picks/${pick.id}/action`, { action, rating });
      setDone(kind);
      invalidate();
      setTimeout(() => {
        const id = pick.id;
        setDismissedIds((prev) => {
          const next = new Set(prev);
          next.add(id);
          return next;
        });
      }, 700);
    } catch {
      setBusy(null);
    }
  };

  if (!pick) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90">
        <div className="text-center text-white space-y-4">
          <p className="text-lg font-medium">All done!</p>
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-full bg-primary text-white text-sm font-medium"
          >
            Close
          </button>
        </div>
      </div>
    );
  }

  const item = unifiedCardBase(pick);
  const posterUrl = item.posterPath ? `${TMDB_IMAGE_BASE}/w500${item.posterPath}` : null;
  const genres = Array.isArray(item.genres) ? item.genres : [];
  const matchPct = pick.relevanceScore;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-hidden">
      {/* Blurred poster backdrop */}
      <div className="absolute inset-0">
        {posterUrl ? (
          <div
            className="absolute inset-0 bg-cover bg-center scale-110"
            style={{ backgroundImage: `url(${posterUrl})`, filter: "blur(28px) brightness(0.2)" }}
          />
        ) : (
          <div className="absolute inset-0 bg-[#1B2240]" />
        )}
        <div className="absolute inset-0 bg-black/50" />
      </div>

      {/* Close */}
      <button
        onClick={onClose}
        className="absolute top-4 right-4 z-20 p-2 rounded-full bg-black/40 text-white hover:bg-black/60 transition-colors"
        aria-label="Close"
      >
        <X className="w-5 h-5" />
      </button>

      {/* Counter */}
      <div className="absolute top-5 left-1/2 -translate-x-1/2 z-20 text-sm text-white/50 tabular-nums">
        {safeIndex + 1} / {total}
      </div>

      {/* Left arrow */}
      <button
        onClick={() => setIndex((i) => Math.max(i - 1, 0))}
        disabled={safeIndex === 0}
        className="absolute left-3 top-1/2 -translate-y-1/2 z-20 p-3 rounded-full bg-black/40 text-white hover:bg-black/60 disabled:opacity-20 transition-colors"
        aria-label="Previous"
      >
        <ChevronLeft className="w-7 h-7" />
      </button>

      {/* Right arrow */}
      <button
        onClick={() => setIndex((i) => Math.min(i + 1, total - 1))}
        disabled={safeIndex === total - 1}
        className="absolute right-3 top-1/2 -translate-y-1/2 z-20 p-3 rounded-full bg-black/40 text-white hover:bg-black/60 disabled:opacity-20 transition-colors"
        aria-label="Next"
      >
        <ChevronRight className="w-7 h-7" />
      </button>

      {/* Fullscreen trailer via TrailerPlayer */}
      {trailerOpen && item.trailerKey && (
        <TrailerPlayer
          trailerKey={item.trailerKey}
          title={item.title}
          onClose={() => setTrailerOpen(false)}
        />
      )}

      {/* Main content — always side-by-side poster layout */}
      <div className="relative z-10 w-full mx-auto overflow-y-auto max-h-screen flex flex-col md:flex-row items-center md:items-start gap-8 max-w-4xl px-16 md:px-24 py-16">

        {/* Poster */}
        {true && (
          <div className="shrink-0 self-center">
            {posterUrl ? (
              <div className="relative">
                <img
                  src={posterUrl}
                  alt={item.title}
                  className="w-48 h-72 md:w-64 md:h-96 rounded-xl object-cover shadow-2xl"
                />
                {matchPct != null && (
                  <span className={`absolute top-2 right-2 text-xs px-2 py-0.5 rounded-full font-bold shadow ${matchColor(matchPct)}`}>
                    {matchPct}%
                  </span>
                )}
              </div>
            ) : (
              <div className="w-48 h-72 md:w-64 md:h-96 rounded-xl bg-white/10 flex items-center justify-center shadow-2xl">
                {item.mediaType === "film" ? (
                  <Film className="w-16 h-16 text-white/30" />
                ) : (
                  <Tv className="w-16 h-16 text-white/30" />
                )}
              </div>
            )}
          </div>
        )}

        {/* Info block */}
        <div className="flex-1 text-center md:text-left md:py-6">
          <h2 className="text-white text-2xl md:text-3xl font-semibold leading-tight mb-2">
            {item.title}
          </h2>

          {/* Meta row */}
          <div className="flex items-center justify-center md:justify-start flex-wrap gap-x-2 gap-y-0.5 text-sm text-white/50 mb-4">
            {item.year && <span>{item.year}</span>}
            <span>·</span>
            <span className="capitalize">{item.mediaType}</span>
            {item.tmdbRating && (
              <>
                <span>·</span>
                <span className="px-1.5 py-0.5 rounded bg-[#fec666]/20 text-[#fec666] font-medium text-xs">
                  {item.tmdbRating}
                </span>
              </>
            )}
            {item.starRating != null && (
              <>
                <span>·</span>
                <span className="flex items-center gap-0.5">
                  {[...Array(5)].map((_, i) => (
                    <Star
                      key={i}
                      className={`w-3 h-3 ${i < item.starRating! ? "text-[#fec666] fill-[#fec666]" : "text-white/20"}`}
                    />
                  ))}
                </span>
              </>
            )}
          </div>

          {/* Why this pick */}
          {(pick.reason || item.excerpt) && (
            <p className="text-base text-white/75 leading-relaxed line-clamp-4 mb-4">
              {pick.reason || item.excerpt}
            </p>
          )}

          {/* Genre tags */}
          {genres.length > 0 && (
            <div className="flex flex-wrap justify-center md:justify-start gap-1.5 mb-4">
              {genres.slice(0, 4).map((g) => (
                <span key={g} className="text-xs px-2.5 py-1 rounded-full bg-white/10 text-white/60">
                  {g}
                </span>
              ))}
            </div>
          )}

          {/* Trailer / review links */}
          {(item.trailerKey || (item.starRating != null && item.url)) && (
            <div className="flex items-center justify-center md:justify-start gap-4 mb-6">
              {item.trailerKey && (
                <button
                  onClick={() => setTrailerOpen(true)}
                  className="inline-flex items-center gap-1.5 text-sm text-[#93b6ee] hover:underline"
                >
                  <Play className="w-3.5 h-3.5" />
                  Play trailer
                </button>
              )}
              {item.starRating != null && item.url && (
                <a
                  href={item.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-sm text-[#93b6ee] hover:underline"
                >
                  <ExternalLink className="w-3.5 h-3.5" /> Read review
                </a>
              )}
            </div>
          )}

          {/* Action buttons */}
          {showWatchedOptions ? (
            <div className="flex items-center justify-center md:justify-start gap-3 flex-wrap">
              <span className="text-sm text-white/40 mr-1">Rate it:</span>
              {(["loved", "ok", "disliked"] as const).map((r) => (
                <button
                  key={r}
                  onClick={() => { setShowWatchedOptions(false); doAction("watched", r); }}
                  disabled={!!busy}
                  className="inline-flex items-center gap-1.5 text-sm px-4 py-2 rounded-full bg-white/10 hover:bg-white/20 text-white disabled:opacity-40"
                >
                  {r === "loved" && <Heart className="w-3.5 h-3.5 text-[#f16c5f] fill-[#f16c5f]" />}
                  {r === "ok" && <Meh className="w-3.5 h-3.5 text-[#fec666]" />}
                  {r === "disliked" && <ThumbsDown className="w-3.5 h-3.5 text-destructive" />}
                  {r === "loved" ? "Loved" : r === "ok" ? "OK" : "Nah"}
                </button>
              ))}
              <button onClick={() => setShowWatchedOptions(false)} className="text-white/40 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="flex items-center justify-center md:justify-start gap-3">
              <button
                onClick={() => doAction("watchlist")}
                disabled={!!busy || !!done}
                className={`inline-flex items-center gap-2 text-sm px-5 py-2.5 rounded-full font-medium transition-colors ${
                  done === "watchlist"
                    ? "bg-[#93b6ee] text-white"
                    : "bg-primary text-white hover:bg-primary/90 disabled:opacity-40"
                }`}
              >
                {busy === "watchlist" ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : done === "watchlist" ? "Added" : (
                  <><Plus className="w-4 h-4" /> Watchlist</>
                )}
              </button>
              <button
                onClick={() => setShowWatchedOptions(true)}
                disabled={!!busy || !!done}
                className={`inline-flex items-center gap-2 text-sm px-5 py-2.5 rounded-full font-medium transition-colors ${
                  done === "watched"
                    ? "bg-[#93b6ee] text-white"
                    : "bg-white/10 text-white hover:bg-white/20 disabled:opacity-40"
                }`}
              >
                {busy === "watched" ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : done === "watched" ? "Watched" : (
                  <><Eye className="w-4 h-4" /> Watched</>
                )}
              </button>
              <button
                onClick={() => doAction("dismiss")}
                disabled={!!busy || !!done}
                aria-label="Dismiss"
                className={`p-2.5 rounded-full transition-colors ${
                  done === "dismiss" ? "text-[#93b6ee]" : "text-white/40 hover:text-white disabled:opacity-40"
                }`}
              >
                {busy === "dismiss" ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <X className="w-5 h-5" />
                )}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
