import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { getLocale, getMessages } from "next-intl/server";
import { Providers } from "./providers";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "GameClaw - Automate Your Daily Gaming Rewards",
    template: "%s | GameClaw",
  },
  description:
    "Never miss a daily check-in again. GameClaw automatically claims your HoYoLAB rewards for Genshin Impact, Honkai Star Rail, Zenless Zone Zero, and more.",
  keywords: [
    "GameClaw",
    "HoYoLAB",
    "daily check-in",
    "Genshin Impact",
    "Honkai Star Rail",
    "Zenless Zone Zero",
    "auto check-in",
    "game rewards",
    "OpenClaw",
  ],
  authors: [{ name: "GameClaw" }],
  openGraph: {
    title: "GameClaw - Automate Your Daily Gaming Rewards",
    description:
      "Never miss a daily check-in again. Auto-claim HoYoLAB rewards for all HoYoverse games.",
    url: "https://gogameclaw.com",
    siteName: "GameClaw",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "GameClaw - Automate Your Daily Gaming Rewards",
    description:
      "Never miss a daily check-in again. Auto-claim HoYoLAB rewards for all HoYoverse games.",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const locale = await getLocale();
  const messages = await getMessages();

  return (
    <html
      lang={locale}
      className={`${geistSans.variable} ${geistMono.variable} dark`}
    >
      <body className="min-h-screen bg-gray-950 text-white antialiased">
        <Providers locale={locale} messages={messages as Record<string, unknown>}>
          <div className="flex min-h-screen flex-col">
            <Header />
            <main className="flex-1">{children}</main>
            <Footer />
          </div>
        </Providers>
      </body>
    </html>
  );
}
