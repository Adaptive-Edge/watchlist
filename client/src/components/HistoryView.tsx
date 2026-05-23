import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { useUser } from "@/hooks/use-user";
import { Film, Tv, Heart, Meh, ThumbsDown, Loader2, History } from "lucide-react";

interface HistoryItem {
  id: string;
  title: string;
  mediaType: "film" | "tv";
  year: number | null;
  rating: "loved" | "ok" | "disliked" | null;
  watchedDate: string;
  notes: string | null;
}

export function HistoryView() {
  const { user } = useUser();

  const { data: history, isLoading } = useQuery<HistoryItem[]>({
    queryKey: [`/api/users/${user?.id}/history`],
    enabled: !!user,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!history || history.length === 0) {
    return (
      <div className="text-center py-12">
        <History className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
        <h3 className="text-lg font-medium mb-2">No watch history yet</h3>
        <p className="text-muted-foreground text-sm">
          Your watched films and shows will appear here
        </p>
      </div>
    );
  }

  const getRatingIcon = (rating: string | null) => {
    switch (rating) {
      case "loved":
        return <Heart className="w-4 h-4 text-[#f16c5f] fill-[#f16c5f]" />;
      case "ok":
        return <Meh className="w-4 h-4 text-[#fec666]" />;
      case "disliked":
        return <ThumbsDown className="w-4 h-4 text-destructive" />;
      default:
        return null;
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Watch History</h2>
        <span className="text-sm text-muted-foreground">{history.length} watched</span>
      </div>

      <div className="grid gap-2 lg:grid-cols-2 lg:gap-3">
        {history.map((item) => (
          <Card key={item.id} className="bg-card border border-border shadow-md">
            <CardContent className="p-3">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded bg-muted flex items-center justify-center shrink-0">
                  {item.mediaType === "film" ? (
                    <Film className="w-4 h-4 text-accent" />
                  ) : (
                    <Tv className="w-4 h-4 text-primary" />
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium truncate">{item.title}</span>
                    {item.year && (
                      <span className="text-xs text-muted-foreground shrink-0">({item.year})</span>
                    )}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Watched {new Date(item.watchedDate).toLocaleDateString()}
                  </div>
                </div>

                {getRatingIcon(item.rating)}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
