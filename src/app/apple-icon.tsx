import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          background: "#1a1f2e",
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <div
          style={{
            color: "#d4908a",
            fontSize: 56,
            fontWeight: 600,
            letterSpacing: 4,
            lineHeight: 1,
          }}
        >
          CC
        </div>
        <div
          style={{
            color: "#f8fafc",
            fontSize: 22,
            fontWeight: 300,
            letterSpacing: 5,
            marginTop: 6,
          }}
        >
          SHOWER
        </div>
      </div>
    ),
    { ...size },
  );
}
