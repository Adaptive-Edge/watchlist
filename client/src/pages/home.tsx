import { useState, useRef, useEffect } from "react";
import { Loader2, Sparkles, ListVideo, History, Heart, User, LogOut, Link, Zap } from "lucide-react";
import { useUser, UserProvider } from "@/hooks/use-user";
import { Onboarding } from "@/components/Onboarding";
import { NewForYou } from "@/components/NewForYou";
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

type Tab = "new-for-you" | "discover" | "watchlist" | "history" | "preferences";

function HomeContent() {
  const { user, loading, isAuthenticated, logout, startAnonymous } = useUser();
  const [activeTab, setActiveTab] = useState<Tab>("new-for-you");
  const [onboardingComplete, setOnboardingComplete] = useState(false);
  const [authDialogOpen, setAuthDialogOpen] = useState(false);
  const [authMode, setAuthMode] = useState<"login" | "register" | "link">("login");

  const [isTV, setIsTV] = useState(() => document.documentElement.classList.contains('tv'));

  useEffect(() => {
    if (isTV) return;
    const observer = new MutationObserver(() => {
      if (document.documentElement.classList.contains('tv')) {
        setIsTV(true);
        observer.disconnect();
      }
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, [isTV]);

  // When TV mode activates, focus first visible content element (with retry for async content)
  useEffect(() => {
    if (!isTV) return;
    const attempt = (n = 0) => {
      const candidates = document.querySelectorAll<HTMLElement>(
        '[data-tv-content] main button:not([disabled]), [data-tv-content] main [tabindex]:not([tabindex="-1"])'
      );
      const el = Array.from(candidates).find(el => el.offsetParent !== null);
      if (el) { el.focus(); return; }
      if (n < 15) setTimeout(() => attempt(n + 1), 100);
    };
    setTimeout(() => attempt(), 50);
  }, [isTV]);

  const [railFocused, setRailFocused] = useState(false);
  const lastContentFocusRef = useRef<HTMLElement | null>(null);
  const activeRailItemRef = useRef<HTMLButtonElement | null>(null);

  const navItems = [
    { id: 'new-for-you' as Tab, icon: <Zap className="w-5 h-5" />, label: 'New For You' },
    { id: 'discover' as Tab, icon: <Sparkles className="w-5 h-5" />, label: 'Discover' },
    { id: 'watchlist' as Tab, icon: <ListVideo className="w-5 h-5" />, label: 'Watchlist' },
    { id: 'history' as Tab, icon: <History className="w-5 h-5" />, label: 'History' },
    { id: 'preferences' as Tab, icon: <Heart className="w-5 h-5" />, label: 'Favourites' },
  ];

  const focusContent = (attempts = 0) => {
    const candidates = document.querySelectorAll<HTMLElement>(
      '[data-tv-content] main button:not([disabled]), [data-tv-content] main [tabindex]:not([tabindex="-1"])'
    );
    const target = Array.from(candidates).find(el => el.offsetParent !== null);
    if (target) {
      target.focus();
    } else if (attempts < 10) {
      setTimeout(() => focusContent(attempts + 1), 100);
    }
  };

  const handleRailKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowRight') {
      e.preventDefault();
      e.nativeEvent.stopImmediatePropagation();
      focusContent();
    }
  };

  const handleContentKeyDown = (e: React.KeyboardEvent) => {
    if (!isTV) return;
    if (e.key === 'ArrowLeft') {
      e.preventDefault();
      e.nativeEvent.stopImmediatePropagation();
      activeRailItemRef.current?.focus();
    }
  };

  const handleContentFocus = (e: React.FocusEvent) => {
    if (!isTV) return;
    lastContentFocusRef.current = e.target as HTMLElement;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
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
          <div className="w-20 h-20 mx-auto rounded-2xl bg-primary flex items-center justify-center">
            <Sparkles className="w-10 h-10 text-primary-foreground" />
          </div>
          <div>
            <h1 className="font-display text-3xl font-bold text-foreground">Watchlist</h1>
            <p className="text-muted-foreground mt-2">
              Your personal film & TV recommender that learns what you love.
            </p>
          </div>
          <div className="space-y-3">
            <Button onClick={() => openAuth("register")} className="w-full" size="lg">
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
  const railNav = (
    <nav
      className={`tv-rail${railFocused ? ' rail-expanded' : ''}`}
      onFocus={() => setRailFocused(true)}
      onBlur={() => setRailFocused(false)}
      onKeyDown={handleRailKeyDown}
      aria-label="Main navigation"
    >
      {/* Wordmark */}
      <div className="tv-rail-wordmark">
        <Zap className="w-5 h-5 flex-shrink-0" />
        <span>Watchlist</span>
      </div>

      {/* Nav items */}
      {navItems.map((item) => {
        const isActive = activeTab === item.id;
        return (
          <button
            key={item.id}
            ref={isActive ? activeRailItemRef : undefined}
            className={`tv-rail-item${isActive ? ' rail-item-active' : ''}`}
            onClick={() => {
              setActiveTab(item.id);
              lastContentFocusRef.current = null;
              setTimeout(() => focusContent(), 50);
            }}
          >
            <span className="tv-rail-item-icon">{item.icon}</span>
            <span className="tv-rail-item-label">{item.label}</span>
          </button>
        );
      })}
    </nav>
  );

  return (
    <div className={isTV ? 'tv-shell' : 'min-h-screen pb-20'}>
      {isTV && railNav}

      <div
        className={isTV ? 'tv-content' : ''}
        {...(isTV ? { 'data-tv-content': '' } : {})}
        onKeyDown={isTV ? handleContentKeyDown : undefined}
        onFocus={isTV ? handleContentFocus : undefined}
      >
        {/* Header — hidden on TV via CSS */}
        <header className="sticky top-0 z-10 bg-card/80 backdrop-blur-sm border-b border-border">
          <div className="max-w-2xl lg:max-w-5xl xl:max-w-6xl mx-auto px-4 lg:px-6 py-3 flex items-center justify-between">
            <h1 className="font-display text-xl font-bold text-foreground">Watchlist</h1>
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
        <main className="max-w-2xl lg:max-w-5xl xl:max-w-6xl mx-auto px-4 lg:px-6 py-6">
          {activeTab === "new-for-you" && <NewForYou />}
          {activeTab === "discover" && <Recommendations />}
          {activeTab === "watchlist" && <WatchlistView />}
          {activeTab === "history" && <HistoryView />}
          {activeTab === "preferences" && <PreferencesView />}
        </main>

        {/* Bottom Navigation — hidden on TV via CSS */}
        <nav className="bottom-nav fixed bottom-0 left-0 right-0 bg-card/80 backdrop-blur-sm border-t border-border">
          <div className="max-w-2xl lg:max-w-5xl xl:max-w-6xl mx-auto px-4 lg:px-6">
            <div className="flex justify-around py-2">
              <NavButton
                icon={<Zap className="w-5 h-5" />}
                label="New"
                active={activeTab === "new-for-you"}
                onClick={() => setActiveTab("new-for-you")}
              />
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
          ? "text-primary"
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
