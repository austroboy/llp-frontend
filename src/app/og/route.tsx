import { ImageResponse } from "next/og";

export const runtime = "edge";

export async function GET() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "1200px",
          height: "630px",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(135deg, #1e293b 0%, #0f172a 100%)",
          fontFamily: "system-ui, sans-serif",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "16px",
            marginBottom: "24px",
          }}
        >
          <div
            style={{
              width: "64px",
              height: "64px",
              borderRadius: "16px",
              background: "#2563eb",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "32px",
              fontWeight: 800,
              color: "white",
            }}
          >
            L
          </div>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <span style={{ fontSize: "48px", fontWeight: 800, color: "#fff" }}>
              Labor Law Partner
            </span>
            <span style={{ fontSize: "18px", color: "#94a3b8", marginTop: "-4px" }}>
              Labour Law Partner
            </span>
          </div>
        </div>
        <div
          style={{
            fontSize: "24px",
            color: "#e2e8f0",
            textAlign: "center",
            maxWidth: "800px",
            lineHeight: 1.5,
          }}
        >
          AI-powered Bangladesh labour law search, compliance, and headhunting platform
        </div>
        <div
          style={{
            display: "flex",
            gap: "32px",
            marginTop: "40px",
          }}
        >
          {["Legal Research", "Expert Marketplace", "Headhunting", "Job Search"].map(
            (item) => (
              <div
                key={item}
                style={{
                  padding: "8px 20px",
                  borderRadius: "24px",
                  border: "1px solid #334155",
                  color: "#94a3b8",
                  fontSize: "14px",
                }}
              >
                {item}
              </div>
            )
          )}
        </div>
      </div>
    ),
    { width: 1200, height: 630 }
  );
}
