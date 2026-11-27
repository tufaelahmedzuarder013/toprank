/**
 * Default brand, homepage copy and ranking rules.
 * Everything here can be overridden from the admin dashboard (stored in SiteSettings).
 */
export type RankingRules = {
  /** Minimum total for a new listing, whole USD */
  minAmount: number;
  /** Extra needed on top of the current #1 total to take #1 */
  topIncrement: number;
  /** Minimum amount above another listing's total needed to pass it (1 = any higher amount) */
  overtakeIncrement: number;
  /** Maximum cumulative total for one listing, whole USD */
  maxTotal: number;
};

export type SiteSettingsData = {
  brand: {
    name: string;
    tagline: string;
    description: string;
    logoUrl: string | null;
    accent: string;
    secondary: string;
  };
  home: {
    heading: string;
    subheading: string;
    rulesNote: string;
    ctaHeading: string;
    ctaText: string;
  };
  rules: RankingRules;
  disclosure: string;
  featured: { enabled: boolean; title: string; description: string; listingSlugs: string[] };
  seasonal: { enabled: boolean; badge: string; title: string; description: string; href: string };
  contactEmail: string;
};

export const defaultSettings: SiteSettingsData = {
  brand: {
    name: "Toprung",
    tagline: "The leaderboard you can climb.",
    description: "A public, pay-to-rank leaderboard for products, startups and creators. Pay more, rank higher — simple and transparent.",
    logoUrl: null,
    accent: "#FF6A3D",
    secondary: "#7C5CFF",
  },
  home: {
    heading: "Claim the spotlight.",
    subheading: "Get your product in front of people. Choose your amount and claim your place on the leaderboard.",
    rulesNote: "Rankings are based on paid amounts only. Your final position is set when your payment is confirmed.",
    ctaHeading: "Your product deserves the top rung.",
    ctaText: "Pick an amount, submit your link and climb the board in under two minutes.",
  },
  rules: {
    minAmount: 10,
    topIncrement: 5,
    overtakeIncrement: 1,
    maxTotal: 999_999,
  },
  disclosure: "Positions are paid placements. Rank reflects the amount paid, not an independent review, rating or endorsement.",
  featured: {
    enabled: true,
    title: "Editor's corner",
    description: "A hand-picked listing from the board. Featured spots are chosen by the team and are not for sale.",
    listingSlugs: [],
  },
  seasonal: {
    enabled: false,
    badge: "Limited",
    title: "Launch week",
    description: "New listings this week get a highlight on the Today board.",
    href: "/today",
  },
  contactEmail: "hello@toprung.example",
};

export type CategorySeed = { slug: string; name: string; icon: string; description: string };

export const defaultCategories: CategorySeed[] = [
  { slug: "ai-tools", name: "AI Tools", icon: "bot", description: "Assistants, models, agents and everything powered by machine learning." },
  { slug: "developer-tools", name: "Developer Tools", icon: "code", description: "APIs, SDKs, devops, testing and tools that help teams ship." },
  { slug: "marketing", name: "Marketing", icon: "megaphone", description: "Growth, email, social, ads and audience-building products." },
  { slug: "seo", name: "SEO", icon: "search", description: "Rank tracking, content optimisation, backlinks and technical SEO." },
  { slug: "saas", name: "SaaS", icon: "cloud", description: "Subscription software for teams and businesses of every size." },
  { slug: "ecommerce", name: "Ecommerce", icon: "shopping-bag", description: "Online stores, checkout, fulfilment and commerce tooling." },
  { slug: "design", name: "Design", icon: "palette", description: "Design tools, assets, templates and creative resources." },
  { slug: "productivity", name: "Productivity", icon: "zap", description: "Notes, tasks, calendars and tools that give you time back." },
  { slug: "agencies", name: "Agencies", icon: "building", description: "Studios, freelancers and service businesses." },
  { slug: "education", name: "Education", icon: "graduation-cap", description: "Courses, learning platforms, communities and tutors." },
  { slug: "business", name: "Business", icon: "briefcase", description: "Operations, HR, legal, sales and back-office tools." },
  { slug: "finance", name: "Finance", icon: "wallet", description: "Fintech, accounting, invoicing and personal finance." },
  { slug: "games", name: "Games", icon: "gamepad", description: "Indie games, gaming tools and communities." },
  { slug: "other", name: "Other", icon: "shapes", description: "Everything that doesn't fit neatly anywhere else." },
];

/** Default copy for editable information pages. Placeholders like {{minAmount}} are filled in at render time. */
export const defaultContentPages: { slug: string; title: string; body: string }[] = [
  {
    slug: "about",
    title: "About {{siteName}}",
    body: `{{siteName}} is a public leaderboard where anyone can put a website, product, startup or X profile in front of an audience — and decide how high it sits by choosing how much to pay.

## Why a pay-to-rank board?

Launch platforms, directories and social feeds all have opaque algorithms. We wanted the opposite: one rule everyone can read. The listing with the highest confirmed total sits at the top. That's it.

## What we believe

- **Transparency over mystery.** Every position is paid, and we say so on every page.
- **Simple beats clever.** Submit a link, pick an amount, pay securely, appear on the board.
- **Visitors deserve honesty.** A high rank means someone paid for visibility — not that we reviewed or endorse the product.

## Who runs it

{{siteName}} is an independent project. Questions, partnerships or press — reach us through the contact page.`,
  },
  {
    slug: "how-it-works",
    title: "How {{siteName}} works",
    body: `Ranking on {{siteName}} is decided by one thing: the total amount confirmed for each listing.

## The short version

1. **Submit your link.** A website URL or an X handle. We fetch the name, description and icon automatically — you can edit them.
2. **Choose your amount.** New listings start at \${{minAmount}}. Taking #1 needs the current #1 total plus \${{topIncrement}}.
3. **Pay securely.** Checkout is hosted by our payment provider; we never see your card details.
4. **Appear on the board.** As soon as the payment is confirmed your listing goes live at the position its total supports.

## Three boards, one payment

- **All-time** ranks listings by their cumulative confirmed total.
- **Today** ranks listings by what was paid during the current UTC day and resets at midnight UTC.
- **Daily archive** keeps every past day's final ranking.

A single payment counts toward every board it belongs to — a \$20 upgrade adds \$20 to your all-time total and \$20 to today's spend.`,
  },
  {
    slug: "rules",
    title: "Ranking rules",
    body: `These rules are applied on the server for every claim. They are the same for everyone.

## Amounts

- Amounts are whole US dollars.
- A new listing starts at a minimum of **\${{minAmount}}**.
- A single listing's total can't exceed **\${{maxTotal}}**.

## Positions

- Listings are ordered by their confirmed total, highest first.
- To take **#1**, your total must be at least the current #1 total **plus \${{topIncrement}}**.
- To move above any other listing, your total must be higher than that listing's total.
- **Ties:** when two listings have the same total, the one that reached it first stays ahead.
- If you pay less than the top spots, your listing still appears at the position its total supports.
- If your amount would beat #1 but falls short of the \${{topIncrement}} increment, we'll ask you to choose a valid amount before checkout.

## Timing

- Your position is only final when the payment is confirmed. If someone else pays while you are checking out, your position is recalculated at confirmation.
- The Today board counts payments confirmed between 00:00 and 23:59 UTC and resets at midnight UTC.

## Upgrades and ownership

- Only the verified owner of a listing can increase its total or edit it.
- When you upgrade, you only pay the difference between your current total and your new total.
- Nobody can take over an existing listing by paying the difference — ownership must be verified first.

## Content

Listings must not link to illegal, deceptive, hateful, adult or malicious content. We may hide or remove listings that break these rules. See the Terms of Service for refunds and removals.

## Disclosure

Positions are paid placements. Rank does not represent a review, rating or endorsement.`,
  },
  {
    slug: "terms",
    title: "Terms of Service",
    body: `_Draft template — have this reviewed by a qualified lawyer for your jurisdiction before launch._

## 1. The service

{{siteName}} operates a public leaderboard of paid listings. By submitting a listing or making a payment you agree to these terms.

## 2. Paid placements

Rank is determined solely by confirmed payment totals under the published Rules. A position is not guaranteed until payment is confirmed and may change at any time when others pay more.

## 3. Payments and refunds

Payments are processed by a third-party provider. Amounts are in US dollars. Payments are generally non-refundable once a listing is live. If a payment cannot be applied (for example, the same link was claimed by someone else first), it is refunded automatically.

## 4. Listing content

You are responsible for the link and text you submit. We may edit, hide or remove listings that are unlawful, misleading, malicious, infringing, hateful or adult in nature, or that break the Rules, without refund where the breach is serious.

## 5. Ownership

Only a verified owner can edit or upgrade a listing. Verification proves control of the domain or profile.

## 6. No endorsement

Listings are advertisements. We do not review or endorse listed products.

## 7. Liability

The service is provided "as is". To the extent permitted by law, our liability is limited to the amount you paid in the 12 months before a claim.

## 8. Changes

We may update these terms and the Rules. Material changes will be announced on the site.

## 9. Contact

Questions about these terms: {{contactEmail}}.`,
  },
  {
    slug: "privacy",
    title: "Privacy Policy",
    body: `_Draft template — have this reviewed for your jurisdiction (e.g. GDPR, CCPA) before launch._

## What we collect

- **Account data:** name, email address and a hashed password if you create an account.
- **Listing data:** the link, name, description and images you submit.
- **Payment data:** payment status, amount and provider references. Card details are handled entirely by our payment provider and never reach our servers.
- **Usage data:** aggregated outgoing click counts per listing. We do not store IP addresses with clicks.
- **Messages:** anything you send through the contact form.

## How we use it

To operate the leaderboard, process payments, verify ownership, prevent abuse and answer messages. We do not sell personal data.

## Cookies

We use one essential cookie to keep you signed in and remember your theme preference. No advertising cookies.

## Retention

Account data is kept while your account is active. Payment records are kept as required for accounting.

## Your rights

You can request access to, correction of or deletion of your personal data by contacting {{contactEmail}}.`,
  },
];

export const defaultFaqs: { question: string; answer: string }[] = [
  { question: "How is the ranking decided?", answer: "Only by the total confirmed amount paid for each listing. The highest total is #1. Ties go to the listing that reached the total first." },
  { question: "What's the minimum to get listed?", answer: "New listings start at ${{minAmount}}. You can choose any whole-dollar amount above that, up to ${{maxTotal}} in total." },
  { question: "How much does #1 cost?", answer: "The current #1 total plus ${{topIncrement}}. The exact figure is shown live above the claim form." },
  { question: "Is my position guaranteed when I start checkout?", answer: "No. We show an estimate, but your final position is calculated when your payment is confirmed. If someone else pays more in the meantime, your rank adjusts." },
  { question: "What is the Today board?", answer: "It ranks listings by money confirmed during the current UTC day and resets at midnight UTC. Every past day is saved in the Daily Archive." },
  { question: "Can I increase my listing's amount later?", answer: "Yes. Sign in, verify that you own the listing and choose a new total. You only pay the difference." },
  { question: "Why do I need to verify ownership?", answer: "So nobody else can edit your listing or take it over. You verify with a DNS record, a meta tag or a small text file on your site." },
  { question: "Can I list an X (Twitter) profile?", answer: "Yes — enter @handle or the profile URL. Ownership of X profiles is confirmed manually by our team." },
  { question: "Do you store my card details?", answer: "Never. Checkout is hosted by our payment provider." },
  { question: "Can I get a refund?", answer: "Payments are generally final once a listing is live. If a payment can't be applied — for example the same link was claimed first by someone else — it is refunded automatically." },
  { question: "Does a high rank mean you recommend the product?", answer: "No. Every position is a paid placement and isn't a review or endorsement." },
  { question: "What does a click count mean?", answer: "It's the number of recorded visits from our board to the listing's website. Obvious bots and rapid repeat clicks are filtered out." },
];
