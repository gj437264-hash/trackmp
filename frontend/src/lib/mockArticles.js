export const CATEGORIES = ["News", "Updates", "Research", "Reports"];

export const ARTICLES = [
  {
    id: "election-reform-2026",
    title: "Election Commission Proposes New Transparency Rules for 2026",
    category: "News",
    excerpt: "A sweeping set of reforms aims to standardize campaign finance disclosure across states, following years of inconsistent reporting.",
    body: "<p>The Election Commission today unveiled a draft framework requiring all candidates above the constituency level to file quarterly, machine-readable asset and liability disclosures. The proposal follows sustained pressure from civil society groups and comes after several high-profile discrepancies surfaced during the last election cycle.</p><p>Officials say the rules, if adopted, would take effect ahead of the next general election. Public comment is open for 60 days.</p>",
    author: "Editorial Desk",
    date: "2026-06-28",
    readTime: "4 min read",
  },
  {
    id: "wealth-growth-analysis",
    title: "Analysis: Net Worth Growth Among Sitting Legislators Outpaces National Average",
    category: "Research",
    excerpt: "A review of publicly disclosed wealth records shows a consistent gap between legislator asset growth and broader economic indicators.",
    body: "<p>Drawing on five years of disclosed wealth records tracked on this platform, our analysis finds that median net worth growth among sitting legislators has outpaced national wage growth in the same period.</p><p>The findings do not on their own indicate wrongdoing, but researchers note the pattern merits closer public scrutiny, particularly where asset growth coincides with committee assignments in regulated industries.</p>",
    author: "Research Team",
    date: "2026-06-15",
    readTime: "7 min read",
  },
  {
    id: "constituency-boundary-update",
    title: "Constituency Boundary Commission Releases Draft Maps",
    category: "Updates",
    excerpt: "Draft redistricting maps have been published for public review ahead of the next delimitation cycle.",
    body: "<p>The Boundary Commission has released draft constituency maps incorporating updated census data. Several urban constituencies are proposed for subdivision due to population growth, while some rural seats may be merged.</p><p>A 45-day public consultation period is now open before maps are finalized.</p>",
    author: "Editorial Desk",
    date: "2026-06-02",
    readTime: "3 min read",
  },
  {
    id: "annual-transparency-report",
    title: "2025 Annual Transparency Report: Promises Kept, Broken, and Pending",
    category: "Reports",
    excerpt: "Our annual report compiles platform-wide data on campaign promise fulfillment across tracked jurisdictions.",
    body: "<p>This year's transparency report finds that roughly a third of tracked campaign promises across all jurisdictions were marked delivered within their stated timeframe, while a smaller share were formally broken. The remainder are still pending or lack sufficient public evidence to assess.</p><p>The full report includes jurisdiction-by-jurisdiction breakdowns and methodology notes.</p>",
    author: "Research Team",
    date: "2026-05-20",
    readTime: "10 min read",
  },
  {
    id: "local-council-disclosure-gap",
    title: "Local Council Disclosure Rates Lag Behind National Offices",
    category: "Research",
    excerpt: "City and municipal-level officials disclose wealth and position data at significantly lower rates than state and national counterparts.",
    body: "<p>Our platform's coverage data shows local council members are roughly half as likely to have complete wealth disclosure records compared to state legislators, pointing to a persistent transparency gap at the municipal level.</p>",
    author: "Research Team",
    date: "2026-05-08",
    readTime: "5 min read",
  },
  {
    id: "new-search-tools",
    title: "Platform Update: Regional Search and Promise Leaderboards Now Live",
    category: "Updates",
    excerpt: "New tools let visitors search representatives by region and see which politicians keep the most — and fewest — of their promises.",
    body: "<p>We've shipped two new features: a regional search tool for finding current and former representatives by country, state, city, and constituency, and homepage leaderboards ranking politicians by promise fulfillment rate.</p><p>Both tools draw on the same publicly sourced promise-tracking data available on individual politician profiles.</p>",
    author: "Editorial Desk",
    date: "2026-04-22",
    readTime: "2 min read",
  },
];

export function getArticle(id) {
  return ARTICLES.find((a) => a.id === id);
}
