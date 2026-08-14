import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { useUser } from "@/hooks/use-user";
import { ReviewDialog, type ReviewTarget } from "@/components/ReviewDialog";
import { Film, Tv, Heart, Meh, ThumbsDown, Loader2, History, PenLine } from "lucide-react";

interface HistoryItem {
  id: string;
  title: string;
  mediaType: "film" | "tv";
  year: number | null;
  rating: "loved" | "ok" | "disliked" | null;
  recommend: "yes" | "maybe" | "no" | null;
  watchedDate: string;
  notes: string | null;
}

export interface HouseholdReview {
  id: string;
  userId: string;
  reviewerName: string;
  title: string;
  mediaType: "film" | "tv";
  year: number | null;
  rating: "loved" | "ok" | "disliked" | null;
  recommend: "yes" | "maybe" | "no" | null;
  notes: string | null;
}

export function getRatingIcon(rating: string | null) {
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
}

export function RecommendBadge({ recommend }: { recommend: "yes" | "maybe" | "no" | null }) {
  if (!recommend) return null;
  const styles = {
    yes: "bg-primary/15 text-primary",
    maybe: "bg-[#fec666]/15 text-[#fec666]",
    no: "bg-muted text-muted-foreground",
  } as const;
  const labels = { yes: "Recommends", maybe: "Maybe", no: "Wouldn't recommend" } as const;
  return (
    <span className={`text-[11px] px-2 py-0.5 rounded-full shrink-0 ${styles[recommend]}`}>
      {labels[recommend]}
    </span>
  );
}

export function HistoryView() {
  const { user } = useUser();
  const [reviewTarget, setReviewTarget] = useState<ReviewTarget | null>(null);

  const { data: history, isLoading } = useQuery<HistoryItem[]>({
    queryKey: [`/api/users/${user?.id}/history`],
    enabled: !!user,
  });

  const { data: allReviews } = useQuery<HouseholdReview[]>({
    queryKey: ["/api/reviews"],
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

  const partnerReviewsFor = (item: HistoryItem) =>
    (allReviews || []).filter(
      (r) =>
        r.userId !== user?.id &&
        r.mediaType === item.mediaType &&
        r.title.toLowerCase() === item.title.toLowerCase()
    );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Watch History</h2>
        <span className="text-sm text-muted-foreground">{history.length} watched</span>
      </div>

      <div className="grid gap-2 lg:grid-cols-2 lg:gap-3">
        {history.map((item) => {
          const partnerReviews = partnerReviewsFor(item);
          return (
            <Card key={item.id} tabIndex={0} className="bg-card border border-border shadow-md cursor-default">
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

                  <RecommendBadge recommend={item.recommend} />
                  {getRatingIcon(item.rating)}

                  <button
                    type="button"
                    aria-label={`Review ${item.title}`}
                    onClick={() =>
                      setReviewTarget({
                        historyId: item.id,
                        title: item.title,
                        mediaType: item.mediaType,
                        year: item.year,
                        rating: item.rating,
                        recommend: item.recommend,
                        notes: item.notes,
                      })
                    }
                    className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors shrink-0"
                  >
                    <PenLine className="w-4 h-4" />
                  </button>
                </div>

                {item.notes && item.notes.trim() && (
                  <p className="text-sm text-muted-foreground mt-2 ml-11 leading-relaxed">
                    {item.notes}
                  </p>
                )}

                {partnerReviews.map((r) => (
                  <div key={r.id} className="mt-2 ml-11 pt-2 border-t border-border/60">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium">{r.reviewerName}</span>
                      {getRatingIcon(r.rating)}
                      <RecommendBadge recommend={r.recommend} />
                    </div>
                    {r.notes && r.notes.trim() && (
                      <p className="text-sm text-muted-foreground mt-1 leading-relaxed">{r.notes}</p>
                    )}
                  </div>
                ))}
              </CardContent>
            </Card>
          );
        })}
      </div>

      <ReviewDialog target={reviewTarget} onClose={() => setReviewTarget(null)} />
    </div>
  );
}
