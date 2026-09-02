import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Internship Tracker",
  description: "Track internship applications, deadlines, interviews, contacts, and offers in one calm workspace.",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="light">
      <body className="antialiased">{children}</body>
    </html>
  );
}
