import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { headers } from "next/headers";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#f4f1e9",
};

export async function generateMetadata(): Promise<Metadata> {
  const requestHeaders = await headers();
  const host = requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host") ?? "localhost:3000";
  const protocol = requestHeaders.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  const imageUrl = `${protocol}://${host}/og-joelix.png`;

  return {
    title: "Joelix Video Game - Level Up Your Life",
    description: "A connected pixel life RPG with coins, XP, USDA nutrition, wellness tracking, reminders, and The Best coach.",
    applicationName: "Joelix Video Game",
    manifest: "/manifest.webmanifest",
    appleWebApp: {
      capable: true,
      title: "Joelix Video Game",
      statusBarStyle: "default",
    },
    icons: {
      icon: [
        { url: "/app-icon-192.png", sizes: "192x192", type: "image/png" },
        { url: "/app-icon-512.png", sizes: "512x512", type: "image/png" },
      ],
      apple: [{ url: "/app-icon-192.png", sizes: "192x192", type: "image/png" }],
    },
    openGraph: {
      title: "Joelix Video Game - Level Up Your Life",
      description: "Move. Earn. Unlock. Turn real life into a three-coin RPG.",
      type: "website",
      images: [{ url: imageUrl, width: 1536, height: 1024, alt: "Joelix Video Game - Level Up Your Life" }],
    },
    twitter: {
      card: "summary_large_image",
      title: "Joelix Video Game - Level Up Your Life",
      description: "Move. Earn. Unlock. Turn real life into a three-coin RPG.",
      images: [imageUrl],
    },
  };
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `window.__joelixInstallPrompt=null;window.addEventListener('beforeinstallprompt',function(e){e.preventDefault();window.__joelixInstallPrompt=e;window.dispatchEvent(new Event('joelix-install-ready'));});window.addEventListener('appinstalled',function(){window.__joelixInstallPrompt=null;});`,
          }}
        />
      </head>
      <body className={`${geistSans.variable} ${geistMono.variable}`}>{children}</body>
    </html>
  );
}
