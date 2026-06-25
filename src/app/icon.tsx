import { ImageResponse } from "next/og";

export const size = { width: 512, height: 512 };
export const contentType = "image/png";

export default function Icon() {
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
            fontSize: 132,
            fontWeight: 600,
            letterSpacing: 10,
            lineHeight: 1,
          }}
        >
          CC
        </div>
        <div
          style={{
            color: "#f8fafc",
            fontSize: 52,
            fontWeight: 300,
            letterSpacing: 14,
            marginTop: 16,
          }}
        >
          SHOWER
        </div>
      </div>
    ),
    { ...size },
  );
}
