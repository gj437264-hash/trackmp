/**
 * SEO validation helpers.
 *
 * IMPORTANT: character ranges below are practical GUIDANCE based on common
 * search-result truncation points, not hard Google ranking rules. This is
 * communicated in the UI copy, not just in code comments.
 */

export const RANGES = {
  title: { min: 30, max: 60, hardMax: 70 },
  description: { min: 70, max: 160, hardMax: 200 },
  ogTitle: { min: 0, max: 70, hardMax: 95 },
  ogDescription: { min: 0, max: 200, hardMax: 300 },
};

/** @returns {"good"|"warning"|"missing"|"invalid"} */
export function getLengthStatus(value, range) {
  const len = (value || "").trim().length;
  if (len === 0) return "missing";
  if (len > range.hardMax) return "invalid";
  if (len < range.min || len > range.max) return "warning";
  return "good";
}

export const STATUS_LABEL = {
  good: "Good",
  warning: "Needs attention",
  missing: "Missing",
  invalid: "Too long",
};

export function isValidHttpUrl(value) {
  if (!value) return true; // empty is handled separately as "missing", not "invalid"
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

export function isValidSlug(value) {
  if (!value) return true;
  return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value);
}

/**
 * Builds a full validation report for an SEO config, used by both the
 * SEOValidationPanel and the completeness score.
 */
export function validateSEOConfig(config) {
  const issues = [];
  const title = config.basic.title.is_custom
    ? config.basic.title.value
    : config.basic.title.generated_value;
  const description = config.basic.description.is_custom
    ? config.basic.description.value
    : config.basic.description.generated_value;

  const titleStatus = getLengthStatus(title, RANGES.title);
  const descriptionStatus = getLengthStatus(description, RANGES.description);

  if (titleStatus !== "good") {
    issues.push({
      field: "basic.title",
      status: titleStatus,
      message:
        titleStatus === "missing"
          ? "SEO title is empty."
          : titleStatus === "invalid"
          ? `Title is ${title.trim().length} characters — likely to be cut off in search results.`
          : "Title is outside the recommended 30–60 character range.",
    });
  }

  if (descriptionStatus !== "good") {
    issues.push({
      field: "basic.description",
      status: descriptionStatus,
      message:
        descriptionStatus === "missing"
          ? "Meta description is empty."
          : descriptionStatus === "invalid"
          ? `Description is ${description.trim().length} characters — likely to be truncated.`
          : "Description is outside the recommended 70–160 character range.",
    });
  }

  if (config.basic.canonical_url && !isValidHttpUrl(config.basic.canonical_url)) {
    issues.push({
      field: "basic.canonical_url",
      status: "invalid",
      message: "Canonical URL is not a valid http(s) URL.",
    });
  }

  if (config.basic.slug && !isValidSlug(config.basic.slug)) {
    issues.push({
      field: "basic.slug",
      status: "invalid",
      message: "Slug should be lowercase letters, numbers, and hyphens only.",
    });
  }

  if (!config.social.og.image_url) {
    issues.push({
      field: "social.og.image_url",
      status: "missing",
      message: "No Open Graph image — social shares will show a blank preview on most platforms.",
    });
  } else if (!isValidHttpUrl(config.social.og.image_url)) {
    issues.push({
      field: "social.og.image_url",
      status: "invalid",
      message: "Open Graph image URL is not valid.",
    });
  }

  if (config.social.twitter.image_url && !isValidHttpUrl(config.social.twitter.image_url)) {
    issues.push({
      field: "social.twitter.image_url",
      status: "invalid",
      message: "Twitter/X image URL is not valid.",
    });
  }

  // Completeness score: weighted toward the fields that most affect
  // how the page appears in search and social contexts.
  const checks = [
    titleStatus === "good",
    descriptionStatus === "good",
    !!config.basic.canonical_url && isValidHttpUrl(config.basic.canonical_url),
    !!config.social.og.image_url,
    !!config.social.og.title,
    !!config.social.twitter.title || !!config.social.og.title, // twitter can fall back
  ];
  const score = Math.round((checks.filter(Boolean).length / checks.length) * 100);

  return { issues, score, titleStatus, descriptionStatus };
}
