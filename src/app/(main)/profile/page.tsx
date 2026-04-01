"use client";

import { useSession } from "next-auth/react";
import { useTranslations } from "next-intl";
import { Card } from "@/components/ui/Card";
import { User } from "lucide-react";

export default function ProfilePage() {
  const { data: session } = useSession();
  const t = useTranslations("profile");

  if (!session) return null;

  return (
    <div className="px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-2xl">
        <h1 className="mb-8 text-2xl font-bold text-white">{t("title")}</h1>

        <Card className="space-y-6">
          <div className="flex items-center gap-4">
            {session.user.image ? (
              <img
                src={session.user.image}
                alt=""
                className="h-16 w-16 rounded-full"
              />
            ) : (
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/10">
                <User className="h-8 w-8 text-emerald-400" />
              </div>
            )}
            <div>
              <h2 className="text-lg font-semibold text-white">
                {session.user.name || "User"}
              </h2>
              <p className="text-sm text-gray-400">{session.user.email}</p>
            </div>
          </div>

          <div className="space-y-4 border-t border-white/10 pt-6">
            <div className="flex justify-between">
              <span className="text-sm text-gray-400">{t("name")}</span>
              <span className="text-sm text-white">{session.user.name || "-"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-400">{t("email")}</span>
              <span className="text-sm text-white">{session.user.email}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-400">{t("role")}</span>
              <span className="text-sm text-white capitalize">{session.user.role}</span>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
