"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { OAuthButtons } from "./OAuthButtons";
import Link from "next/link";

export function SignUpForm() {
  const t = useTranslations("auth");
  const tCommon = useTranslations("common");
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (password !== confirmPassword) {
      setError(t("passwordMismatch"));
      return;
    }

    setLoading(true);

    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, password }),
    });

    const data = await res.json();
    setLoading(false);

    if (!res.ok) {
      setError(data.error);
    } else {
      router.push("/signin?registered=true");
    }
  }

  return (
    <div className="w-full max-w-md space-y-6">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-white">{t("signUpTitle")}</h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="rounded-lg bg-red-500/10 px-4 py-3 text-sm text-red-400">
            {error}
          </div>
        )}

        <Input
          id="name"
          type="text"
          label={tCommon("profile")}
          placeholder="Your name"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />

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
          minLength={8}
        />

        <Input
          id="confirmPassword"
          type="password"
          label={t("confirmPassword")}
          placeholder="********"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          required
        />

        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? tCommon("loading") : tCommon("signUp")}
        </Button>
      </form>

      <OAuthButtons />

      <p className="text-center text-sm text-gray-400">
        {t("hasAccount")}{" "}
        <Link href="/signin" className="text-emerald-400 hover:text-emerald-300">
          {tCommon("signIn")}
        </Link>
      </p>
    </div>
  );
}
