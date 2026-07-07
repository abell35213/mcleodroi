import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "McLeod ROI Builder",
  description: "Local-first business impact analysis builder for McLeod Software sales teams.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
