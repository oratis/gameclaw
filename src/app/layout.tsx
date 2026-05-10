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
    default: "GameClaw — AI 游戏代练 · Universal AI Game Boost",
    template: "%s | GameClaw",
  },
  description:
    "GameClaw is the AI agent that plays the boring parts of every game for you. Daily check-ins today, dailies and dungeons tomorrow. Cross-vendor: HoYoverse, 米游社, Kurogames, Hypergryph, and more.",
  keywords: [
    "GameClaw",
    "AI 代练",
    "AI game boost",
    "auto checkin",
    "daily reward automation",
    "Genshin Impact",
    "Honkai Star Rail",
    "Zenless Zone Zero",
    "Wuthering Waves",
    "鸣潮",
    "Arknights",
    "明日方舟",
    "米游社",
    "HoYoLAB",
    "OpenClaw skill",
  ],
  authors: [{ name: "GameClaw" }],
  openGraph: {
    title: "GameClaw — AI 游戏代练 · Universal AI Game Boost",
    description:
      "AI plays the boring parts. Daily check-ins across 10+ games today; dailies, stamina, and dungeons next.",
    url: "https://gogameclaw.com",
    siteName: "GameClaw",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "GameClaw — AI 游戏代练",
    description:
      "AI plays the boring parts. 10+ games. Daily check-ins today, dailies and dungeons next.",
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
