import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useUser } from "@/hooks/use-user";
import { apiRequest } from "@/lib/queryClient";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { TrailerPlayer } from "@/components/TrailerPlayer";
import {
  Film,
  Tv,
  Trash2,
  Eye,
  Heart,
  Meh,
  ThumbsDown,
  Loader2,
  ListVideo,
  X,
  Play,
  Star,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  LayoutGrid,
} from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { isTV } from "@/lib/tv";

const TMDB_IMAGE_BASE = "https://image.tmdb.org/t/p";

interface Release {
  imdbId: string | null;
  posterPath: string | null;
  trailerKey: string | null;
  guardianUrl: string | null;
  guardianRating: number | null;
  guardianExcerpt: string | null;
  guardianBody: string | null;
  tmdbRating: string | null;
  genres: string[] | null;
  streamingUk: Array<{ provider: string; logoPath: string; type?: string }> | null;
  inCinemas: number | null;
  overview: string | null;
}

interface WatchlistItem {
  id: string;
  title: string;
  mediaType: "film" | "tv";
  year: number | null;
  priority: number;
  recommendationReason: string | null;
  addedDate: string;
  release?: Release;
}

type AvailFilter = "all" | "streamable" | "cinema";

function getAvailability(item: WatchlistItem): { streamable: boolean; inCinemas: boolean } {
  const streaming = Array.isArray(item.release?.streamingUk) ? item.release!.streamingUk : [];
  const hasStream = streaming.some((s) => s.type === "stream" || !s.type);
  const inCinemas = !!(item.release?.inCinemas);
  return { streamable: hasStream, inCinemas };
}

export function WatchlistView() {
  const { user } = useUser();
  const queryClient = useQueryClient();
  const [availFilter, setAvailFilter] = useState<AvailFilter>("all");
  const [carouselOpen, setCarouselOpen] = useState(false);
  const [carouselIndex, setCarouselIndex] = useState(0);

  const { data: watchlist, isLoading } = useQuery<WatchlistItem[]>({
    queryKey: [`/api/users/${user?.id}/watchlist`],
    enabled: !!user,
  });

  const removeMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("DELETE", `/api/watchlist/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/users/${user?.id}/watchlist`] });
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!watchlist || watchlist.length === 0) {
    return (
      <div className="text-center py-12">
        <ListVideo className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
        <h3 className="text-lg font-medium mb-2">Your watchlist is empty</h3>
        <p className="text-muted-foreground text-sm">
          Add films and shows from recommendations to watch later
        </p>
      </div>
    );
  }

  const streamableCount = watchlist?.filter((i) => getAvailability(i).streamable).length || 0;
  const cinemaCount = watchlist?.filter((i) => getAvailability(i).inCinemas).length || 0;

  const filtered = (watchlist || []).filter((item) => {
    if (availFilter === "all") return true;
    const avail = getAvailability(item);
    if (availFilter === "streamable") return avail.streamable;
    if (availFilter === "cinema") return avail.inCinemas;
    return true;
  });

  // Sort: streamable first, then cinema, then rest
  const sorted = [...filtered].sort((a, b) => {
    const aa = getAvailability(a);
    const ba = getAvailability(b);
    if (aa.streamable !== ba.streamable) return aa.streamable ? -1 : 1;
    if (aa.inCinemas !== ba.inCinemas) return aa.inCinemas ? -1 : 1;
    return 0;
  });

  return (
    <>
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">My Watchlist</h2>
        <span className="text-sm text-muted-foreground">{watchlist.length} items</span>
      </div>

      {/* Availability filter + Browse button */}
      <div className="flex items-center gap-2 flex-wrap">
        <button
          onClick={() => setAvailFilter("all")}
          className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
            availFilter === "all"
              ? "bg-primary text-primary-foreground"
              : "bg-muted/50 text-muted-foreground hover:text-foreground"
          }`}
        >
          All
        </button>
        {streamableCount > 0 && (
          <button
            onClick={() => setAvailFilter("streamable")}
            className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
              availFilter === "streamable"
                ? "bg-[#93b6ee] text-[#1B2240]"
                : "bg-muted/50 text-muted-foreground hover:text-foreground"
            }`}
          >
            Ready to stream ({streamableCount})
          </button>
        )}
        {cinemaCount > 0 && (
          <button
            onClick={() => setAvailFilter("cinema")}
            className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
              availFilter === "cinema"
                ? "bg-accent text-accent-foreground"
                : "bg-muted/50 text-muted-foreground hover:text-foreground"
            }`}
          >
            In cinemas ({cinemaCount})
          </button>
        )}
        {sorted.length > 0 && (
          <button
            onClick={() => { setCarouselIndex(0); setCarouselOpen(true); }}
            className="ml-auto inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium bg-muted/50 text-muted-foreground hover:text-foreground transition-colors"
            title="Browse mode"
          >
            <LayoutGrid className="w-3.5 h-3.5" />
            Browse
          </button>
        )}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {sorted.map((item) => (
          <WatchlistItemCard
            key={item.id}
            item={item}
            onRemove={() => removeMutation.mutate(item.id)}
            removing={removeMutation.isPending}
          />
        ))}
      </div>
    </div>

    {carouselOpen && sorted.length > 0 && (
      <WatchlistCarouselOverlay
        items={sorted}
        initialIndex={Math.min(carouselIndex, sorted.length - 1)}
        onClose={() => setCarouselOpen(false)}
      />
    )}
    </>
  );
}

interface WatchlistItemCardProps {
  item: WatchlistItem;
  onRemove: () => void;
  removing: boolean;
}

// Every watchlist item gets a trailer affordance — if TMDB gave us no trailer
// key, fall back to a YouTube search so the button is never missing.
function openYouTubeTrailerSearch(title: string, year: number | null) {
  const q = encodeURIComponent(`${title}${year ? ` ${year}` : ""} trailer`);
  window.open(`https://www.youtube.com/results?search_query=${q}`, "_blank", "noopener");
}

function WatchlistCarouselOverlay({
  items,
  initialIndex,
  onClose,
}: {
  items: WatchlistItem[];
  initialIndex: number;
  onClose: () => void;
}) {
  const { user } = useUser();
  const queryClient = useQueryClient();
  const [index, setIndex] = useState(initialIndex);
  const [trailerOpen, setTrailerOpen] = useState(false);
  const [showRating, setShowRating] = useState(false);
  const [busy, setBusy] = useState(false);
  const [doneIds, setDoneIds] = useState<Set<string>>(new Set());

  const visibleItems = items.filter((i) => !doneIds.has(i.id));
  const safeIndex = Math.min(index, Math.max(0, visibleItems.length - 1));
  const item = visibleItems[safeIndex];
  const total = visibleItems.length;

  useEffect(() => {
    setTrailerOpen(false);
    setShowRating(false);
  }, [item?.id]);

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
    queryClient.invalidateQueries({ queryKey: [`/api/users/${user.id}/watchlist`] });
    queryClient.invalidateQueries({ queryKey: [`/api/users/${user.id}/history`] });
  };

  const handleWatched = async (rating: "loved" | "ok" | "disliked") => {
    if (!user || busy || !item) return;
    setBusy(true);
    setShowRating(false);
    try {
      await apiRequest("POST", `/api/users/${user.id}/history`, {
        title: item.title, mediaType: item.mediaType, year: item.year, rating,
      });
      await apiRequest("DELETE", `/api/watchlist/${item.id}`);
      invalidate();
      const id = item.id;
      setTimeout(() => setDoneIds((prev) => { const n = new Set(prev); n.add(id); return n; }), 600);
    } finally {
      setBusy(false);
    }
  };

  const handleRemove = async () => {
    if (!user || busy || !item) return;
    setBusy(true);
    try {
      await apiRequest("DELETE", `/api/watchlist/${item.id}`);
      invalidate();
      const id = item.id;
      setTimeout(() => setDoneIds((prev) => { const n = new Set(prev); n.add(id); return n; }), 400);
    } finally {
      setBusy(false);
    }
  };

  if (!item) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90">
        <div className="text-center text-white space-y-4">
          <p className="text-lg font-medium">All done!</p>
          <button onClick={onClose} className="px-5 py-2 rounded-full bg-primary text-white text-sm font-medium">
            Close
          </button>
        </div>
      </div>
    );
  }

  const release = item.release;
  const posterUrl = release?.posterPath ? `${TMDB_IMAGE_BASE}/w500${release.posterPath}` : null;
  const genres = Array.isArray(release?.genres) ? release.genres : [];
  const streaming = Array.isArray(release?.streamingUk) ? release.streamingUk : [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-hidden">
      {/* Backdrop */}
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
      <button onClick={onClose} className="absolute top-4 right-4 z-20 p-2 rounded-full bg-black/40 text-white hover:bg-black/60 transition-colors" aria-label="Close">
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

      {/* Main content — stacked when trailer plays, side-by-side for poster */}
      <div className={`relative z-10 w-full mx-auto overflow-y-auto max-h-screen ${
        trailerOpen && release?.trailerKey
          ? "flex flex-col gap-5 max-w-5xl px-10 py-10"
          : "flex flex-col md:flex-row items-center md:items-start gap-8 max-w-4xl px-16 md:px-24 py-16"
      }`}>

        {/* Inline trailer or poster */}
        {trailerOpen && release?.trailerKey ? (
          <div className="w-full aspect-video rounded-xl overflow-hidden shadow-2xl">
            <iframe
              src={`https://www.youtube.com/embed/${release.trailerKey}?autoplay=1`}
              title={`${item.title} trailer`}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              className="w-full h-full"
            />
          </div>
        ) : (
          <div className="shrink-0 self-center">
            {posterUrl ? (
              <img
                src={posterUrl}
                alt={item.title}
                className="w-48 h-72 md:w-64 md:h-96 rounded-xl object-cover shadow-2xl"
              />
            ) : (
              <div className="w-48 h-72 md:w-64 md:h-96 rounded-xl bg-white/10 flex items-center justify-center shadow-2xl">
                {item.mediaType === "film" ? <Film className="w-16 h-16 text-white/30" /> : <Tv className="w-16 h-16 text-white/30" />}
              </div>
            )}
          </div>
        )}

        {/* Info */}
        <div className={`flex-1 text-center ${trailerOpen && release?.trailerKey ? "" : "md:text-left md:py-6"}`}>
          <h2 className="text-white text-2xl md:text-3xl font-semibold leading-tight mb-2">{item.title}</h2>

          {/* Meta */}
          <div className="flex items-center justify-center md:justify-start flex-wrap gap-x-2 gap-y-0.5 text-sm text-white/50 mb-4">
            {item.year && <span>{item.year}</span>}
            <span>·</span>
            <span className="capitalize">{item.mediaType}</span>
            {release?.tmdbRating && (
              <><span>·</span><span className="px-1.5 py-0.5 rounded bg-[#fec666]/20 text-[#fec666] font-medium text-xs">{release.tmdbRating}</span></>
            )}
            {release?.guardianRating ? (
              <><span>·</span><span className="flex items-center gap-0.5">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className={`w-3 h-3 ${i < release.guardianRating! ? "text-[#fec666] fill-[#fec666]" : "text-white/20"}`} />
                ))}
              </span></>
            ) : null}
          </div>

          {/* Availability */}
          {(!!release?.inCinemas || streaming.some((s) => s.type === "stream" || !s.type)) && (
            <div className="flex items-center justify-center md:justify-start gap-2 mb-4">
              {!!release?.inCinemas && (
                <span className="text-xs px-2.5 py-1 rounded-full bg-accent/20 text-accent font-medium">In cinemas</span>
              )}
              {streaming.some((s) => s.type === "stream" || !s.type) && (
                <span className="text-xs px-2.5 py-1 rounded-full bg-[#93b6ee]/20 text-[#93b6ee] font-medium">On streaming</span>
              )}
            </div>
          )}

          {/* Reason */}
          {item.recommendationReason && (
            <p className="text-base text-white/75 leading-relaxed line-clamp-4 mb-4">{item.recommendationReason}</p>
          )}

          {/* Genres */}
          {genres.length > 0 && (
            <div className="flex flex-wrap justify-center md:justify-start gap-1.5 mb-4">
              {genres.slice(0, 4).map((g) => (
                <span key={g} className="text-xs px-2.5 py-1 rounded-full bg-white/10 text-white/60">{g}</span>
              ))}
            </div>
          )}

          {/* Links */}
          {(
            <div className="flex items-center justify-center md:justify-start gap-4 mb-6">
              {release?.trailerKey ? (
                <button onClick={() => setTrailerOpen((v) => !v)} className="inline-flex items-center gap-1.5 text-sm text-[#93b6ee] hover:underline">
                  <Play className="w-3.5 h-3.5" />
                  {trailerOpen ? "Hide trailer" : "Play trailer"}
                </button>
              ) : (
                <button onClick={() => openYouTubeTrailerSearch(item.title, item.year)} className="inline-flex items-center gap-1.5 text-sm text-[#93b6ee] hover:underline">
                  <Play className="w-3.5 h-3.5" /> Trailer (YouTube)
                </button>
              )}
              {release?.guardianUrl && (
                <a href={release.guardianUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-sm text-[#93b6ee] hover:underline">
                  <ExternalLink className="w-3.5 h-3.5" /> Read review
                </a>
              )}
            </div>
          )}

          {/* Actions */}
          {showRating ? (
            <div className="flex items-center justify-center md:justify-start gap-3 flex-wrap">
              <span className="text-sm text-white/40">How was it?</span>
              {(["loved", "ok", "disliked"] as const).map((r) => (
                <button key={r} onClick={() => handleWatched(r)} disabled={busy} className="inline-flex items-center gap-1.5 text-sm px-4 py-2 rounded-full bg-white/10 hover:bg-white/20 text-white disabled:opacity-40">
                  {r === "loved" && <Heart className="w-3.5 h-3.5 text-[#f16c5f] fill-[#f16c5f]" />}
                  {r === "ok" && <Meh className="w-3.5 h-3.5 text-[#fec666]" />}
                  {r === "disliked" && <ThumbsDown className="w-3.5 h-3.5 text-destructive" />}
                  {r === "loved" ? "Loved" : r === "ok" ? "OK" : "Nah"}
                </button>
              ))}
              <button onClick={() => setShowRating(false)} className="text-white/40 hover:text-white"><X className="w-4 h-4" /></button>
            </div>
          ) : (
            <div className="flex items-center justify-center md:justify-start gap-3 flex-wrap">
              {release?.imdbId && (
                <button
                  onClick={() => window.open(`stremio:///detail/${item.mediaType === "film" ? "movie" : "series"}/${release.imdbId}/${release.imdbId}`, "_self")}
                  className="inline-flex items-center gap-2 text-sm px-5 py-2.5 rounded-full font-medium border border-[#93b6ee]/40 bg-[#93b6ee]/10 text-[#93b6ee] hover:bg-[#93b6ee]/20 transition-colors"
                >
                  <Play className="w-4 h-4" /> Stremio
                </button>
              )}
              <button
                onClick={() => setShowRating(true)}
                disabled={busy}
                className="inline-flex items-center gap-2 text-sm px-5 py-2.5 rounded-full font-medium bg-white/10 text-white hover:bg-white/20 disabled:opacity-40 transition-colors"
              >
                <Eye className="w-4 h-4" /> Watched
              </button>
              <button
                onClick={handleRemove}
                disabled={busy}
                aria-label="Remove from watchlist"
                className="p-2.5 rounded-full text-white/40 hover:text-white disabled:opacity-40 transition-colors"
              >
                {busy ? <Loader2 className="w-5 h-5 animate-spin" /> : <Trash2 className="w-5 h-5" />}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function WatchlistItemCard({ item, onRemove, removing }: WatchlistItemCardProps) {
  const { user } = useUser();
  const queryClient = useQueryClient();
  const [showRating, setShowRating] = useState(false);
  const [marking, setMarking] = useState(false);
  const [trailerOpen, setTrailerOpen] = useState(false);
  const [reviewOpen, setReviewOpen] = useState(false);
  const reviewOpenedAt = useRef(0);

  const openReview = () => {
    reviewOpenedAt.current = Date.now();
    setShowRating(false);
    setReviewOpen(true);
  };

  const dialogGuard = () => isTV() && Date.now() - reviewOpenedAt.current < 500;

  const release = item.release;
  const posterUrl = release?.posterPath
    ? `${TMDB_IMAGE_BASE}/w300${release.posterPath}`
    : null;
  const genres = Array.isArray(release?.genres) ? release.genres : [];
  const streaming = Array.isArray(release?.streamingUk) ? release.streamingUk : [];

  const handleMarkWatched = async (rating: "loved" | "ok" | "disliked") => {
    if (!user) return;
    setMarking(true);
    try {
      await apiRequest("POST", `/api/users/${user.id}/history`, {
        title: item.title,
        mediaType: item.mediaType,
        year: item.year,
        rating,
      });
      await apiRequest("DELETE", `/api/watchlist/${item.id}`);
      queryClient.invalidateQueries({ queryKey: [`/api/users/${user.id}/watchlist`] });
      queryClient.invalidateQueries({ queryKey: [`/api/users/${user.id}/history`] });
    } finally {
      setMarking(false);
    }
  };

  return (
    <>
      <Card
        tabIndex={0}
        className="bg-card border border-border shadow-md cursor-pointer hover:border-accent/40 transition-all duration-200"
        onClick={openReview}
      >
        <CardContent className="p-4">
          <div className="flex gap-4">
            {/* Poster */}
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
                  <Film className="w-6 h-6 text-primary" />
                ) : (
                  <Tv className="w-6 h-6 text-accent" />
                )}
              </div>
            )}

            <div className="flex-1 min-w-0">
              {/* Title */}
              <h3 className="font-semibold text-base leading-snug mb-1">{item.title}</h3>

              {/* Meta row */}
              <div className="flex items-center flex-wrap gap-x-2 gap-y-0.5 text-xs text-muted-foreground mb-2">
                {item.year && <span>{item.year}</span>}
                <span className="opacity-40">·</span>
                <span className="capitalize">{item.mediaType}</span>
                {release?.tmdbRating && (
                  <>
                    <span className="opacity-40">·</span>
                    <span className="px-1.5 py-0.5 rounded bg-[#fec666]/20 text-[#fec666] font-medium">
                      {release.tmdbRating}
                    </span>
                  </>
                )}
                {release?.guardianRating && (
                  <>
                    <span className="opacity-40">·</span>
                    <span className="flex items-center gap-0.5">
                      {[...Array(5)].map((_, i) => (
                        <Star key={i} className={`w-2.5 h-2.5 ${i < release.guardianRating! ? "text-[#fec666] fill-[#fec666]" : "text-muted-foreground/40"}`} />
                      ))}
                    </span>
                  </>
                )}
              </div>

              {/* Reason */}
              {item.recommendationReason && (
                <p className="text-sm text-muted-foreground leading-relaxed line-clamp-2 mb-2">
                  {item.recommendationReason}
                </p>
              )}

              {/* Genre pills */}
              {genres.length > 0 && (
                <div className="flex flex-wrap gap-1 mb-2">
                  {genres.slice(0, 3).map((genre) => (
                    <span key={genre} className="text-xs px-2 py-0.5 rounded bg-muted/60 text-muted-foreground">
                      {genre}
                    </span>
                  ))}
                </div>
              )}

              {/* Trailer — always available so you can re-check why you saved it */}
              <button
                tabIndex={-1}
                onClick={(e) => {
                  e.stopPropagation();
                  if (isTV()) return;
                  if (release?.trailerKey) setTrailerOpen(true);
                  else openYouTubeTrailerSearch(item.title, item.year);
                }}
                className="inline-flex items-center gap-1 text-xs text-accent hover:underline mb-2"
              >
                <Play className="w-2.5 h-2.5" /> Trailer
              </button>

              {/* Availability */}
              {(!!release?.inCinemas || streaming.length > 0) && (
                <div className="flex items-center gap-1.5">
                  {!!release?.inCinemas && (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-accent/20 text-accent font-medium">
                      In cinemas
                    </span>
                  )}
                  {streaming.some(s => s.type === "stream" || !s.type) && (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-[#93b6ee]/20 text-[#93b6ee] font-medium">
                      On streaming
                    </span>
                  )}
                  {!streaming.some(s => s.type === "stream" || !s.type) && streaming.some(s => s.type === "rent") && (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                      Rent available
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Trailer player */}
      {trailerOpen && release?.trailerKey && (
        <TrailerPlayer
          trailerKey={release.trailerKey}
          title={item.title}
          onClose={() => setTrailerOpen(false)}
        />
      )}

      {/* Action dialog — same pattern as Discover */}
      <Dialog open={reviewOpen} onOpenChange={setReviewOpen}>
        <DialogContent
          className="sm:max-w-xl max-h-[80vh] overflow-hidden flex flex-col"
          aria-describedby={undefined}
        >
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <span>{item.title}</span>
              {release?.guardianRating && (
                <div className="flex items-center gap-0.5">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className={`w-4 h-4 ${i < release.guardianRating! ? "text-[#fec666] fill-[#fec666]" : "text-muted-foreground"}`} />
                  ))}
                </div>
              )}
            </DialogTitle>
          </DialogHeader>

          {/* Review text if available */}
          {(release?.guardianBody || release?.guardianExcerpt || item.recommendationReason) && (
            <div className="overflow-y-auto flex-1 pr-2 space-y-3">
              {release?.guardianBody ? (
                <div className="text-sm leading-relaxed whitespace-pre-line text-muted-foreground">{release.guardianBody}</div>
              ) : release?.guardianExcerpt ? (
                <p className="text-sm leading-relaxed text-muted-foreground">{release.guardianExcerpt}</p>
              ) : (
                <p className="text-sm leading-relaxed text-muted-foreground">{item.recommendationReason}</p>
              )}
            </div>
          )}

          {release?.guardianUrl && (
            <div className="pb-2">
              <a href={release.guardianUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1">
                View on theguardian.com <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          )}

          {/* Actions */}
          <div className="pt-3 border-t border-border/50 flex flex-col gap-2">
            {showRating ? (
              <>
                <p className="text-sm text-muted-foreground">How was it?</p>
                <Button size="sm" autoFocus onClick={() => { if (dialogGuard()) return; handleMarkWatched("loved"); }} disabled={!!marking} className="gap-1 justify-start">
                  <Heart className="w-3.5 h-3.5" /> Loved
                </Button>
                <Button size="sm" variant="outline" onClick={() => { if (dialogGuard()) return; handleMarkWatched("ok"); }} disabled={!!marking} className="gap-1 justify-start">
                  <Meh className="w-3.5 h-3.5" /> OK
                </Button>
                <Button size="sm" variant="outline" onClick={() => { if (dialogGuard()) return; handleMarkWatched("disliked"); }} disabled={!!marking} className="gap-1 justify-start">
                  <ThumbsDown className="w-3.5 h-3.5" /> Nah
                </Button>
                <Button size="sm" variant="ghost" onClick={() => { if (dialogGuard()) return; setShowRating(false); }} className="gap-1 justify-start">
                  <X className="w-3.5 h-3.5" /> Cancel
                </Button>
              </>
            ) : (
              <>
                {release?.trailerKey ? (
                  <Button size="sm" variant="outline" onClick={() => { if (dialogGuard()) return; setReviewOpen(false); setTrailerOpen(true); }} className="gap-1 justify-start">
                    <Play className="w-3.5 h-3.5" /> Trailer
                  </Button>
                ) : (
                  <Button size="sm" variant="outline" onClick={() => { if (dialogGuard()) return; openYouTubeTrailerSearch(item.title, item.year); }} className="gap-1 justify-start">
                    <Play className="w-3.5 h-3.5" /> Trailer (YouTube)
                  </Button>
                )}
                {release?.imdbId && (
                  <Button size="sm" variant="outline" onClick={() => { if (dialogGuard()) return; window.open(`stremio:///detail/${item.mediaType === "film" ? "movie" : "series"}/${release.imdbId}/${release.imdbId}`, "_self"); }} className="gap-1 justify-start border-[#93b6ee]/40 text-[#93b6ee] hover:bg-[#93b6ee]/20">
                    <Play className="w-3.5 h-3.5" /> Stremio
                  </Button>
                )}
                <Button size="sm" variant="outline" onClick={() => { if (dialogGuard()) return; setShowRating(true); }} disabled={!!marking} className="gap-1 justify-start">
                  <Eye className="w-3.5 h-3.5" /> Watched
                </Button>
                <Button size="sm" variant="ghost" onClick={() => { if (dialogGuard()) return; setReviewOpen(false); onRemove(); }} disabled={removing} className="gap-1 justify-start text-destructive hover:text-destructive">
                  <Trash2 className="w-3.5 h-3.5" /> Remove
                </Button>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
