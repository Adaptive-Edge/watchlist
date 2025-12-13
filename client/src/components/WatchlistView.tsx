import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useUser } from "@/hooks/use-user";
import { apiRequest } from "@/lib/queryClient";
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
} from "lucide-react";
import { useState } from "react";

interface WatchlistItem {
  id: string;
  title: string;
  mediaType: "film" | "tv";
  year: number | null;
  priority: number;
  recommendationReason: string | null;
  addedDate: string;
}

export function WatchlistView() {
  const { user } = useUser();
  const queryClient = useQueryClient();

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
        <Loader2 className="w-8 h-8 animate-spin text-[var(--ae-accent-cyan)]" />
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

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">My Watchlist</h2>
        <span className="text-sm text-muted-foreground">{watchlist.length} items</span>
      </div>

      <div className="grid gap-3">
        {watchlist.map((item) => (
          <WatchlistItemCard
            key={item.id}
            item={item}
            onRemove={() => removeMutation.mutate(item.id)}
            removing={removeMutation.isPending}
          />
        ))}
      </div>
    </div>
  );
}

interface WatchlistItemCardProps {
  item: WatchlistItem;
  onRemove: () => void;
  removing: boolean;
}

function WatchlistItemCard({ item, onRemove, removing }: WatchlistItemCardProps) {
  const { user } = useUser();
  const queryClient = useQueryClient();
  const [showRating, setShowRating] = useState(false);
  const [marking, setMarking] = useState(false);

  const handleMarkWatched = async (rating: "loved" | "ok" | "disliked") => {
    if (!user) return;
    setMarking(true);
    try {
      // Add to history
      await apiRequest("POST", `/api/users/${user.id}/history`, {
        title: item.title,
        mediaType: item.mediaType,
        year: item.year,
        rating,
      });
      // Remove from watchlist
      await apiRequest("DELETE", `/api/watchlist/${item.id}`);
      queryClient.invalidateQueries({ queryKey: [`/api/users/${user.id}/watchlist`] });
      queryClient.invalidateQueries({ queryKey: [`/api/users/${user.id}/history`] });
    } finally {
      setMarking(false);
    }
  };

  return (
    <Card className="glass">
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center shrink-0">
            {item.mediaType === "film" ? (
              <Film className="w-5 h-5 text-[var(--ae-accent-cyan)]" />
            ) : (
              <Tv className="w-5 h-5 text-[var(--ae-accent-magenta)]" />
            )}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="font-medium truncate">{item.title}</h3>
              {item.year && (
                <span className="text-sm text-muted-foreground shrink-0">({item.year})</span>
              )}
            </div>
            {item.recommendationReason && (
              <p className="text-sm text-muted-foreground mt-1 line-clamp-1">
                {item.recommendationReason}
              </p>
            )}

            {showRating ? (
              <div className="flex gap-2 mt-2">
                <span className="text-xs text-muted-foreground self-center">How was it?</span>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => handleMarkWatched("loved")}
                  disabled={marking}
                  className="h-7 gap-1 text-xs"
                >
                  <Heart className="w-3 h-3 text-pink-500" /> Loved
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => handleMarkWatched("ok")}
                  disabled={marking}
                  className="h-7 gap-1 text-xs"
                >
                  <Meh className="w-3 h-3 text-yellow-500" /> OK
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => handleMarkWatched("disliked")}
                  disabled={marking}
                  className="h-7 gap-1 text-xs"
                >
                  <ThumbsDown className="w-3 h-3 text-red-500" /> Didn't like
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setShowRating(false)}
                  className="h-7"
                >
                  <X className="w-3 h-3" />
                </Button>
              </div>
            ) : (
              <div className="flex gap-2 mt-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setShowRating(true)}
                  disabled={marking}
                  className="h-7 gap-1 text-xs"
                >
                  <Eye className="w-3 h-3" /> Watched
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={onRemove}
                  disabled={removing}
                  className="h-7 text-muted-foreground"
                >
                  <Trash2 className="w-3 h-3" />
                </Button>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
