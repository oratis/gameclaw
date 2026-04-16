"use client";

import Link from "next/link";
import { useSession, signOut } from "next-auth/react";
import { useTranslations } from "next-intl";
import { Menu, X, Gamepad2 } from "lucide-react";
import { useState } from "react";
import { LanguageSwitcher } from "./LanguageSwitcher";

export function Header() {
  const { data: session } = useSession();
  const t = useTranslations("common");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 w-full border-b border-white/10 bg-gray-950/80 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link href="/" className="flex items-center gap-2 text-xl font-bold text-white">
          <Gamepad2 className="h-7 w-7 text-emerald-400" />
          <span>GameClaw</span>
        </Link>

        <nav className="hidden items-center gap-6 md:flex">
          <Link href="/games" className="text-sm text-gray-300 transition-colors hover:text-white">
            {t("games")}
          </Link>
          <Link href="/docs" className="text-sm text-gray-300 transition-colors hover:text-white">
            {t("docs")}
          </Link>
          {session ? (
            <>
              <Link href="/dashboard" className="text-sm text-gray-300 transition-colors hover:text-white">
                {t("dashboard")}
              </Link>
              <button
                onClick={() => signOut()}
                className="text-sm text-gray-300 transition-colors hover:text-white"
              >
                {t("signOut")}
              </button>
            </>
          ) : (
            <>
              <Link
                href="/signin"
                className="text-sm text-gray-300 transition-colors hover:text-white"
              >
                {t("signIn")}
              </Link>
              <Link
                href="/signup"
                className="rounded-lg bg-emerald-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-emerald-600"
              >
                {t("signUp")}
              </Link>
            </>
          )}
          <LanguageSwitcher />
        </nav>

        <button
          className="md:hidden text-white"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
          aria-expanded={mobileMenuOpen}
        >
          {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </div>

      {mobileMenuOpen && (
        <div className="border-t border-white/10 bg-gray-950 md:hidden">
          <div className="flex flex-col gap-2 p-4">
            <Link href="/games" className="rounded-lg px-3 py-2 text-sm text-gray-300 hover:bg-white/5 hover:text-white" onClick={() => setMobileMenuOpen(false)}>
              {t("games")}
            </Link>
            <Link href="/docs" className="rounded-lg px-3 py-2 text-sm text-gray-300 hover:bg-white/5 hover:text-white" onClick={() => setMobileMenuOpen(false)}>
              {t("docs")}
            </Link>
            {session ? (
              <>
                <Link href="/dashboard" className="rounded-lg px-3 py-2 text-sm text-gray-300 hover:bg-white/5 hover:text-white" onClick={() => setMobileMenuOpen(false)}>
                  {t("dashboard")}
                </Link>
                <button
                  onClick={() => { signOut(); setMobileMenuOpen(false); }}
                  className="rounded-lg px-3 py-2 text-left text-sm text-gray-300 hover:bg-white/5 hover:text-white"
                >
                  {t("signOut")}
                </button>
              </>
            ) : (
              <>
                <Link href="/signin" className="rounded-lg px-3 py-2 text-sm text-gray-300 hover:bg-white/5 hover:text-white" onClick={() => setMobileMenuOpen(false)}>
                  {t("signIn")}
                </Link>
                <Link href="/signup" className="rounded-lg bg-emerald-500 px-3 py-2 text-center text-sm font-medium text-white hover:bg-emerald-600" onClick={() => setMobileMenuOpen(false)}>
                  {t("signUp")}
                </Link>
              </>
            )}
            <div className="mt-2 border-t border-white/10 pt-2">
              <LanguageSwitcher />
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
