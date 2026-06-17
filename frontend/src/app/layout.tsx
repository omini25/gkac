import type { Metadata } from "next";
import "./globals.css";
import LayoutWrapper from "@/components/LayoutWrapper";

export const metadata: Metadata = {
  title: {
    default: "Global Kegite Archaverians Club",
    template: "%s — GKAC",
  },
  description:
    "Uniting Kegite Archaverians worldwide — fostering brotherhood, leadership, and community development since 1979.",
  icons: {
    icon: "/gkac-logo.png",
    shortcut: "/gkac-logo.png",
    apple: "/gkac-logo.png",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <LayoutWrapper>{children}</LayoutWrapper>
      </body>
    </html>
  );
}
