export const mainNav = [
  { href: "/", label: "Leaderboard", match: (p: string) => p === "/" },
  { href: "/today", label: "Daily Rankings", match: (p: string) => p.startsWith("/today") || p.startsWith("/daily") },
  { href: "/categories", label: "Categories", match: (p: string) => p.startsWith("/categories") },
  { href: "/how-it-works", label: "How It Works", match: (p: string) => p.startsWith("/how-it-works") },
  { href: "/about", label: "About", match: (p: string) => p.startsWith("/about") },
];
