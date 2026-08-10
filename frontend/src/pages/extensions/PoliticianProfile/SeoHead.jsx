// SeoHead.jsx — Complete JSON-LD schema.org/Person implementation & SEO metadata
import React from "react";
import { Helmet } from "react-helmet-async";
import { ensureUrl } from "./utils";

export default function SeoHead({ politician }) {
  if (!politician) return null;

  const title = `${politician.name} (${politician.party || "Politician"}) — Profile & Records`;
  const description = politician.brief_intro || `Explore official profile, voting record, wealth history, and promises for ${politician.name}.`;
  const canonicalUrl = window.location.href;
  const imageUrl = politician.image_url ? ensureUrl(politician.image_url) : "";

  // Structured Data (schema.org/Person)
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Person",
    name: politician.name,
    jobTitle: politician.role || "Politician",
    description: description,
    image: imageUrl,
    url: canonicalUrl,
    alumniOf: politician.education || undefined,
    birthDate: politician.date_of_birth || undefined,
    nationality: politician.country_code || undefined,
    memberOf: politician.party ? { "@type": "PoliticalParty", name: politician.party } : undefined,
    sameAs: [
      politician.official_website ? ensureUrl(politician.official_website) : "",
      politician.social_links?.twitter ? ensureUrl(politician.social_links.twitter) : "",
      politician.social_links?.facebook ? ensureUrl(politician.social_links.facebook) : "",
      politician.social_links?.instagram ? ensureUrl(politician.social_links.instagram) : "",
      politician.social_links?.youtube ? ensureUrl(politician.social_links.youtube) : "",
    ].filter(Boolean),
  };

  return (
    <Helmet>
      <title>{title}</title>
      <meta name="description" content={description} />
      <link rel="canonical" href={canonicalUrl} />

      {/* OpenGraph */}
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta property="og:type" content="profile" />
      <meta property="og:url" content={canonicalUrl} />
      {imageUrl && <meta property="og:image" content={imageUrl} />}

      {/* Twitter Card */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={title} />
      <meta name="twitter:description" content={description} />
      {imageUrl && <meta name="twitter:image" content={imageUrl} />}

      {/* Structured Data / JSON-LD */}
      <script type="application/ld+json">{JSON.stringify(jsonLd)}</script>
    </Helmet>
  );
}
