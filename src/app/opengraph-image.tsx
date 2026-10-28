import { ImageResponse } from "next/og";

export const alt = "Fitwise — AI job matching that tells you where you fit";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// The picture shown when a Fitwise link is shared on LinkedIn, Facebook, Slack, WhatsApp…
export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between", padding: 80, background: "#f5f3ee", color: "#15171c" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 20, fontSize: 44 }}>
          <div style={{ width: 64, height: 64, borderRadius: 32, background: "#1d6b52", color: "#f5f3ee", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 38 }}>f</div>
          Fitwise
        </div>
        <div style={{ display: "flex", flexDirection: "column", fontSize: 84, lineHeight: 1.05 }}>
          <span>Stop guessing.</span>
          <span style={{ color: "#1d6b52" }}>Know where you fit.</span>
        </div>
        <div style={{ display: "flex", fontSize: 28, color: "#3b3f47" }}>
          A fit score for every job · the skills you&apos;re missing · a cover letter in one click
        </div>
      </div>
    ),
    size,
  );
}
