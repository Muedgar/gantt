import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Simple Gantt Chart",
  description: "A simple movable Gantt chart built with Next.js.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
