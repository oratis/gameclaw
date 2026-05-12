import { Card } from "@/components/ui/Card";
import { AlertTriangle } from "lucide-react";

export const metadata = {
  title: "Privacy Policy · GameClaw",
};

export default function PrivacyPage() {
  return (
    <div className="px-4 py-12 sm:px-6 lg:px-8">
      <article className="mx-auto max-w-3xl prose prose-invert prose-sm">
        <h1 className="text-3xl font-bold text-white">Privacy Policy</h1>
        <p className="text-sm text-gray-500">Last updated: 2026-05-12 · Draft v1</p>

        <Card className="my-6 border-yellow-500/30 bg-yellow-500/5">
          <p className="flex items-center gap-2 text-sm text-yellow-300">
            <AlertTriangle className="h-4 w-4" />
            <strong>Draft.</strong>
          </p>
          <p className="mt-2 text-sm text-gray-300">
            This document reflects our actual data practices but has not been
            reviewed by a lawyer. We&apos;re publishing the draft so users can
            audit what we collect; legal-quality language will follow before
            public launch. Email{" "}
            <a href="mailto:privacy@gogameclaw.com" className="text-emerald-400">privacy@gogameclaw.com</a> with
            questions.
          </p>
        </Card>

        <h2>1. What we collect</h2>
        <ul>
          <li>
            <strong>Account info</strong> — email address, hashed password (for
            credentials sign-in), OAuth subject ID (for Google / Apple sign-in),
            optional display name.
          </li>
          <li>
            <strong>Game credentials you link</strong> — the cookies, tokens,
            or API keys you paste during account linking. These are encrypted
            at rest with AES-256-GCM before being written to our database. The
            decryption key lives in Google Secret Manager, not in our codebase.
          </li>
          <li>
            <strong>Task activity</strong> — records of every adapter call we
            make on your behalf: timestamp, game, capability, success/failure,
            error message, optional reward text. Used for the dashboard,
            weekly digest, and abuse / quota detection.
          </li>
          <li>
            <strong>Usage counters</strong> — monthly task and AI Planner call
            counts. Used for billing quota enforcement.
          </li>
          <li>
            <strong>Payment metadata</strong> — PayPal subscription ID, plan
            ID, payment status. <strong>We never see your card number.</strong>{" "}
            PayPal handles the entire payment surface.
          </li>
          <li>
            <strong>Demand signals</strong> — anything you submit through the{" "}
            <a href="/demand" className="text-emerald-400">/demand</a> form,
            including optional email for follow-up.
          </li>
        </ul>

        <h2>2. What we DON&apos;T collect</h2>
        <ul>
          <li>
            <strong>Your game password or PayPal password.</strong> Never. The
            game cookies you paste are session tokens, not credentials.
          </li>
          <li>
            <strong>Card numbers</strong> — see above.
          </li>
          <li>
            <strong>Cross-site tracking pixels / Facebook SDK / Google
            Analytics</strong> — we don&apos;t use them. Cloud Run + first-party
            cookies only.
          </li>
          <li>
            <strong>Your in-game chat or social-graph data.</strong> We only
            touch the public BBS-side APIs and signin / redeem endpoints.
          </li>
        </ul>

        <h2>3. How we use it</h2>
        <ul>
          <li>To execute the daily reward / BBS / planner tasks you ask us to run.</li>
          <li>To enforce monthly task and AI Planner quotas per your subscription tier.</li>
          <li>To detect anomalies (high failure rate per vendor → automatic circuit-breaker open) and protect your account from suspicious automation patterns.</li>
          <li>To generate optional weekly digests (Markdown report rendered in your dashboard) summarizing what we did for you.</li>
          <li>To respond to <code>/demand</code> submissions you opt in to.</li>
        </ul>

        <h2>4. How we protect it</h2>
        <ul>
          <li><strong>Encryption at rest</strong> — AES-256-GCM for every credential row.</li>
          <li><strong>HTTPS-only in transit</strong> — TLS terminated at Google Frontend; the service certificate is managed by Google.</li>
          <li><strong>Secret Manager</strong> — all service-side keys (database password, NextAuth signing secret, encryption master key, PayPal client secret, Anthropic API key) are mounted from Google Secret Manager via <code>secretKeyRef</code>; they never appear in env-var dumps or container images.</li>
          <li><strong>Least-privilege IAM</strong> — the Cloud Run service account can only read secrets it&apos;s explicitly granted, not the whole project.</li>
        </ul>

        <h2>5. Third parties</h2>
        <p>
          We share data with these processors only as needed:
        </p>
        <ul>
          <li><strong>Anthropic</strong> — the AI Planner and weekly Reporter send your prompt and your account list (game slugs + UIDs, no credentials) to Claude. Anthropic does not train on our API traffic.</li>
          <li><strong>PayPal</strong> — billing subscription state. PayPal receives your email and the GameClaw subscription tier identifier.</li>
          <li><strong>Google Cloud</strong> — our infrastructure provider (Cloud Run, Cloud SQL, Secret Manager).</li>
          <li><strong>Game vendors you connect</strong> — HoYoverse, Kurogames, Hypergryph. We call their public web APIs on your behalf with your provided credentials.</li>
        </ul>

        <h2>6. Your rights</h2>
        <ul>
          <li>
            <strong>Export</strong> — email{" "}
            <a href="mailto:privacy@gogameclaw.com" className="text-emerald-400">privacy@gogameclaw.com</a> and we&apos;ll
            send you a JSON of everything tied to your account within 30 days.
          </li>
          <li><strong>Delete</strong> — request deletion of your account and all linked data via the same email. We&apos;ll wipe within 30 days. PayPal subscription records that we&apos;re legally required to retain are kept for the period mandated by applicable tax law (typically 7 years) but anonymized — the link from PayPal ID to your email is severed.</li>
          <li><strong>Re-link</strong> — you can unlink a game at any time from the dashboard. The encrypted credential row is deleted immediately.</li>
        </ul>

        <h2>7. Game vendor ToS</h2>
        <p>
          GameClaw automates daily check-ins and other low-risk web tasks that
          most game vendors tolerate. <strong>We do NOT</strong> automate PvP
          play, account leveling, or anything that violates a game vendor&apos;s
          terms of service. By linking your game account, you accept that you
          are responsible for compliance with that vendor&apos;s ToS; we make a
          best-effort attempt to stay within the lines but cannot guarantee
          immunity from vendor action.
        </p>

        <h2>8. Children</h2>
        <p>
          GameClaw is not directed at children under 13. If you believe we
          have collected data from a minor, email
          {" "}<a href="mailto:privacy@gogameclaw.com" className="text-emerald-400">privacy@gogameclaw.com</a> and we&apos;ll delete it.
        </p>

        <h2>9. Changes</h2>
        <p>
          We&apos;ll update this page when our practices change and email
          notification to active subscribers. Material changes are flagged with
          a banner in the dashboard for 30 days.
        </p>

        <h2>10. Contact</h2>
        <p>
          Email{" "}
          <a href="mailto:privacy@gogameclaw.com" className="text-emerald-400">privacy@gogameclaw.com</a>.
        </p>
      </article>
    </div>
  );
}
