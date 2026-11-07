import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";

export const alt = "JobFitwise — AI job matching that tells you where you fit";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// The picture shown when a JobFitwise link is shared on LinkedIn, Facebook, Slack, WhatsApp…
export default async function OpengraphImage() {
  const mark = `data:image/png;base64,${(await readFile(join(process.cwd(), "public/logo-mark.png"))).toString("base64")}`;
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between", padding: 80, background: "#f5f3ee", color: "#15171c" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 20, fontSize: 44 }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={mark} width={93} height={64} alt="" />
          JobFitwise
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
