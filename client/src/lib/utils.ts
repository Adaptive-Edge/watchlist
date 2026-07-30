import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Keep in sync with server/ai.ts — used to hide picks the user has already
// rejected/watchlisted even when the source titles differ slightly
// ("Industry season four" vs "Industry"). Strips season/series qualifiers.
export function normaliseTitle(raw: string): string {
  return normaliseTitleExact(raw).replace(
    /\s+(season|series|part|volume|vol)\s+(\d+|one|two|three|four|five|six|seven|eight|nine|ten)\b.*$/,
    ""
  );
}

// Season/series qualifiers kept — for watched-history matching, so finishing
// one season doesn't hide the next season's pick.
export function normaliseTitleExact(raw: string): string {
  return raw
    .toLowerCase()
    .replace(/['"‘’“”]/g, "")
    .replace(/[^a-z0-9 ]/g, " ")
    .replace(/^the\s+/, "")
    .replace(/\s+/g, " ")
    .trim();
}
