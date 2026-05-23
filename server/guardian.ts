const GUARDIAN_BASE = "https://content.guardianapis.com";

function apiKey(): string {
  const key = process.env.GUARDIAN_API_KEY;
  if (!key) throw new Error("GUARDIAN_API_KEY not set");
  return key;
}

export interface GuardianReview {
  title: string;
  url: string;
  starRating: number | null;
  excerpt: string;
  body: string;
  publishedDate: string;
}

export async function fetchRecentReviews(daysBack = 60): Promise<GuardianReview[]> {
  const fromDate = new Date();
  fromDate.setDate(fromDate.getDate() - daysBack);
  const fromStr = fromDate.toISOString().split("T")[0];

  const reviews: GuardianReview[] = [];

  for (const section of ["film", "tv-and-radio"]) {
    try {
      // Paginate — Guardian returns max 200 per page
      let page = 1;
      let totalPages = 1;

      while (page <= totalPages && page <= 5) {
        const url = new URL(`${GUARDIAN_BASE}/search`);
        url.searchParams.set("api-key", apiKey());
        url.searchParams.set("section", section);
        url.searchParams.set("tag", "tone/reviews");
        url.searchParams.set("from-date", fromStr);
        url.searchParams.set("show-fields", "starRating,standfirst,headline,bodyText");
        url.searchParams.set("page-size", "200");
        url.searchParams.set("page", page.toString());
        url.searchParams.set("order-by", "newest");

        const res = await fetch(url.toString());
        if (!res.ok) {
          console.error(`Guardian API ${section} page ${page} failed: ${res.status}`);
          break;
        }

        const data = await res.json();
        totalPages = data.response?.pages || 1;
        const results = data.response?.results || [];

        for (const item of results) {
          const fields = item.fields || {};
          const headline = fields.headline || item.webTitle || "";
          const title = extractTitleFromHeadline(headline);

          reviews.push({
            title,
            url: item.webUrl || "",
            starRating: fields.starRating ? parseInt(fields.starRating) : null,
            excerpt: fields.standfirst
              ? stripHtml(fields.standfirst).substring(0, 300)
              : "",
            body: fields.bodyText || "",
            publishedDate: item.webPublicationDate || "",
          });
        }

        page++;
      }
    } catch (err) {
      console.error(`Failed to fetch Guardian ${section} reviews:`, err);
    }
  }

  return reviews;
}

function extractTitleFromHeadline(headline: string): string {
  // Guardian headlines are often: "Title review – description" or "Title review: description"
  let title = headline
    .replace(/\s+review\b.*$/i, "")
    .replace(/\s+–\s+.*$/, "")
    .replace(/\s+—\s+.*$/, "")
    .replace(/\s+-\s+.*$/, "")
    .trim();
  return title;
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, "").trim();
}

function normalise(s: string): string {
  return s
    .toLowerCase()
    .replace(/^the\s+/, "")
    .replace(/['']/g, "'")
    .replace(/[^a-z0-9' ]/g, "")
    .trim();
}

interface ReleaseForMatching {
  tmdbId: number;
  title: string;
  year: number | null;
}

function tokens(s: string): string[] {
  return normalise(s).split(/\s+/).filter(Boolean);
}

function reviewYear(r: GuardianReview): number | null {
  const y = parseInt((r.publishedDate || "").slice(0, 4), 10);
  return Number.isFinite(y) ? y : null;
}

// True when needle tokens appear in haystack tokens as a contiguous run at a
// word boundary — so "raw" matches ["raw", "deal"] but NOT ["magic", "faraway",
// "tree"] (the old substring match tripped on "fa-raw-ay").
function hasTokenRun(haystack: string[], needle: string[]): boolean {
  if (needle.length === 0 || needle.length > haystack.length) return false;
  outer: for (let i = 0; i <= haystack.length - needle.length; i++) {
    for (let j = 0; j < needle.length; j++) {
      if (haystack[i + j] !== needle[j]) continue outer;
    }
    return true;
  }
  return false;
}

export function matchReviewsToReleases(
  reviews: GuardianReview[],
  releases: ReleaseForMatching[]
): Map<number, GuardianReview> {
  const matched = new Map<number, GuardianReview>();

  for (const review of reviews) {
    const reviewTokens = tokens(review.title);
    if (reviewTokens.length === 0) continue;
    const rYear = reviewYear(review);

    for (const release of releases) {
      const releaseTokens = tokens(release.title);
      if (releaseTokens.length === 0) continue;

      // Exact token equality, or — only when BOTH titles have ≥2 tokens —
      // one's tokens form a contiguous run in the other's. Single-token titles
      // ("Raw", "It") must match exactly, otherwise false positives like "Raw
      // Deal" → "Raw" are too easy.
      const exact =
        reviewTokens.length === releaseTokens.length &&
        reviewTokens.every((t, i) => t === releaseTokens[i]);
      const bothMulti = reviewTokens.length >= 2 && releaseTokens.length >= 2;
      const reviewContainsRelease =
        bothMulti && hasTokenRun(reviewTokens, releaseTokens);
      const releaseContainsReview =
        bothMulti && hasTokenRun(releaseTokens, reviewTokens);

      if (!exact && !reviewContainsRelease && !releaseContainsReview) continue;

      // Year sanity: Guardian reviews are published around release time, so
      // require the review year to be within ±2 of the release year. This
      // catches mismatches like a 2026 Guardian review being attached to a
      // 1993 TMDB re-release that shares a token.
      if (release.year && rYear && Math.abs(rYear - release.year) > 2) continue;

      // Prefer reviews with star ratings over those without
      const existing = matched.get(release.tmdbId);
      if (!existing || (review.starRating && !existing.starRating)) {
        matched.set(release.tmdbId, review);
      }
    }
  }

  return matched;
}
