import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useUser } from "@/hooks/use-user";
import { apiRequest } from "@/lib/queryClient";
import { Film, Tv, Sparkles, ChevronRight, ChevronLeft, X, Plus, Heart } from "lucide-react";

const GENRES = [
  "Action", "Adventure", "Animation", "Comedy", "Crime", "Documentary",
  "Drama", "Fantasy", "Horror", "Mystery", "Romance", "Sci-Fi",
  "Thriller", "Western", "Musical", "War", "Biography", "Family"
];

const MOODS = [
  { name: "Relaxing", desc: "Easy-going, comfort watching" },
  { name: "Intense", desc: "Edge-of-seat thrills" },
  { name: "Thought-provoking", desc: "Makes you think" },
  { name: "Heartwarming", desc: "Feel-good stories" },
  { name: "Dark", desc: "Gritty and serious" },
  { name: "Funny", desc: "Laugh-out-loud content" },
  { name: "Emotional", desc: "Moving and powerful" },
  { name: "Mind-bending", desc: "Twists and surprises" }
];

interface OnboardingProps {
  onComplete: () => void;
}

export function Onboarding({ onComplete }: OnboardingProps) {
  const { user, completeOnboarding } = useUser();
  const [step, setStep] = useState(0);
  const [selectedGenres, setSelectedGenres] = useState<Record<string, number>>({});
  const [selectedMoods, setSelectedMoods] = useState<Record<string, number>>({});
  const [favourites, setFavourites] = useState<Array<{ title: string; mediaType: "film" | "tv" }>>([]);
  const [newFavourite, setNewFavourite] = useState("");
  const [newFavouriteType, setNewFavouriteType] = useState<"film" | "tv">("film");
  const [saving, setSaving] = useState(false);

  const toggleGenre = (genre: string) => {
    setSelectedGenres(prev => {
      const newGenres = { ...prev };
      if (newGenres[genre]) {
        delete newGenres[genre];
      } else {
        newGenres[genre] = 5; // Default to high rating
      }
      return newGenres;
    });
  };

  const toggleMood = (mood: string) => {
    setSelectedMoods(prev => {
      const newMoods = { ...prev };
      if (newMoods[mood]) {
        delete newMoods[mood];
      } else {
        newMoods[mood] = 5;
      }
      return newMoods;
    });
  };

  const addFavourite = () => {
    if (newFavourite.trim()) {
      setFavourites(prev => [...prev, { title: newFavourite.trim(), mediaType: newFavouriteType }]);
      setNewFavourite("");
    }
  };

  const removeFavourite = (index: number) => {
    setFavourites(prev => prev.filter((_, i) => i !== index));
  };

  const saveAndContinue = async () => {
    if (!user) return;
    setSaving(true);

    try {
      // Save genres
      for (const [genre, rating] of Object.entries(selectedGenres)) {
        await apiRequest("POST", `/api/users/${user.id}/genres`, { genre, rating });
      }

      // Save moods
      for (const [mood, rating] of Object.entries(selectedMoods)) {
        await apiRequest("POST", `/api/users/${user.id}/moods`, { mood, rating });
      }

      // Save favourites
      for (const fav of favourites) {
        await apiRequest("POST", `/api/users/${user.id}/favourites`, {
          title: fav.title,
          mediaType: fav.mediaType,
        });
      }

      // Complete onboarding
      await completeOnboarding();
      onComplete();
    } catch (error) {
      console.error("Failed to save preferences:", error);
    } finally {
      setSaving(false);
    }
  };

  const steps = [
    // Step 0: Welcome
    <div key="welcome" className="text-center space-y-6">
      <div className="w-20 h-20 mx-auto rounded-2xl bg-gradient-to-br from-[var(--ae-accent-cyan)] to-[var(--ae-accent-magenta)] flex items-center justify-center">
        <Sparkles className="w-10 h-10 text-white" />
      </div>
      <div>
        <h2 className="text-2xl font-bold text-gradient">Welcome to Watchlist</h2>
        <p className="text-muted-foreground mt-2">
          Your personal film & TV recommender that learns what you love.
        </p>
      </div>
      <p className="text-sm text-muted-foreground">
        Let's set up your profile so I can give you great recommendations.
      </p>
      <Button onClick={() => setStep(1)} className="glow-cyan">
        Get Started <ChevronRight className="w-4 h-4 ml-2" />
      </Button>
    </div>,

    // Step 1: Genres
    <div key="genres" className="space-y-4">
      <div className="text-center">
        <h2 className="text-xl font-bold">What genres do you enjoy?</h2>
        <p className="text-sm text-muted-foreground mt-1">Select all that apply</p>
      </div>
      <div className="flex flex-wrap gap-2 justify-center">
        {GENRES.map(genre => (
          <button
            key={genre}
            onClick={() => toggleGenre(genre)}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
              selectedGenres[genre]
                ? "bg-[var(--ae-accent-cyan)] text-white glow-cyan"
                : "bg-muted hover:bg-muted/80 text-muted-foreground"
            }`}
          >
            {genre}
          </button>
        ))}
      </div>
      <div className="flex justify-between pt-4">
        <Button variant="ghost" onClick={() => setStep(0)}>
          <ChevronLeft className="w-4 h-4 mr-2" /> Back
        </Button>
        <Button onClick={() => setStep(2)} disabled={Object.keys(selectedGenres).length === 0}>
          Continue <ChevronRight className="w-4 h-4 ml-2" />
        </Button>
      </div>
    </div>,

    // Step 2: Moods
    <div key="moods" className="space-y-4">
      <div className="text-center">
        <h2 className="text-xl font-bold">What moods do you like?</h2>
        <p className="text-sm text-muted-foreground mt-1">What kind of experience are you usually after?</p>
      </div>
      <div className="grid grid-cols-2 gap-3">
        {MOODS.map(mood => (
          <button
            key={mood.name}
            onClick={() => toggleMood(mood.name)}
            className={`p-3 rounded-lg text-left transition-all ${
              selectedMoods[mood.name]
                ? "bg-[var(--ae-accent-magenta)]/20 border-2 border-[var(--ae-accent-magenta)]"
                : "bg-muted/50 border-2 border-transparent hover:border-muted-foreground/30"
            }`}
          >
            <div className="font-medium">{mood.name}</div>
            <div className="text-xs text-muted-foreground">{mood.desc}</div>
          </button>
        ))}
      </div>
      <div className="flex justify-between pt-4">
        <Button variant="ghost" onClick={() => setStep(1)}>
          <ChevronLeft className="w-4 h-4 mr-2" /> Back
        </Button>
        <Button onClick={() => setStep(3)} disabled={Object.keys(selectedMoods).length === 0}>
          Continue <ChevronRight className="w-4 h-4 ml-2" />
        </Button>
      </div>
    </div>,

    // Step 3: Favourites
    <div key="favourites" className="space-y-4">
      <div className="text-center">
        <h2 className="text-xl font-bold">Name some favourites</h2>
        <p className="text-sm text-muted-foreground mt-1">Films or shows you absolutely love</p>
      </div>

      <div className="flex gap-2">
        <input
          type="text"
          value={newFavourite}
          onChange={(e) => setNewFavourite(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && addFavourite()}
          placeholder="e.g. Breaking Bad"
          className="flex-1 px-4 py-2 rounded-lg bg-muted border border-border focus:border-[var(--ae-accent-cyan)] outline-none"
        />
        <div className="flex gap-1">
          <button
            onClick={() => setNewFavouriteType("film")}
            className={`p-2 rounded-lg ${
              newFavouriteType === "film" ? "bg-[var(--ae-accent-cyan)] text-white" : "bg-muted"
            }`}
          >
            <Film className="w-5 h-5" />
          </button>
          <button
            onClick={() => setNewFavouriteType("tv")}
            className={`p-2 rounded-lg ${
              newFavouriteType === "tv" ? "bg-[var(--ae-accent-cyan)] text-white" : "bg-muted"
            }`}
          >
            <Tv className="w-5 h-5" />
          </button>
        </div>
        <Button onClick={addFavourite} size="icon" disabled={!newFavourite.trim()}>
          <Plus className="w-5 h-5" />
        </Button>
      </div>

      <div className="space-y-2 max-h-48 overflow-y-auto">
        {favourites.map((fav, i) => (
          <div key={i} className="flex items-center gap-2 p-2 rounded-lg bg-muted/50">
            {fav.mediaType === "film" ? (
              <Film className="w-4 h-4 text-muted-foreground" />
            ) : (
              <Tv className="w-4 h-4 text-muted-foreground" />
            )}
            <span className="flex-1">{fav.title}</span>
            <button onClick={() => removeFavourite(i)} className="text-muted-foreground hover:text-destructive">
              <X className="w-4 h-4" />
            </button>
          </div>
        ))}
        {favourites.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-4">
            Add at least one favourite to help me understand your taste
          </p>
        )}
      </div>

      <div className="flex justify-between pt-4">
        <Button variant="ghost" onClick={() => setStep(2)}>
          <ChevronLeft className="w-4 h-4 mr-2" /> Back
        </Button>
        <Button
          onClick={saveAndContinue}
          disabled={favourites.length === 0 || saving}
          className="glow-cyan"
        >
          {saving ? "Saving..." : (
            <>Finish Setup <Heart className="w-4 h-4 ml-2" /></>
          )}
        </Button>
      </div>
    </div>,
  ];

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Card className="glass w-full max-w-lg">
        <CardContent className="p-6">
          <div className="flex justify-center gap-2 mb-6">
            {[0, 1, 2, 3].map(i => (
              <div
                key={i}
                className={`w-2 h-2 rounded-full transition-all ${
                  i === step
                    ? "w-8 bg-[var(--ae-accent-cyan)]"
                    : i < step
                    ? "bg-[var(--ae-accent-cyan)]/50"
                    : "bg-muted"
                }`}
              />
            ))}
          </div>
          {steps[step]}
        </CardContent>
      </Card>
    </div>
  );
}
