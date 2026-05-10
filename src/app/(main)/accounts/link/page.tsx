"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { AlertCircle, CheckCircle2 } from "lucide-react";

interface CredentialField {
  key: string;
  label: string;
  required: boolean;
  sensitive: boolean;
}

interface AdapterMeta {
  slug: string;
  vendor: string;
  displayName: string;
  authMethod: "cookie" | "oauth" | "token";
  capabilities: string[];
  credentialFields: CredentialField[];
}

const VENDOR_GUIDE: Record<string, { title: string; steps: string }> = {
  hoyoverse: {
    title: "How to get HoYoLAB / 米游社 cookies",
    steps:
      "1. Visit hoyolab.com (国际服) or miyoushe.com (国服) and log in\n" +
      "2. Press F12 → Application → Cookies\n" +
      "3. Copy each required cookie value listed above",
  },
  kuro: {
    title: "How to get your Kurobbs token (库街区)",
    steps:
      "1. Open the 库街区 app on Android\n" +
      "2. Use a packet-capture tool (e.g. HttpCanary) on api.kurobbs.com\n" +
      "3. Find the `token` request header — that JWT is your token\n" +
      "4. Or: visit https://www.kurobbs.com on web, log in, and copy `user_token` cookie",
  },
};

export default function LinkAccountPage() {
  const t = useTranslations("accounts");
  const router = useRouter();
  const [adapters, setAdapters] = useState<AdapterMeta[]>([]);
  const [loadingAdapters, setLoadingAdapters] = useState(true);
  const [gameId, setGameId] = useState("");
  const [fieldValues, setFieldValues] = useState<Record<string, string>>({});
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/adapters")
      .then((r) => r.json())
      .then((data) => {
        if (!cancelled && data?.adapters) {
          setAdapters(data.adapters);
        }
      })
      .finally(() => {
        if (!cancelled) setLoadingAdapters(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const selectedAdapter = useMemo(
    () => adapters.find((a) => a.slug === gameId) ?? null,
    [adapters, gameId]
  );

  const guide = selectedAdapter ? VENDOR_GUIDE[selectedAdapter.vendor] : null;

  function handleGameChange(slug: string) {
    setGameId(slug);
    setFieldValues({});
    setError("");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedAdapter) return;
    setError("");
    setSubmitting(true);

    // Drop empty optional fields so we don't pollute the encrypted blob.
    const credentials: Record<string, string> = {};
    for (const f of selectedAdapter.credentialFields) {
      const v = (fieldValues[f.key] ?? "").trim();
      if (v) credentials[f.key] = v;
    }

    try {
      const res = await fetch("/api/user/accounts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ gameId, credentials }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || t("linkError"));
      } else {
        setSuccess(true);
        setTimeout(() => router.push("/accounts"), 1500);
      }
    } catch {
      setError(t("linkError"));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-2xl">
        <h1 className="mb-2 text-2xl font-bold text-white">{t("linkTitle")}</h1>
        <p className="mb-8 text-gray-400">{t("linkDesc")}</p>

        {success ? (
          <Card className="flex flex-col items-center py-12 text-center">
            <CheckCircle2 className="mb-4 h-12 w-12 text-emerald-400" />
            <p className="text-lg font-semibold text-white">{t("linkSuccess")}</p>
          </Card>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="flex items-center gap-2 rounded-lg bg-red-500/10 px-4 py-3 text-sm text-red-400">
                <AlertCircle className="h-4 w-4 shrink-0" />
                {error}
              </div>
            )}

            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-gray-300">
                {t("selectGame")}
              </label>
              <select
                value={gameId}
                onChange={(e) => handleGameChange(e.target.value)}
                required
                disabled={loadingAdapters}
                className="flex h-10 w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              >
                <option value="" className="bg-gray-900">
                  {loadingAdapters ? "..." : "--"}
                </option>
                {adapters.map((a) => (
                  <option key={a.slug} value={a.slug} className="bg-gray-900">
                    {a.displayName} ({a.vendor})
                  </option>
                ))}
              </select>
            </div>

            {selectedAdapter && (
              <>
                {selectedAdapter.credentialFields.map((f) => (
                  <Input
                    key={f.key}
                    id={f.key}
                    label={f.label + (f.required ? "" : " (optional)")}
                    type={f.sensitive ? "password" : "text"}
                    value={fieldValues[f.key] ?? ""}
                    onChange={(e) =>
                      setFieldValues((prev) => ({ ...prev, [f.key]: e.target.value }))
                    }
                    required={f.required}
                  />
                ))}

                {guide && (
                  <Card className="bg-blue-500/5 border-blue-500/20">
                    <h3 className="mb-2 text-sm font-semibold text-blue-400">
                      {guide.title}
                    </h3>
                    <p className="whitespace-pre-line text-sm text-gray-400">
                      {guide.steps}
                    </p>
                  </Card>
                )}
              </>
            )}

            <Button
              type="submit"
              className="w-full"
              disabled={submitting || !selectedAdapter}
            >
              {submitting ? "..." : t("linkNew")}
            </Button>
          </form>
        )}
      </div>
    </div>
  );
}
