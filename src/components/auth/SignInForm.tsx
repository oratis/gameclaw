"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { OAuthButtons } from "./OAuthButtons";
import { TurnstileWidget } from "./TurnstileWidget";
import Link from "next/link";

export function SignInForm() {
  const t = useTranslations("auth");
  const tCommon = useTranslations("common");
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);

  const captchaRequired = !!process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (captchaRequired && !turnstileToken) {
      setError("Please complete the CAPTCHA");
      return;
    }

    setLoading(true);

    const result = await signIn("credentials", {
      email,
      password,
      turnstileToken: turnstileToken ?? "",
      redirect: false,
    });

    setLoading(false);

    if (result?.error) {
      setError(t("invalidCredentials"));
    } else {
      router.push("/dashboard");
      router.refresh();
    }
  }

  return (
    <div className="w-full max-w-md space-y-6">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-white">{t("signInTitle")}</h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="rounded-lg bg-red-500/10 px-4 py-3 text-sm text-red-400">
            {error}
          </div>
        )}

        <Input
          id="email"
          type="email"
          label={t("email")}
          placeholder="you@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />

        <Input
          id="password"
          type="password"
          label={t("password")}
          placeholder="********"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />

        <TurnstileWidget
          onToken={(tok) => setTurnstileToken(tok)}
          onExpire={() => setTurnstileToken(null)}
        />

        <Button
          type="submit"
          className="w-full"
          disabled={loading || (captchaRequired && !turnstileToken)}
        >
          {loading ? tCommon("loading") : tCommon("signIn")}
        </Button>
      </form>

      <OAuthButtons />

      <p className="text-center text-sm text-gray-400">
        {t("noAccount")}{" "}
        <Link href="/signup" className="text-emerald-400 hover:text-emerald-300">
          {tCommon("signUp")}
        </Link>
      </p>
    </div>
  );
}
