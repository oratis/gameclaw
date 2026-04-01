"use client";

import { useTranslations } from "next-intl";
import { Card } from "@/components/ui/Card";

export default function SkillDocsPage() {
  const t = useTranslations("docs");

  return (
    <div className="px-4 py-16 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-4xl">
        <h1 className="mb-8 text-3xl font-bold text-white">{t("skillTitle")}</h1>

        <div className="space-y-8">
          <section>
            <h2 className="mb-4 text-xl font-semibold text-white">{t("installation")}</h2>
            <Card>
              <pre className="overflow-x-auto text-sm text-gray-300">
                <code>{`# Install via ClawHub
clawhub install gameclaw

# Or manually copy to your skills directory
git clone https://github.com/gameclaw/gameclaw
cp -r gameclaw/gameclaw_skill ~/.claude/skills/gameclaw`}</code>
              </pre>
            </Card>
          </section>

          <section>
            <h2 className="mb-4 text-xl font-semibold text-white">{t("quickStart")}</h2>
            <Card>
              <pre className="overflow-x-auto text-sm text-gray-300">
                <code>{`# Check in to all games
/gameclaw checkin all

# Check in to a specific game
/gameclaw checkin genshin

# Check account status
/gameclaw status genshin

# List supported games
/gameclaw games`}</code>
              </pre>
            </Card>
          </section>

          <section>
            <h2 className="mb-4 text-xl font-semibold text-white">{t("cookieGuide")}</h2>
            <Card className="space-y-4">
              <p className="text-gray-300">
                To use GameClaw, you need to provide your HoYoLAB cookies. Here&apos;s how to get them:
              </p>
              <ol className="list-decimal space-y-3 pl-6 text-sm text-gray-300">
                <li>Visit <a href="https://www.hoyolab.com" target="_blank" rel="noopener noreferrer" className="text-emerald-400 hover:underline">hoyolab.com</a> and log in to your account</li>
                <li>Press <kbd className="rounded bg-white/10 px-1.5 py-0.5 text-xs">F12</kbd> to open Developer Tools</li>
                <li>Go to the <strong>Application</strong> tab (Chrome) or <strong>Storage</strong> tab (Firefox)</li>
                <li>Click on <strong>Cookies</strong> &rarr; <strong>https://www.hoyolab.com</strong></li>
                <li>Find and copy the values of <code className="rounded bg-white/10 px-1.5 py-0.5 text-xs text-emerald-400">ltoken_v2</code> and <code className="rounded bg-white/10 px-1.5 py-0.5 text-xs text-emerald-400">ltuid_v2</code></li>
              </ol>
            </Card>
          </section>

          <section>
            <h2 className="mb-4 text-xl font-semibold text-white">Supported Games</h2>
            <div className="overflow-hidden rounded-xl border border-white/10">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-white/10 bg-white/5">
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-400">Game</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-400">Slug</th>
                    <th className="hidden px-4 py-3 text-left text-sm font-medium text-gray-400 sm:table-cell">Features</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {[
                    { name: "Genshin Impact", slug: "genshin", features: "Check-in, Resin tracking" },
                    { name: "Honkai: Star Rail", slug: "starrail", features: "Check-in, Power tracking" },
                    { name: "Zenless Zone Zero", slug: "zzz", features: "Check-in, Battery tracking" },
                    { name: "Honkai Impact 3rd", slug: "honkai3rd", features: "Check-in" },
                    { name: "Tears of Themis", slug: "tears", features: "Check-in" },
                  ].map((g) => (
                    <tr key={g.slug} className="hover:bg-white/[0.02]">
                      <td className="px-4 py-3 text-sm text-white">{g.name}</td>
                      <td className="px-4 py-3 text-sm"><code className="text-emerald-400">{g.slug}</code></td>
                      <td className="hidden px-4 py-3 text-sm text-gray-400 sm:table-cell">{g.features}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
