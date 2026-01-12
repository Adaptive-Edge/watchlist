import { useState } from "react";
import { Loader2, Sparkles, ListVideo, History, Heart, User, LogOut, Link } from "lucide-react";
import { useUser, UserProvider } from "@/hooks/use-user";
import { Onboarding } from "@/components/Onboarding";
import { Recommendations } from "@/components/Recommendations";
import { WatchlistView } from "@/components/WatchlistView";
import { HistoryView } from "@/components/HistoryView";
import { PreferencesView } from "@/components/PreferencesView";
import { AuthDialog } from "@/components/AuthDialog";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

type Tab = "discover" | "watchlist" | "history" | "preferences";

function HomeContent() {
  const { user, loading, isAuthenticated, logout, startAnonymous } = useUser();
  const [activeTab, setActiveTab] = useState<Tab>("discover");
  const [onboardingComplete, setOnboardingComplete] = useState(false);
  const [authDialogOpen, setAuthDialogOpen] = useState(false);
  const [authMode, setAuthMode] = useState<"login" | "register" | "link">("login");

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-[var(--ae-accent-cyan)]" />
      </div>
    );
  }

  const openAuth = (mode: "login" | "register" | "link") => {
    setAuthMode(mode);
    setAuthDialogOpen(true);
  };

  // No user - prompt to start with auth options
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
          <div className="space-y-3">
            <Button onClick={() => openAuth("register")} className="glow-cyan w-full" size="lg">
              Create Account
            </Button>
            <Button onClick={() => openAuth("login")} variant="outline" className="w-full" size="lg">
              Sign In
            </Button>
            <div className="relative py-2">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-border/50" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-2 text-muted-foreground">or</span>
              </div>
            </div>
            <Button onClick={startAnonymous} variant="ghost" className="w-full text-muted-foreground">
              Continue without account
            </Button>
          </div>
        </div>
        <AuthDialog open={authDialogOpen} onOpenChange={setAuthDialogOpen} mode={authMode} />
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
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between">
          <h1 className="text-xl font-bold text-gradient">Watchlist</h1>
          <div className="flex items-center gap-2">
            {isAuthenticated ? (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={logout}
                    className="text-muted-foreground hover:text-foreground"
                  >
                    <LogOut className="w-5 h-5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Sign out ({user.email})</p>
                </TooltipContent>
              </Tooltip>
            ) : (
              <>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => openAuth("link")}
                      className="text-muted-foreground hover:text-foreground"
                    >
                      <Link className="w-4 h-4 mr-1" />
                      Save Account
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Link email to save your data</p>
                  </TooltipContent>
                </Tooltip>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-2xl mx-auto px-4 py-6">
        {activeTab === "discover" && <Recommendations />}
        {activeTab === "watchlist" && <WatchlistView />}
        {activeTab === "history" && <HistoryView />}
        {activeTab === "preferences" && <PreferencesView />}
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
            <NavButton
              icon={<Heart className="w-5 h-5" />}
              label="Favourites"
              active={activeTab === "preferences"}
              onClick={() => setActiveTab("preferences")}
            />
          </div>
        </div>
      </nav>

      <AuthDialog open={authDialogOpen} onOpenChange={setAuthDialogOpen} mode={authMode} />
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
