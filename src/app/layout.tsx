import type { Metadata, Viewport } from "next";
import "./globals.css";
import { PWARegister } from "@/components/PWARegister";

export const metadata: Metadata = {
  title: "Madrasati — School Manager",
  description: "Simple school management for parents, students, and staff.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    title: "Madrasati",
    statusBarStyle: "default",
  },
  icons: {
    icon: "/icons/icon-192.svg",
    apple: "/icons/icon-192.svg",
  },
};

export const viewport: Viewport = {
  themeColor: "#3563ff",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fr">
      <body className="min-h-dvh bg-slate-50 text-slate-900">
        {children}
        <PWARegister />
      </body>
    </html>
  );
}
