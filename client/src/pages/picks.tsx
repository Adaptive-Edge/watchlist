import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { getRatingIcon, RecommendBadge, type HouseholdReview } from "@/components/HistoryView";
import { Film, Tv, Loader2, Popcorn } from "lucide-react";

// Public, read-only page — no login. Shared with friends as
// https://adaptiveedge.uk/watchlist/picks
export default function Picks() {
  const { data: picks, isLoading } = useQuery<HouseholdReview[]>({
    queryKey: ["/api/public/picks"],
  });

  // Group reviews by title so a film both of us reviewed shows once.
  const grouped = new Map<string, HouseholdReview[]>();
  for (const p of picks || []) {
    const key = `${p.mediaType}:${p.title.toLowerCase()}`;
    grouped.set(key, [...(grouped.get(key) || []), p]);
  }
  const titles = Array.from(grouped.values());

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="max-w-2xl mx-auto px-4 py-8">
        <div className="flex items-center gap-3 mb-1">
          <Popcorn className="w-7 h-7 text-primary" />
          <h1 className="text-2xl font-bold">Our Picks</h1>
        </div>
        <p className="text-sm text-muted-foreground mb-6">
          Films and shows we've watched and would recommend.
        </p>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : titles.length === 0 ? (
          <p className="text-muted-foreground text-sm">No picks yet — check back soon.</p>
        ) : (
          <div className="space-y-3">
            {titles.map((reviews) => {
              const first = reviews[0];
              return (
                <Card key={`${first.mediaType}:${first.title}`} className="bg-card border border-border shadow-md">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 mb-2">
                      {first.mediaType === "film" ? (
                        <Film className="w-4 h-4 text-accent shrink-0" />
                      ) : (
                        <Tv className="w-4 h-4 text-primary shrink-0" />
                      )}
                      <span className="font-semibold">{first.title}</span>
                      {first.year && (
                        <span className="text-xs text-muted-foreground">({first.year})</span>
                      )}
                    </div>

                    <div className="space-y-2">
                      {reviews.map((r) => (
                        <div key={r.id}>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-medium">{r.reviewerName}</span>
                            {getRatingIcon(r.rating)}
                            <RecommendBadge recommend={r.recommend} />
                          </div>
                          {r.notes && r.notes.trim() && (
                            <p className="text-sm text-muted-foreground mt-0.5 leading-relaxed">
                              {r.notes}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
