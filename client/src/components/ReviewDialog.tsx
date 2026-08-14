import { useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useUser } from "@/hooks/use-user";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Heart, Meh, ThumbsDown, Loader2 } from "lucide-react";

export interface ReviewTarget {
  historyId?: string;
  title: string;
  mediaType: "film" | "tv";
  year: number | null;
  rating: "loved" | "ok" | "disliked" | null;
  recommend: "yes" | "maybe" | "no" | null;
  notes: string | null;
}

interface ReviewDialogProps {
  target: ReviewTarget | null;
  onClose: () => void;
}

const RATINGS = [
  { value: "loved" as const, label: "Loved it", icon: Heart },
  { value: "ok" as const, label: "It was OK", icon: Meh },
  { value: "disliked" as const, label: "Disliked", icon: ThumbsDown },
];

const RECOMMENDS = [
  { value: "yes" as const, label: "Yes" },
  { value: "maybe" as const, label: "Maybe" },
  { value: "no" as const, label: "No" },
];

export function ReviewDialog({ target, onClose }: ReviewDialogProps) {
  const { user } = useUser();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [rating, setRating] = useState<"loved" | "ok" | "disliked" | null>(null);
  const [recommend, setRecommend] = useState<"yes" | "maybe" | "no" | null>(null);
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (target) {
      setRating(target.rating);
      setRecommend(target.recommend);
      setNotes(target.notes || "");
    }
  }, [target]);

  const save = useMutation({
    mutationFn: async () => {
      if (!target || !user) return;
      const body = { rating, recommend, notes: notes.trim() || null };
      if (target.historyId) {
        return apiRequest("PATCH", `/api/history/${target.historyId}/review`, body);
      }
      return apiRequest("POST", `/api/users/${user.id}/reviews`, {
        title: target.title,
        mediaType: target.mediaType,
        year: target.year,
        ...body,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/reviews"] });
      queryClient.invalidateQueries({ queryKey: [`/api/users/${user?.id}/history`] });
      queryClient.invalidateQueries({ queryKey: [`/api/users/${user?.id}/favourites`] });
      toast({ title: "Review saved" });
      onClose();
    },
    onError: () => {
      toast({ title: "Could not save review", variant: "destructive" });
    },
  });

  return (
    <Dialog open={!!target} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="pr-6 truncate">
            {target?.title}
            {target?.year ? (
              <span className="text-muted-foreground font-normal"> ({target.year})</span>
            ) : null}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5">
          <div>
            <p className="text-sm font-medium mb-2">My rating</p>
            <div className="flex gap-2">
              {RATINGS.map(({ value, label, icon: Icon }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setRating(rating === value ? null : value)}
                  className={`flex-1 flex flex-col items-center gap-1 py-2 rounded-lg border text-xs transition-colors ${
                    rating === value
                      ? "border-primary bg-primary/10 text-foreground"
                      : "border-border bg-muted/30 text-muted-foreground hover:bg-muted/60"
                  }`}
                >
                  <Icon
                    className={`w-5 h-5 ${
                      value === "loved" && rating === value
                        ? "text-[#f16c5f] fill-[#f16c5f]"
                        : value === "ok" && rating === value
                          ? "text-[#fec666]"
                          : value === "disliked" && rating === value
                            ? "text-destructive"
                            : ""
                    }`}
                  />
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="text-sm font-medium mb-2">Would I recommend it?</p>
            <div className="flex gap-2">
              {RECOMMENDS.map(({ value, label }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setRecommend(recommend === value ? null : value)}
                  className={`flex-1 py-2 rounded-lg border text-sm transition-colors ${
                    recommend === value
                      ? "border-primary bg-primary/10 text-foreground"
                      : "border-border bg-muted/30 text-muted-foreground hover:bg-muted/60"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="text-sm font-medium mb-2">Review</p>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={4}
              placeholder="What did you think? Worth remembering?"
              className="w-full rounded-lg border border-border bg-muted/30 px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary resize-none"
            />
          </div>

          <Button
            className="w-full"
            onClick={() => save.mutate()}
            disabled={save.isPending}
          >
            {save.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Save review"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
