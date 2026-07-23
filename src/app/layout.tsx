import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "KickData — Free Football Data API",
  description:
    "A free football data API with free leagues and Pro subscription tiers for more leagues and advanced data.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
