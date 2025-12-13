import { useState } from "react";
import { Loader2, Sparkles, ListVideo, History, Settings } from "lucide-react";
import { useUser, UserProvider } from "@/hooks/use-user";
import { Onboarding } from "@/components/Onboarding";
import { Recommendations } from "@/components/Recommendations";
import { WatchlistView } from "@/components/WatchlistView";
import { HistoryView } from "@/components/HistoryView";
import { Button } from "@/components/ui/button";

type Tab = "discover" | "watchlist" | "history";

function HomeContent() {
  const { user, loading, createUser } = useUser();
  const [activeTab, setActiveTab] = useState<Tab>("discover");
  const [onboardingComplete, setOnboardingComplete] = useState(false);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-[var(--ae-accent-cyan)]" />
      </div>
    );
  }

  // No user - prompt to start
  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="text-center space-y-6 max-w-md">
          <div className="w-20 h-20 mx-auto rounded-2xl bg-gradient-to-br from-[var(--ae-accent-cyan)] to-[var(--ae-accent-magenta)] flex items-center justify-center">
            <Sparkles className="w-10 h-10 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gradient">Watchlist</h1>
            <p className="text-muted-foreground mt-2">
              Your personal film & TV recommender that learns what you love.
            </p>
          </div>
          <Button onClick={createUser} className="glow-cyan" size="lg">
            Get Started
          </Button>
        </div>
      </div>
    );
  }

  // User exists but hasn't completed onboarding
  if (!user.onboardingComplete && !onboardingComplete) {
    return <Onboarding onComplete={() => setOnboardingComplete(true)} />;
  }

  // Main app
  return (
    <div className="min-h-screen pb-20">
      {/* Header */}
      <header className="sticky top-0 z-10 glass border-b border-border/50">
        <div className="max-w-2xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-bold text-gradient">Watchlist</h1>
            <Button variant="ghost" size="icon" className="text-muted-foreground">
              <Settings className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-2xl mx-auto px-4 py-6">
        {activeTab === "discover" && <Recommendations />}
        {activeTab === "watchlist" && <WatchlistView />}
        {activeTab === "history" && <HistoryView />}
      </main>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 glass border-t border-border/50">
        <div className="max-w-2xl mx-auto px-4">
          <div className="flex justify-around py-2">
            <NavButton
              icon={<Sparkles className="w-5 h-5" />}
              label="Discover"
              active={activeTab === "discover"}
              onClick={() => setActiveTab("discover")}
            />
            <NavButton
              icon={<ListVideo className="w-5 h-5" />}
              label="Watchlist"
              active={activeTab === "watchlist"}
              onClick={() => setActiveTab("watchlist")}
            />
            <NavButton
              icon={<History className="w-5 h-5" />}
              label="History"
              active={activeTab === "history"}
              onClick={() => setActiveTab("history")}
            />
          </div>
        </div>
      </nav>
    </div>
  );
}

interface NavButtonProps {
  icon: React.ReactNode;
  label: string;
  active: boolean;
  onClick: () => void;
}

function NavButton({ icon, label, active, onClick }: NavButtonProps) {
  return (
    <button
      onClick={onClick}
      className={`flex flex-col items-center gap-1 px-4 py-2 rounded-lg transition-all ${
        active
          ? "text-[var(--ae-accent-cyan)]"
          : "text-muted-foreground hover:text-foreground"
      }`}
    >
      {icon}
      <span className="text-xs font-medium">{label}</span>
    </button>
  );
}

export default function Home() {
  return (
    <UserProvider>
      <HomeContent />
    </UserProvider>
  );
}
