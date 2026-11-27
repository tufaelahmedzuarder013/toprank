/**
 * DEMO DATA — fictional products for the initial leaderboard.
 * Every name, domain, amount and click count here is invented. Domains use the
 * reserved `.example` TLD so they can never point at a real business.
 */
export type DemoListing = {
  name: string;
  slug: string;
  domain: string;
  category: string;
  description: string;
  total: number;
  clicks: number;
  kind?: "WEBSITE" | "X_PROFILE";
};

export const demoListings: DemoListing[] = [
  { name: "PromptForge", slug: "promptforge", domain: "promptforge.example", category: "ai-tools", description: "Version, test and ship LLM prompts like code — with diffs, evals and rollbacks.", total: 4820, clicks: 9314 },
  { name: "Shipyard CI", slug: "shipyard-ci", domain: "shipyardci.example", category: "developer-tools", description: "Zero-config CI pipelines that finish before your coffee does.", total: 3915, clicks: 7022 },
  { name: "Lumen Analytics", slug: "lumen-analytics", domain: "lumenanalytics.example", category: "saas", description: "Privacy-first product analytics with funnels you can read in five seconds.", total: 2760, clicks: 5610 },
  { name: "RankHarbor", slug: "rankharbor", domain: "rankharbor.example", category: "seo", description: "Daily rank tracking and on-page fixes, prioritised by traffic impact.", total: 2210, clicks: 4388 },
  { name: "Cartwise", slug: "cartwise", domain: "cartwise.example", category: "ecommerce", description: "One-page checkout that recovers abandoned carts with smart reminders.", total: 1840, clicks: 3976 },
  { name: "Pixel Pantry", slug: "pixel-pantry", domain: "pixelpantry.example", category: "design", description: "10,000 hand-made illustrations and icons with a commercial licence.", total: 1515, clicks: 3310 },
  { name: "Focusroom", slug: "focusroom", domain: "focusroom.example", category: "productivity", description: "Body-doubling video rooms for deep work, timed in 50-minute sprints.", total: 1290, clicks: 2894 },
  { name: "Mailgarden", slug: "mailgarden", domain: "mailgarden.example", category: "marketing", description: "Newsletter platform with a built-in referral program and paid tiers.", total: 1105, clicks: 2511 },
  { name: "Ledgerly", slug: "ledgerly", domain: "ledgerly.example", category: "finance", description: "Bookkeeping for freelancers that categorises transactions automatically.", total: 960, clicks: 2203 },
  { name: "@buildwithnova", slug: "buildwithnova", domain: "x.com/buildwithnova", category: "other", description: "Indie maker sharing a weekly build log of profitable side projects.", total: 875, clicks: 1987, kind: "X_PROFILE" },
  { name: "Agentbench", slug: "agentbench", domain: "agentbench.example", category: "ai-tools", description: "Benchmark AI agents on real-world tasks with reproducible scorecards.", total: 790, clicks: 1840 },
  { name: "Northstar Studio", slug: "northstar-studio", domain: "northstarstudio.example", category: "agencies", description: "Product design and growth sprints for seed-stage startups.", total: 720, clicks: 1532 },
  { name: "Quillpath", slug: "quillpath", domain: "quillpath.example", category: "education", description: "Cohort-based writing courses with live feedback from editors.", total: 655, clicks: 1409 },
  { name: "Statusbeam", slug: "statusbeam", domain: "statusbeam.example", category: "developer-tools", description: "Beautiful status pages and uptime alerts in under a minute.", total: 600, clicks: 1288 },
  { name: "Hirelane", slug: "hirelane", domain: "hirelane.example", category: "business", description: "Structured hiring pipelines with scorecards your team will actually use.", total: 540, clicks: 1105 },
  { name: "Questforge", slug: "questforge", domain: "questforge.example", category: "games", description: "Co-op roguelike where every run is narrated by your party's choices.", total: 500, clicks: 1630 },
  { name: "Captionly", slug: "captionly", domain: "captionly.example", category: "ai-tools", description: "Accurate captions and translations for short-form video in 40 languages.", total: 455, clicks: 990 },
  { name: "Backlink Atlas", slug: "backlink-atlas", domain: "backlinkatlas.example", category: "seo", description: "Find, vet and track backlink opportunities from one clean dashboard.", total: 410, clicks: 873 },
  { name: "Tidy Invoice", slug: "tidy-invoice", domain: "tidyinvoice.example", category: "finance", description: "Send polished invoices and get paid by card or bank transfer.", total: 380, clicks: 812 },
  { name: "Glyphkit", slug: "glyphkit", domain: "glyphkit.example", category: "design", description: "Variable icon set with 3,000 glyphs and a Figma plugin.", total: 345, clicks: 760 },
  { name: "Launchnote", slug: "launchnote", domain: "launchnote.example", category: "marketing", description: "Changelogs and launch announcements that turn into SEO landing pages.", total: 310, clicks: 694 },
  { name: "Stackcraft", slug: "stackcraft", domain: "stackcraft.example", category: "saas", description: "Internal tools builder for ops teams — spreadsheets with superpowers.", total: 290, clicks: 640 },
  { name: "Brightdesk", slug: "brightdesk", domain: "brightdesk.example", category: "business", description: "Shared inbox and help desk for small support teams.", total: 260, clicks: 581 },
  { name: "Snippet Vault", slug: "snippet-vault", domain: "snippetvault.example", category: "developer-tools", description: "Searchable team snippets synced to your editor and terminal.", total: 240, clicks: 533 },
  { name: "Nookshop", slug: "nookshop", domain: "nookshop.example", category: "ecommerce", description: "Launch a beautiful storefront for handmade goods in an afternoon.", total: 215, clicks: 498 },
  { name: "Calmcal", slug: "calmcal", domain: "calmcal.example", category: "productivity", description: "A calendar that protects focus time and batches your meetings.", total: 200, clicks: 455 },
  { name: "Tutorloop", slug: "tutorloop", domain: "tutorloop.example", category: "education", description: "Match with vetted tutors for maths and science, online or in person.", total: 185, clicks: 402 },
  { name: "Adsmith", slug: "adsmith", domain: "adsmith.example", category: "marketing", description: "Generate, test and rotate ad creatives across every channel.", total: 160, clicks: 377 },
  { name: "Vectorly", slug: "vectorly", domain: "vectorly.example", category: "ai-tools", description: "Managed vector search with hybrid ranking and simple pricing.", total: 150, clicks: 344 },
  { name: "Copperline Agency", slug: "copperline-agency", domain: "copperline.example", category: "agencies", description: "Performance marketing for DTC brands, paid on results.", total: 135, clicks: 290 },
  { name: "Pebble Budget", slug: "pebble-budget", domain: "pebblebudget.example", category: "finance", description: "Envelope budgeting app for couples and shared households.", total: 120, clicks: 268 },
  { name: "Tilecraft", slug: "tilecraft", domain: "tilecraft.example", category: "games", description: "A cosy tile-laying puzzle game with a new daily challenge.", total: 110, clicks: 301 },
  { name: "Formpilot", slug: "formpilot", domain: "formpilot.example", category: "saas", description: "Conversational forms with logic, payments and webhooks.", total: 95, clicks: 214 },
  { name: "Sitemap Doctor", slug: "sitemap-doctor", domain: "sitemapdoctor.example", category: "seo", description: "Crawl your site and fix indexing issues before Google finds them.", total: 85, clicks: 190 },
  { name: "@designwithmara", slug: "designwithmara", domain: "x.com/designwithmara", category: "design", description: "Daily UI teardowns and design system tips from a product designer.", total: 75, clicks: 177, kind: "X_PROFILE" },
  { name: "Readwell", slug: "readwell", domain: "readwell.example", category: "education", description: "Turn long articles into spaced-repetition flashcards.", total: 60, clicks: 136 },
  { name: "Opsbook", slug: "opsbook", domain: "opsbook.example", category: "business", description: "Runbooks and SOPs your team can follow step by step.", total: 50, clicks: 104 },
  { name: "Tinyship", slug: "tinyship", domain: "tinyship.example", category: "ecommerce", description: "Print discounted shipping labels from any marketplace.", total: 40, clicks: 88 },
  { name: "Moodboarder", slug: "moodboarder", domain: "moodboarder.example", category: "design", description: "Collect inspiration from anywhere into shareable boards.", total: 30, clicks: 61 },
  { name: "Habitstack", slug: "habitstack", domain: "habitstack.example", category: "productivity", description: "Stack tiny habits onto routines you already have.", total: 25, clicks: 47 },
  { name: "Quietmode", slug: "quietmode", domain: "quietmode.example", category: "other", description: "Notification filter that only lets the important pings through.", total: 20, clicks: 33 },
  { name: "Pixeltrail", slug: "pixeltrail", domain: "pixeltrail.example", category: "games", description: "Retro platformer speedrun tracker with community leaderboards.", total: 15, clicks: 22 },
  { name: "Starter Sheet", slug: "starter-sheet", domain: "startersheet.example", category: "business", description: "Fill-in-the-blanks financial model for first-time founders.", total: 10, clicks: 9 },
];

/** Deterministic PRNG so every fresh seed looks the same. */
export function prng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Splits each listing's total into 1–4 confirmed payments spread over the last
 * ~70 days, with a handful landing "today" so the daily board has content.
 */
export function buildDemoPayments(now: Date) {
  const rand = prng(42);
  const dayMs = 86_400_000;
  const startOfToday = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  const minutesIntoToday = Math.max(5, Math.floor((now.getTime() - startOfToday) / 60_000) - 1);
  return demoListings.map((l, index) => {
    const parts = l.total >= 400 ? 4 : l.total >= 120 ? 3 : l.total >= 40 ? 2 : 1;
    const amounts: number[] = [];
    let remaining = l.total;
    for (let i = parts; i > 1; i--) {
      const share = Math.max(10, Math.round((remaining / i) * (0.6 + rand() * 0.8)));
      amounts.push(Math.min(share, remaining - 10 * (i - 1)));
      remaining -= amounts[amounts.length - 1];
    }
    amounts.push(remaining);
    const firstDay = 8 + Math.floor(rand() * 62);
    const landsToday = index % 6 === 1 || index === 3;
    const times = amounts.map((_, i) => {
      if (landsToday && i === amounts.length - 1) {
        return new Date(startOfToday + Math.floor(rand() * minutesIntoToday) * 60_000);
      }
      const daysAgo = Math.max(1, Math.round(firstDay - (firstDay / amounts.length) * i));
      return new Date(startOfToday - daysAgo * dayMs + Math.floor(rand() * 86_000) * 1000);
    });
    return { listing: l, payments: amounts.map((amount, i) => ({ amount, at: times[i] })) };
  });
}
