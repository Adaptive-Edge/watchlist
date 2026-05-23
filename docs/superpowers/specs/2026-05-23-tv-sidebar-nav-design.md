# TV Sidebar Navigation — Design Spec

**Date:** 2026-05-23
**Scope:** Google TV layout only. Mobile bottom nav is unchanged.

---

## Problem

The existing bottom tab bar is unusable on TV. Pressing D-pad down from content lands in the bottom nav, breaking the expected spatial flow. TV apps use a left-side rail for navigation.

---

## Design Decision

**Icon-only rail (56px) that expands to show labels on focus.**

- At rest: 56px wide, icons only. Active section highlighted.
- On focus: expands to ~150px, labels appear beside icons. CSS `width` transition (~150ms ease).
- On blur (D-pad right to content): collapses back to 56px.
- Mobile: bottom nav unchanged, rail hidden.

---

## Layout

TV (`html.tv`):
- Left rail, fixed height, full viewport height
- Content area fills remaining horizontal space
- Header is hidden (rail provides app identity/logo slot at top)
- Bottom nav is hidden (`display: none`)

Mobile (no `.tv` class):
- Bottom nav shown as today
- Rail hidden (`display: none`)

---

## Rail Items

Five nav items matching the existing tabs:

| Icon | Label       | Section       |
|------|-------------|---------------|
| ⚡   | New For You | home (default)|
| ✨   | Discover    | discover      |
| 📋   | Watchlist   | watchlist     |
| 🕐   | History     | history       |
| ♥    | Favourites  | favourites    |

App logo/wordmark sits at the top of the rail above the items.

---

## Rail Expand/Collapse

- A `railFocused` boolean in React state controls a `.rail-expanded` class on the rail element
- `onFocus` on the rail container: set `railFocused = true`
- `onBlur` on the rail container: set `railFocused = false`  
  (React's synthetic `onBlur` bubbles, so this fires when focus leaves the rail entirely)
- CSS transition: `width: 56px` → `width: 150px` over 150ms ease

No JavaScript animation — CSS handles the transition.

---

## D-pad Flow

| From | Key | Action |
|------|-----|--------|
| Content | ArrowLeft | Focus the active rail item |
| Rail | ArrowRight | Collapse rail, restore focus to last content element (or first card) |
| Rail | ArrowUp/Down | Move between rail items |
| Rail | Enter | Navigate to section, focus first content card |

**Focus memory:** the content area tracks the last focused element in a ref. When returning from the rail, focus is restored there.

**Rail focus target on entry:** the currently active nav item receives focus (not always the first item).

---

## Implementation Scope

### `client/src/pages/home.tsx`
- Add rail markup (conditionally rendered or CSS-hidden based on `.tv` class)
- `railFocused` state → `.rail-expanded` class
- `lastContentFocusRef` to remember content focus
- `ArrowLeft` on content wrapper → focus active rail item
- `ArrowRight` on rail → restore content focus
- Hide `<header>` on TV
- Hide bottom nav on TV

### `client/src/index.css`
- `.tv` layout: flex row, full height
- Rail `width` transition
- `.rail-expanded` width override
- Hide header/bottom nav on `.tv`

### No changes to:
- `use-tv-navigation.ts` (spatial nav hook unchanged)
- Content components
- Routing
- `MainActivity.java`

---

## Out of Scope

- Animated label fade (just width transition; labels clip in naturally)
- Per-section content components (existing content stays as-is)
- Mouse/touch interaction on TV
