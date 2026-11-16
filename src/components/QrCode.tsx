import { useMemo } from "react";
import { qrMatrix, qrPath } from "@/lib/ambassador";

const MARGIN = 2;

/** A QR code as crisp SVG (also sharp when printed). */
export function QrCode({ text, className }: { text: string; className?: string }) {
  const m = useMemo(() => qrMatrix(text), [text]);
  const size = m.length + MARGIN * 2;
  return (
    <svg viewBox={`0 0 ${size} ${size}`} className={className} role="img" aria-label="QR-code naar de wachtlijst" shapeRendering="crispEdges">
      <rect width={size} height={size} fill="#fff" />
      <path d={qrPath(m, MARGIN)} fill="#1E1615" />
    </svg>
  );
}

/** Save the QR code as a PNG (for WhatsApp status, a phone screen or a print shop). */
export function downloadQrPng(text: string, filename: string) {
  const m = qrMatrix(text);
  const scale = 16;
  const size = (m.length + MARGIN * 2) * scale;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  ctx.fillStyle = "#fff";
  ctx.fillRect(0, 0, size, size);
  ctx.fillStyle = "#1E1615";
  m.forEach((row, r) =>
    row.forEach((dark, c) => {
      if (dark) ctx.fillRect((c + MARGIN) * scale, (r + MARGIN) * scale, scale, scale);
    }),
  );
  const a = document.createElement("a");
  a.href = canvas.toDataURL("image/png");
  a.download = filename;
  a.click();
}
