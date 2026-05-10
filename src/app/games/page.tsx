import { getTranslations } from "next-intl/server";
import { Card } from "@/components/ui/Card";
import { listAdapters } from "@/adapters";
import type { GameAdapter } from "@/adapters/types";

const VENDOR_LABEL: Record<string, string> = {
  hoyoverse: "HoYoLAB · 米游社",
  kuro: "Kurogames · 库街区",
  hypergryph: "Hypergryph · 森空岛",
};

const VENDOR_ACCENT: Record<string, string> = {
  hoyoverse: "#4ECDC4",
  kuro: "#A78BFA",
  hypergryph: "#FBBF24",
};

export default async function GamesPage() {
  const t = await getTranslations("games");
  const adapters = listAdapters();

  const byVendor: Record<string, GameAdapter[]> = {};
  for (const a of adapters) {
    (byVendor[a.vendor] ??= []).push(a);
  }
  const vendorOrder = ["hoyoverse", "kuro", "hypergryph"];

  return (
    <div className="px-4 py-16 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-12 text-center">
          <h1 className="text-3xl font-bold text-white sm:text-4xl">
            {t("title")}
          </h1>
          <p className="mt-4 text-lg text-gray-400">
            {t("subtitleCount", { count: adapters.length })}
          </p>
        </div>

        <div className="space-y-12">
          {vendorOrder.map((vendor) => {
            const list = byVendor[vendor];
            if (!list || list.length === 0) return null;
            const accent = VENDOR_ACCENT[vendor] ?? "#9CA3AF";
            return (
              <div key={vendor}>
                <div className="mb-4 flex items-center gap-3 border-b border-white/10 pb-3">
                  <span
                    className="h-2.5 w-2.5 rounded-full"
                    style={{ backgroundColor: accent }}
                  />
                  <h2 className="text-base font-semibold text-white">
                    {VENDOR_LABEL[vendor] ?? vendor}
                  </h2>
                  <span className="text-xs text-gray-500">
                    {list.length} {t("gamesUnit")}
                  </span>
                </div>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {list.map((a) => (
                    <Card key={a.slug}>
                      <div className="flex items-start gap-3">
                        <div
                          className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl text-xl font-bold"
                          style={{
                            backgroundColor: accent + "20",
                            color: accent,
                          }}
                        >
                          {a.displayName[0]}
                        </div>
                        <div className="min-w-0 flex-1">
                          <h3 className="truncate text-base font-semibold text-white">
                            {a.displayName}
                          </h3>
                          <p className="font-mono text-xs text-gray-500">
                            {a.slug}
                          </p>
                        </div>
                      </div>
                      <div className="mt-4">
                        <p className="mb-2 text-[11px] font-medium uppercase tracking-wide text-gray-500">
                          {t("capabilities")}
                        </p>
                        <div className="flex flex-wrap gap-1.5">
                          {a.capabilities.map((c) => (
                            <span
                              key={c}
                              className="rounded bg-white/5 px-2 py-0.5 text-xs text-gray-300"
                            >
                              {c}
                            </span>
                          ))}
                        </div>
                      </div>
                      <div className="mt-3 flex flex-wrap gap-1.5">
                        <span className="rounded bg-white/5 px-2 py-0.5 text-[11px] text-gray-400">
                          auth: {a.authMethod}
                        </span>
                      </div>
                    </Card>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
