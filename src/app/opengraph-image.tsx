import { ImageResponse } from "next/og";
import { getSettings } from "@/server/settings";
import { getAllTimeBoard } from "@/server/leaderboard";

export const alt = "The pay-to-rank leaderboard";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const dynamic = "force-dynamic";

export default async function Image() {
  const [s, board] = await Promise.all([getSettings(), getAllTimeBoard({ pageSize: 3 })]);
  const usd = (n: number) => `$${n.toLocaleString("en-US")}`;
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between", padding: 72, background: "#0b0b0f", color: "#fff", fontFamily: "sans-serif" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          <div style={{ width: 64, height: 64, borderRadius: 18, background: `linear-gradient(135deg, ${s.brand.accent}, ${s.brand.secondary})`, display: "flex", alignItems: "flex-end", justifyContent: "center", gap: 6, paddingBottom: 14 }}>
            <div style={{ width: 10, height: 14, background: "rgba(255,255,255,.7)", borderRadius: 3 }} />
            <div style={{ width: 10, height: 24, background: "rgba(255,255,255,.85)", borderRadius: 3 }} />
            <div style={{ width: 10, height: 34, background: "#fff", borderRadius: 3 }} />
          </div>
          <div style={{ fontSize: 44, fontWeight: 800 }}>{s.brand.name}</div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={{ fontSize: 76, fontWeight: 800, letterSpacing: -2, lineHeight: 1.05 }}>{s.home.heading}</div>
          <div style={{ fontSize: 30, color: "#a3a5b1", maxWidth: 900 }}>{s.brand.tagline}</div>
        </div>
        <div style={{ display: "flex", gap: 16 }}>
          {board.items.map((i) => (
            <div key={i.id} style={{ display: "flex", alignItems: "center", gap: 14, padding: "14px 22px", borderRadius: 20, background: "#17171e", border: "1px solid #26262f", fontSize: 26 }}>
              <div style={{ color: i.rank === 1 ? "#f5bf2a" : "#a3a5b1", fontWeight: 800 }}>{`#${i.rank}`}</div>
              <div style={{ fontWeight: 700 }}>{i.name}</div>
              <div style={{ color: s.brand.accent, fontWeight: 800 }}>{usd(i.amount)}</div>
            </div>
          ))}
        </div>
      </div>
    ),
    size,
  );
}
