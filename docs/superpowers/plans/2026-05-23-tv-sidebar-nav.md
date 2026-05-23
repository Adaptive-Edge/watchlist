# TV Sidebar Navigation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the bottom tab bar with an icon-only left rail on TV (Google TV / Android TV), keeping mobile bottom nav unchanged.

**Architecture:** TV detection uses the `tv` class already injected on `<html>` by `MainActivity.java`. CSS handles the rail width transition (56px → 150px). React state manages expand/collapse and focus handoff between rail and content. No changes to content components, routing, or the spatial nav hook.

**Tech Stack:** React 18 + TypeScript, Tailwind CSS + custom CSS, Lucide icons

---

## File Map

- **Modify:** `client/src/index.css` — TV shell layout, rail dimensions, transition, item styles
- **Modify:** `client/src/pages/home.tsx` — rail markup, focus management, D-pad handlers

---

### Task 1: CSS — TV layout shell and rail styles

**Files:**
- Modify: `client/src/index.css` (append after existing TV section at line 196)

- [ ] **Step 1: Add TV shell, rail, and content styles to `index.css`**

Append the following at the very end of `client/src/index.css`:

```css
/* ── TV sidebar rail ─────────────────────────────────────────── */

/* Make body a flex row on TV so rail + content sit side by side */
.tv body {
  display: flex;
  height: 100vh;
  overflow: hidden;
}

/* Outer shell — fills the body */
.tv .tv-shell {
  display: flex;
  flex-direction: row;
  width: 100%;
  height: 100vh;
}

/* Hide mobile-only chrome on TV */
.tv header {
  display: none;
}
.tv .bottom-nav {
  display: none;
}

/* Rail — hidden on mobile, shown on TV */
.tv-rail {
  display: none;
}

.tv .tv-rail {
  display: flex;
  flex-direction: column;
  width: 56px;
  flex-shrink: 0;
  overflow: hidden;
  background: hsl(var(--card));
  border-right: 1px solid hsl(var(--border));
  height: 100vh;
  transition: width 150ms ease;
}

.tv .tv-rail.rail-expanded {
  width: 150px;
}

/* Rail wordmark — clips on narrow, visible when expanded */
.tv-rail-wordmark {
  white-space: nowrap;
  overflow: hidden;
  padding: 16px 8px 12px;
  color: hsl(var(--primary));
  font-weight: 700;
  font-size: 14px;
  letter-spacing: 0.05em;
  display: flex;
  align-items: center;
  gap: 10px;
  flex-shrink: 0;
}

/* Rail nav items */
.tv-rail-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 8px;
  border: none;
  background: transparent;
  cursor: pointer;
  color: hsl(var(--muted-foreground));
  border-radius: var(--radius);
  white-space: nowrap;
  width: 100%;
  text-align: left;
  transition: background 120ms, color 120ms;
  flex-shrink: 0;
}

.tv-rail-item:hover,
.tv-rail-item:focus {
  background: hsl(var(--muted));
  color: hsl(var(--foreground));
  outline: none;
}

.tv-rail-item.rail-item-active {
  background: hsl(var(--primary) / 0.15);
  color: hsl(var(--primary));
}

.tv-rail-item-icon {
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.tv-rail-item-label {
  font-size: 13px;
  font-weight: 500;
  overflow: hidden;
}

/* Content area scrolls independently */
.tv .tv-content {
  flex: 1;
  overflow-y: auto;
  height: 100vh;
  /* Remove bottom padding that was for mobile bottom nav */
  padding-bottom: 0 !important;
}
```

- [ ] **Step 2: Verify no CSS syntax errors**

Run: `cd /Users/nathan/watchlist && npx vite build --mode development 2>&1 | tail -20`

Expected: no CSS parse errors. Any PostCSS/Tailwind errors must be fixed before proceeding.

- [ ] **Step 3: Commit**

```bash
cd /Users/nathan/watchlist
git add client/src/index.css
git commit -m "feat: add TV rail CSS layout and styles"
```

---

### Task 2: home.tsx — isTV detection, state, and refs

**Files:**
- Modify: `client/src/pages/home.tsx`

- [ ] **Step 1: Add `isTV`, `railFocused` state, focus refs, and `navItems` array**

In `HomeContent()`, after the existing `useState` declarations (after line 25 in the original), add:

```tsx
const isTV = document.documentElement.classList.contains('tv');
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
```

Also add `useRef` to the React import at the top of the file. The import line currently reads:
```tsx
import { useState } from "react";
```
Change it to:
```tsx
import { useState, useRef } from "react";
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `cd /Users/nathan/watchlist && npx tsc --noEmit 2>&1 | head -30`

Expected: no errors. Fix any type errors before continuing.

- [ ] **Step 3: Commit**

```bash
cd /Users/nathan/watchlist
git add client/src/pages/home.tsx
git commit -m "feat: add TV state, refs, and nav items to HomeContent"
```

---

### Task 3: home.tsx — D-pad handlers

**Files:**
- Modify: `client/src/pages/home.tsx`

- [ ] **Step 1: Add D-pad handler functions**

Add these two handler functions inside `HomeContent()`, after the `navItems` array from Task 2:

```tsx
const handleRailKeyDown = (e: React.KeyboardEvent) => {
  if (e.key === 'ArrowRight') {
    e.preventDefault();
    const target =
      lastContentFocusRef.current ??
      document.querySelector<HTMLElement>('[data-tv-content] button, [data-tv-content] [tabindex]:not([tabindex="-1"])');
    target?.focus();
  }
};

const handleContentKeyDown = (e: React.KeyboardEvent) => {
  if (!isTV) return;
  if (e.key === 'ArrowLeft') {
    e.preventDefault();
    activeRailItemRef.current?.focus();
  }
};

const handleContentFocus = (e: React.FocusEvent) => {
  if (!isTV) return;
  lastContentFocusRef.current = e.target as HTMLElement;
};
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `cd /Users/nathan/watchlist && npx tsc --noEmit 2>&1 | head -30`

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
cd /Users/nathan/watchlist
git add client/src/pages/home.tsx
git commit -m "feat: add TV D-pad handlers for rail/content focus handoff"
```

---

### Task 4: home.tsx — Rail markup and restructured layout

**Files:**
- Modify: `client/src/pages/home.tsx`

This task replaces the main app `return` block inside `HomeContent` (the `// Main app` section starting at line 85).

- [ ] **Step 1: Replace the main app return block**

Find this block (starts around line 85):
```tsx
  // Main app
  return (
    <div className="min-h-screen pb-20">
```

Replace the entire main app `return` with:

```tsx
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
              // Return focus to content after selecting
              setTimeout(() => {
                const target =
                  lastContentFocusRef.current ??
                  document.querySelector<HTMLElement>('[data-tv-content] button, [data-tv-content] [tabindex]:not([tabindex="-1"])');
                target?.focus();
              }, 50);
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
        data-tv-content={isTV ? '' : undefined}
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
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `cd /Users/nathan/watchlist && npx tsc --noEmit 2>&1 | head -40`

Expected: no errors. Common issues to watch for:
- `ref` prop on `<button>` — if it fails, add `type HTMLButtonElement` assertion
- `data-tv-content` attribute — TypeScript may need `as any` or a custom attribute declaration; simplest fix is `{...(isTV ? {'data-tv-content': ''} : {})}`

- [ ] **Step 3: Commit**

```bash
cd /Users/nathan/watchlist
git add client/src/pages/home.tsx
git commit -m "feat: add TV rail markup and restructured layout"
```

---

### Task 5: Build, sync, and verify

**Files:** none — build and verification only

- [ ] **Step 1: Clear Vite cache and build for native**

```bash
cd /Users/nathan/watchlist
rm -rf node_modules/.vite
npm run build:native
```

Expected: build completes with no errors. Note any warnings but don't block on them.

- [ ] **Step 2: Check the built output has expected markup**

```bash
grep -c 'tv-rail' /Users/nathan/watchlist/dist/public/assets/*.js
```

Expected: one or more JS files contain `tv-rail` (confirms the rail code was bundled).

- [ ] **Step 3: Sync to Android**

```bash
cd /Users/nathan/watchlist && npx cap sync android
```

Expected: `Sync finished in X.Xs`

- [ ] **Step 4: Manual verification checklist**

Open the TV emulator in Android Studio and run the app. Verify:

1. **Rail visible** — a narrow 56px dark strip appears on the left with 5 icons
2. **Rail expands** — D-pad left from content moves focus to the rail, it widens to ~150px showing labels
3. **Active highlight** — the current section's rail item has a tinted background
4. **Rail collapses** — D-pad right from rail returns focus to content, rail narrows back to 56px
5. **Navigation works** — pressing Enter on a rail item switches content section
6. **Mobile unaffected** — run on a phone emulator, bottom nav still shows, no rail visible

- [ ] **Step 5: Commit build artifacts if needed**

The build output is in `dist/public/` which is gitignored for web but synced to Android via `cap sync`. No commit needed for build artifacts.
