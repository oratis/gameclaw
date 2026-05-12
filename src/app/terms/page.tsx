import { Card } from "@/components/ui/Card";
import { AlertTriangle } from "lucide-react";

export const metadata = {
  title: "Terms of Service · GameClaw",
};

export default function TermsPage() {
  return (
    <div className="px-4 py-12 sm:px-6 lg:px-8">
      <article className="mx-auto max-w-3xl prose prose-invert prose-sm">
        <h1 className="text-3xl font-bold text-white">Terms of Service</h1>
        <p className="text-sm text-gray-500">Last updated: 2026-05-12 · Draft v1</p>

        <Card className="my-6 border-yellow-500/30 bg-yellow-500/5">
          <p className="flex items-center gap-2 text-sm text-yellow-300">
            <AlertTriangle className="h-4 w-4" />
            <strong>Draft.</strong>
          </p>
          <p className="mt-2 text-sm text-gray-300">
            These terms are pending legal review. They reflect our actual
            operational posture but should not be relied on as legal advice.
            Email{" "}
            <a href="mailto:legal@gogameclaw.com" className="text-emerald-400">legal@gogameclaw.com</a> with
            disputes.
          </p>
        </Card>

        <h2>1. What GameClaw is</h2>
        <p>
          GameClaw is an open-source automation platform that performs daily
          rewards, BBS forum signin, gift-code redemption, and AI-planned task
          orchestration on game accounts you link to it. You provide your
          game-account session tokens or cookies; we automate the public web
          APIs those vendors expose.
        </p>

        <h2>2. Your responsibilities</h2>
        <ul>
          <li>You must own the game accounts you link, or have explicit permission to operate them.</li>
          <li>You agree to comply with each game vendor&apos;s ToS. Most vendors permit daily check-in automation; some prohibit broader automation. GameClaw&apos;s capability tiering reflects our best understanding of those limits, but you bear the final responsibility.</li>
          <li>You must not use GameClaw to: automate PvP gameplay, level accounts for resale, abuse exploits, or perform any activity prohibited by the game vendor.</li>
          <li>You must keep your GameClaw account credentials secure. Treat your sign-in like a password manager — anyone with access can run tasks on your behalf.</li>
        </ul>

        <h2>3. Our responsibilities</h2>
        <ul>
          <li>Encrypted-at-rest storage of every credential you provide (AES-256-GCM).</li>
          <li>Best-effort uptime and timely execution of the tasks you schedule.</li>
          <li>Adherence to the quota and entitlement we sell you (see <a href="/pricing" className="text-emerald-400">/pricing</a>).</li>
          <li>Honest, accurate billing — your tier and usage are visible in <a href="/settings/billing" className="text-emerald-400">/settings/billing</a> at all times.</li>
          <li>Reasonable security practices for our infrastructure (see <a href="/privacy" className="text-emerald-400">Privacy Policy</a>).</li>
        </ul>

        <h2>4. Subscriptions and billing</h2>
        <ul>
          <li>Billing is monthly via PayPal subscriptions. Cancel any time; access continues through the end of the paid period.</li>
          <li>Quotas reset on the 1st of each calendar month UTC.</li>
          <li>If a payment fails, your tier drops to Free at the start of the next billing cycle. Linked accounts and saved templates are preserved.</li>
          <li>We do not pro-rate refunds for partial months. If you believe you were billed in error, contact <a href="mailto:billing@gogameclaw.com" className="text-emerald-400">billing@gogameclaw.com</a>.</li>
        </ul>

        <h2>5. Account suspension / termination</h2>
        <p>
          We may suspend or terminate your access if we have reason to believe
          you are using GameClaw to violate a game vendor&apos;s ToS, abuse our
          rate limits, attempt to gain unauthorized access to our systems, or
          engage in fraudulent billing chargebacks. Where possible we&apos;ll give
          you a warning and a chance to fix the issue first.
        </p>

        <h2>6. Service availability</h2>
        <p>
          GameClaw is provided &quot;as-is&quot;. We do not guarantee that any specific
          adapter, capability, or game vendor integration will work at any
          particular moment — game vendors change their APIs, and our adapters
          break. We&apos;ll do our best to fix breakage quickly. When a vendor&apos;s
          failure rate spikes, our risk circuit breaker automatically halts
          dispatch to that vendor; affected tasks return a clear &quot;skipped&quot;
          status.
        </p>

        <h2>7. Disclaimer of warranties</h2>
        <p>
          To the maximum extent permitted by law, GameClaw is provided without
          warranties of any kind. We are not responsible for in-game losses,
          account bans, missed rewards, or any other consequence of using or
          being unable to use the service. <strong>If a game vendor bans your
          account for using third-party automation, you accept that risk.</strong>
        </p>

        <h2>8. Limitation of liability</h2>
        <p>
          To the maximum extent permitted by law, our aggregate liability to
          you arising out of or in connection with your use of GameClaw is
          limited to the amount you paid us in subscription fees in the 12
          months preceding the claim, or USD $50, whichever is greater.
        </p>

        <h2>9. Open source</h2>
        <p>
          GameClaw&apos;s source is published at{" "}
          <a href="https://github.com/oratis/gameclaw" target="_blank" rel="noopener noreferrer" className="text-emerald-400">github.com/oratis/gameclaw</a>{" "}
          under the MIT license. You can audit, fork, and self-host. If you
          self-host, these terms don&apos;t apply to your deployment — they
          govern only the hosted service at gogameclaw.com.
        </p>

        <h2>10. Governing law</h2>
        <p>
          These terms are governed by the laws of the jurisdiction of our
          incorporation. Disputes are resolved through good-faith negotiation
          first, then through binding arbitration where required.
        </p>

        <h2>11. Changes</h2>
        <p>
          We&apos;ll update these terms when our service or legal obligations
          change. Material changes are emailed to active subscribers and
          flagged in the dashboard. Continued use after a material change
          constitutes acceptance.
        </p>

        <h2>12. Contact</h2>
        <p>
          <a href="mailto:legal@gogameclaw.com" className="text-emerald-400">legal@gogameclaw.com</a>
        </p>
      </article>
    </div>
  );
}
