import type { Metadata } from "next";

import "./globals.css";

export const metadata: Metadata = {
  title: "Framedl by ds8",
  description: "Wordle in a frame",
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
