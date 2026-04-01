"use client";

import { useTranslations } from "next-intl";
import { Card } from "@/components/ui/Card";

export default function ApiDocsPage() {
  const t = useTranslations("docs");

  const endpoints = [
    { method: "GET", path: "/api/games", desc: "List all supported games", auth: false },
    { method: "POST", path: "/api/auth/register", desc: "Register a new account", auth: false },
    { method: "GET", path: "/api/user/accounts", desc: "List linked game accounts", auth: true },
    { method: "POST", path: "/api/user/accounts", desc: "Link a new game account", auth: true },
    { method: "PUT", path: "/api/user/accounts/:id", desc: "Update a linked account", auth: true },
    { method: "DELETE", path: "/api/user/accounts/:id", desc: "Unlink a game account", auth: true },
    { method: "POST", path: "/api/checkin", desc: "Check in all linked accounts", auth: true },
    { method: "POST", path: "/api/checkin/:gameId", desc: "Check in for a specific game", auth: true },
    { method: "GET", path: "/api/checkin/history", desc: "Get check-in history", auth: true },
    { method: "GET", path: "/api/games/:gameId/status", desc: "Get game account status", auth: true },
    { method: "POST", path: "/api/agent", desc: "Agent-facing API for skill", auth: true },
  ];

  return (
    <div className="px-4 py-16 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-4xl">
        <h1 className="mb-8 text-3xl font-bold text-white">{t("apiTitle")}</h1>

        <section className="mb-12">
          <h2 className="mb-4 text-xl font-semibold text-white">{t("authentication")}</h2>
          <Card>
            <p className="mb-4 text-sm text-gray-300">
              Most API endpoints require authentication. Include your session cookie or use the NextAuth session.
              For programmatic access, use the agent API endpoint with an API key.
            </p>
            <pre className="overflow-x-auto rounded-lg bg-black/30 p-4 text-sm text-gray-300">
              <code>{`# Using session cookie (browser)
fetch('/api/checkin', {
  method: 'POST',
  credentials: 'include'
})

# Using agent API
POST /api/agent
Content-Type: application/json

{
  "action": "checkin",
  "gameId": "genshin"
}`}</code>
            </pre>
          </Card>
        </section>

        <section>
          <h2 className="mb-4 text-xl font-semibold text-white">{t("endpoints")}</h2>
          <div className="overflow-hidden rounded-xl border border-white/10">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/10 bg-white/5">
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-400">Method</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-400">Endpoint</th>
                  <th className="hidden px-4 py-3 text-left text-sm font-medium text-gray-400 sm:table-cell">Description</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-400">Auth</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {endpoints.map((ep) => (
                  <tr key={ep.path + ep.method} className="hover:bg-white/[0.02]">
                    <td className="px-4 py-3">
                      <span className={`rounded px-2 py-0.5 text-xs font-mono font-medium ${
                        ep.method === "GET" ? "bg-blue-500/10 text-blue-400" :
                        ep.method === "POST" ? "bg-emerald-500/10 text-emerald-400" :
                        ep.method === "PUT" ? "bg-yellow-500/10 text-yellow-400" :
                        "bg-red-500/10 text-red-400"
                      }`}>
                        {ep.method}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm font-mono text-white">{ep.path}</td>
                    <td className="hidden px-4 py-3 text-sm text-gray-400 sm:table-cell">{ep.desc}</td>
                    <td className="px-4 py-3 text-sm text-gray-400">{ep.auth ? "Yes" : "No"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="mt-12">
          <h2 className="mb-4 text-xl font-semibold text-white">{t("examples")}</h2>
          <div className="space-y-6">
            <Card>
              <h3 className="mb-3 text-sm font-semibold text-white">Link a Game Account</h3>
              <pre className="overflow-x-auto rounded-lg bg-black/30 p-4 text-sm text-gray-300">
                <code>{`POST /api/user/accounts
Content-Type: application/json

{
  "gameId": "genshin",
  "ltokenV2": "v2_CAISDG...",
  "ltuidV2": "123456789"
}

// Response
{
  "account": {
    "id": "clx...",
    "gameId": "genshin",
    "uid": "800000001",
    "nickname": "Traveler"
  }
}`}</code>
              </pre>
            </Card>

            <Card>
              <h3 className="mb-3 text-sm font-semibold text-white">Trigger Check-in</h3>
              <pre className="overflow-x-auto rounded-lg bg-black/30 p-4 text-sm text-gray-300">
                <code>{`POST /api/checkin
Content-Type: application/json

// Response
{
  "results": [
    {
      "gameId": "genshin",
      "status": "success",
      "message": "Successfully checked in for Genshin Impact"
    },
    {
      "gameId": "starrail",
      "status": "already_claimed",
      "message": "Already checked in today for Honkai: Star Rail"
    }
  ]
}`}</code>
              </pre>
            </Card>
          </div>
        </section>
      </div>
    </div>
  );
}
