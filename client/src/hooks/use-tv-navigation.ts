import { useEffect } from "react";

const FOCUSABLE = [
  'button:not([disabled])',
  'a[href]',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(', ');

function getFocusable(): HTMLElement[] {
  return Array.from(document.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
    el => {
      if (el.offsetParent === null) return false;
      // Skip interactive elements nested inside a focusable container (e.g. action buttons inside a card tile).
      // The container itself is focusable; Enter on it opens the detail overlay where buttons become reachable.
      if (el.parentElement?.closest('[tabindex="0"]')) return false;
      return true;
    }
  );
}

function nearest(current: HTMLElement, candidates: HTMLElement[], direction: 'up' | 'down' | 'left' | 'right'): HTMLElement | null {
  const cr = current.getBoundingClientRect();
  const cx = cr.left + cr.width / 2;
  const cy = cr.top + cr.height / 2;

  let best: HTMLElement | null = null;
  let bestScore = Infinity;

  for (const el of candidates) {
    if (el === current) continue;
    const r = el.getBoundingClientRect();
    const ex = r.left + r.width / 2;
    const ey = r.top + r.height / 2;
    const dx = ex - cx;
    const dy = ey - cy;

    const inDirection =
      direction === 'up'    ? dy < -4 :
      direction === 'down'  ? dy > 4 :
      direction === 'left'  ? dx < -4 :
                              dx > 4;

    if (!inDirection) continue;

    // Primary axis distance weighted lower than perpendicular axis
    const primary   = direction === 'up' || direction === 'down' ? Math.abs(dy) : Math.abs(dx);
    const secondary = direction === 'up' || direction === 'down' ? Math.abs(dx) : Math.abs(dy);
    const score = primary + secondary * 2;

    if (score < bestScore) {
      bestScore = score;
      best = el;
    }
  }

  return best;
}

export function useTVNavigation() {
  useEffect(() => {
    if (!document.documentElement.classList.contains('tv')) return;

    function handleKeyDown(e: KeyboardEvent) {
      const dir =
        e.key === 'ArrowUp'    ? 'up' :
        e.key === 'ArrowDown'  ? 'down' :
        e.key === 'ArrowLeft'  ? 'left' :
        e.key === 'ArrowRight' ? 'right' : null;

      if (!dir) return;

      e.preventDefault();
      const active = document.activeElement as HTMLElement | null;
      const all = getFocusable();

      if (!active || !all.includes(active)) {
        all[0]?.focus();
        return;
      }

      const target = nearest(active, all, dir);
      if (target) target.focus();
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);
}
