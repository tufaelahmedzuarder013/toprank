import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import { Toaster } from "sonner";
import { getSettings } from "@/server/settings";
import { brandCss } from "@/lib/color";
import { themeScript } from "@/lib/theme";
import { siteUrl } from "@/server/payment-provider";
import "./globals.css";

const inter = localFont({ src: "./fonts/inter-latin-wght-normal.woff2", variable: "--font-inter", weight: "100 900", display: "swap" });
const jakarta = localFont({ src: "./fonts/plus-jakarta-sans-latin-wght-normal.woff2", variable: "--font-jakarta", weight: "200 800", display: "swap" });
const mono = localFont({ src: "./fonts/jetbrains-mono-latin-wght-normal.woff2", variable: "--font-jbmono", weight: "100 800", display: "swap", preload: false });

export async function generateMetadata(): Promise<Metadata> {
  const s = await getSettings();
  const title = `${s.brand.name} — ${s.brand.tagline}`;
  return {
    metadataBase: new URL(siteUrl()),
    title: { default: title, template: `%s · ${s.brand.name}` },
    description: s.brand.description,
    applicationName: s.brand.name,
    openGraph: { type: "website", siteName: s.brand.name, title, description: s.brand.description, url: "/" },
    twitter: { card: "summary_large_image", title, description: s.brand.description },
    alternates: { canonical: "/" },
    formatDetection: { telephone: false },
  };
}

// Every page reads live rankings and settings from the database, so nothing is prerendered at build time.
export const dynamic = "force-dynamic";

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f7f7f9" },
    { media: "(prefers-color-scheme: dark)", color: "#09090c" },
  ],
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const s = await getSettings();
  return (
    <html lang="en" suppressHydrationWarning className={`${inter.variable} ${jakarta.variable} ${mono.variable}`}>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
        <style dangerouslySetInnerHTML={{ __html: brandCss(s.brand.accent, s.brand.secondary) }} />
      </head>
      <body className="min-h-dvh">
        {children}
        <Toaster position="bottom-center" toastOptions={{ className: "!rounded-xl !border-border !bg-surface !text-foreground !shadow-lg" }} />
      </body>
    </html>
  );
}
