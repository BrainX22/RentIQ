import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "RentIQ — Free Rental Property Calculator";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OGImage() {
  return new ImageResponse(
    (
      <div
        style={{
          background: "#F97316",
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: "60px",
        }}
      >
        <div
          style={{
            fontSize: 80,
            fontWeight: 700,
            color: "white",
            letterSpacing: "-2px",
          }}
        >
          RentIQ
        </div>
        <div
          style={{
            fontSize: 36,
            color: "rgba(255,255,255,0.9)",
            marginTop: 20,
            textAlign: "center",
          }}
        >
          Free Rental Property Calculator
        </div>
        <div
          style={{
            fontSize: 24,
            color: "rgba(255,255,255,0.75)",
            marginTop: 12,
            textAlign: "center",
          }}
        >
          Cash Flow · Cap Rate · Cash-on-Cash Return
        </div>
      </div>
    ),
    { ...size }
  );
}
