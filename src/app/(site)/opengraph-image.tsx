import { ImageResponse } from "next/og";

export const alt = "Calenvia — agendamento online com confirmação no WhatsApp";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OgImage() {
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        background: "#FBFAF7",
        color: "#14161A",
        padding: 80,
        fontFamily: "sans-serif",
      }}
    >
      <div
        style={{ display: "flex", alignItems: "center", gap: 20, fontSize: 44, fontWeight: 800 }}
      >
        <div
          style={{
            width: 72,
            height: 72,
            borderRadius: 20,
            background: "#4B3FD9",
            color: "#fff",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 44,
          }}
        >
          <svg width="40" height="40" viewBox="0 0 24 24">
            <path
              d="M5 12l5 5L19 8"
              stroke="#fff"
              strokeWidth="3.5"
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
        Calenvia
      </div>
      <div
        style={{ display: "flex", marginTop: 48, fontSize: 76, fontWeight: 800, lineHeight: 1.05 }}
      >
        Sua agenda cheia.
      </div>
      <div style={{ display: "flex", fontSize: 76, fontWeight: 800, color: "#4B3FD9" }}>
        Seu WhatsApp em paz.
      </div>
      <div style={{ display: "flex", marginTop: 36, fontSize: 34, color: "#4A4D55" }}>
        Página de agendamento + confirmação automática no WhatsApp
      </div>
    </div>,
    size,
  );
}
