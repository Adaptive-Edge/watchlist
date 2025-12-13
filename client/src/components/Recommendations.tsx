import { useState, useRef } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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
} from "lucide-react";

interface Recommendation {
  title: string;
  year: number;
  mediaType: "film" | "tv";
  reason: string;
}

export function Recommendations() {
  const { user } = useUser();
  const queryClient = useQueryClient();
  const [request, setRequest] = useState("");
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [celebrating, setCelebrating] = useState<string | null>(null);

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
        // Trigger celebration animation
        setCelebrating(rec.title);
        // Wait for animation before removing
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

  return (
    <div className="space-y-6">
      {/* Request Input */}
      <Card className="glass">
        <CardContent className="p-4">
          <div className="flex gap-2">
            <input
              type="text"
              value={request}
              onChange={(e) => setRequest(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleGenerate()}
              placeholder="What are you in the mood for? e.g. 'Something like Breaking Bad but funnier'"
              className="flex-1 px-4 py-3 rounded-lg bg-muted/50 border border-border focus:border-[var(--ae-accent-cyan)] outline-none text-sm"
            />
            <Button
              onClick={handleGenerate}
              disabled={generateMutation.isPending}
              className="glow-cyan"
            >
              {generateMutation.isPending ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : request ? (
                <Send className="w-5 h-5" />
              ) : (
                <Sparkles className="w-5 h-5" />
              )}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            {request
              ? "Press enter or click to search"
              : "Click to get personalized recommendations based on your profile"}
          </p>
        </CardContent>
      </Card>

      {/* Recommendations */}
      {generateMutation.isPending && recommendations.length === 0 && (
        <div className="flex flex-col items-center justify-center py-12 space-y-4">
          <Loader2 className="w-8 h-8 animate-spin text-[var(--ae-accent-cyan)]" />
          <p className="text-muted-foreground">Finding perfect recommendations for you...</p>
        </div>
      )}

      {recommendations.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Recommendations</h2>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => generateMutation.mutate(undefined)}
              disabled={generateMutation.isPending}
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${generateMutation.isPending ? "animate-spin" : ""}`} />
              Refresh
            </Button>
          </div>

          <div className="grid gap-4">
            {recommendations.map((rec) => (
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
          </div>
        </div>
      )}

      {!generateMutation.isPending && recommendations.length === 0 && (
        <div className="text-center py-12">
          <Sparkles className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium mb-2">Ready for recommendations?</h3>
          <p className="text-muted-foreground text-sm max-w-md mx-auto">
            Click the sparkle button to get personalized suggestions, or type what you're in the mood for.
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

  return (
    <Card className={`glass overflow-hidden transition-all duration-500 ${celebrating ? "scale-[1.02] shadow-[0_0_30px_rgba(236,72,153,0.4)]" : ""}`}>
      <CardContent className="p-4 relative overflow-visible">
        {/* Celebration sparkles */}
        {celebrating && (
          <div className="absolute inset-0 pointer-events-none">
            {[...Array(12)].map((_, i) => (
              <span
                key={i}
                className="absolute w-2 h-2 rounded-full animate-sparkle"
                style={{
                  left: `${20 + Math.random() * 60}%`,
                  top: `${20 + Math.random() * 60}%`,
                  backgroundColor: ['#ec4899', '#f472b6', '#fbbf24', '#facc15', '#a855f7'][i % 5],
                  animationDelay: `${i * 50}ms`,
                }}
              />
            ))}
          </div>
        )}
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-lg bg-muted flex items-center justify-center shrink-0">
            {recommendation.mediaType === "film" ? (
              <Film className="w-6 h-6 text-[var(--ae-accent-cyan)]" />
            ) : (
              <Tv className="w-6 h-6 text-[var(--ae-accent-magenta)]" />
            )}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold truncate">{recommendation.title}</h3>
              <span className="text-sm text-muted-foreground shrink-0">
                ({recommendation.year})
              </span>
            </div>
            <p className="text-sm text-muted-foreground mt-1">{recommendation.reason}</p>

            {showWatchedOptions ? (
              <div className="flex gap-2 mt-3">
                <span className="text-sm text-muted-foreground self-center mr-2">Rate it:</span>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => onWatched("loved")}
                  disabled={loading}
                  className="gap-1"
                >
                  <Heart className="w-4 h-4 text-pink-500" /> Loved it
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => onWatched("ok")}
                  disabled={loading}
                  className="gap-1"
                >
                  <Meh className="w-4 h-4 text-yellow-500" /> OK
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => onWatched("disliked")}
                  disabled={loading}
                  className="gap-1"
                >
                  <ThumbsDown className="w-4 h-4 text-red-500" /> Didn't like
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setShowWatchedOptions(false)}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            ) : (
              <div className="flex gap-2 mt-3">
                <Button
                  size="sm"
                  onClick={onAddToWatchlist}
                  disabled={loading}
                  className="gap-1"
                >
                  {loading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Plus className="w-4 h-4" />
                  )}
                  Add to Watchlist
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setShowWatchedOptions(true)}
                  disabled={loading}
                  className="gap-1"
                >
                  <Eye className="w-4 h-4" /> Watched it
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={onReject}
                  disabled={loading}
                  className="text-muted-foreground"
                >
                  <X className="w-4 h-4" /> Not interested
                </Button>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
