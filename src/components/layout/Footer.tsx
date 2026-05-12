"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { Gamepad2 } from "lucide-react";

export function Footer() {
  const t = useTranslations("footer");

  return (
    <footer className="border-t border-white/10 bg-gray-950">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="flex flex-col items-center justify-between gap-6 md:flex-row">
          <div className="flex items-center gap-2 text-lg font-bold text-white">
            <Gamepad2 className="h-5 w-5 text-emerald-400" />
            <span>GameClaw</span>
          </div>

          <nav className="flex flex-wrap items-center justify-center gap-6">
            <Link href="/docs" className="text-sm text-gray-400 transition-colors hover:text-white">
              {t("docs")}
            </Link>
            <a
              href="https://github.com/oratis/gameclaw"
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-gray-400 transition-colors hover:text-white"
            >
              {t("github")}
            </a>
            <Link href="/privacy" className="text-sm text-gray-400 transition-colors hover:text-white">
              {t("privacy")}
            </Link>
            <Link href="/terms" className="text-sm text-gray-400 transition-colors hover:text-white">
              {t("terms")}
            </Link>
          </nav>
        </div>

        <div className="mt-8 border-t border-white/5 pt-8 text-center">
          <p className="text-sm text-gray-500">
            &copy; {new Date().getFullYear()} {t("copyright")}
          </p>
        </div>
      </div>
    </footer>
  );
}
