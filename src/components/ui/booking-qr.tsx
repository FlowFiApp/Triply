"use client";

import QRCode from "react-qr-code";

export default function BookingQR({
  value,
  size = 120,
}: {
  value: string;
  size?: number;
}) {
  return (
    <div className="flex items-center justify-center rounded-lg bg-white p-2">
      <QRCode value={value} size={size} />
    </div>
  );
}