import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Blockchain Security Scanner",
  description: "Scan smart contracts for risks",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-black text-white">{children}</body>
    </html>
  );
}