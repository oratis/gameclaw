"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/Button";
import { TIERS, type TierId } from "@/lib/billing/tiers";
import { Loader2, AlertCircle } from "lucide-react";

interface Props {
  tierId: TierId;
  hasActive: boolean;
  upgradeRequested?: "pro" | "proplus" | "enterprise";
}

export function BillingActions({ tierId, hasActive, upgradeRequested }: Props) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [autoTriggered, setAutoTriggered] = useState(false);

  const subscribe = useCallback(async (tier: "pro" | "proplus" | "enterprise") => {
    setError("");
    setBusy(true);
    try {
      const res = await fetch("/api/billing/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tier }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Subscription failed");
        setBusy(false);
        return;
      }
      // Redirect to PayPal approval page
      window.location.href = data.approvalUrl;
    } catch {
      setError("Network error");
      setBusy(false);
    }
  }, []);

  // Auto-trigger if user landed here via /pricing → upgrade=pro link
  useEffect(() => {
    if (
      upgradeRequested &&
      !autoTriggered &&
      !hasActive &&
      upgradeRequested !== "enterprise"
    ) {
      setAutoTriggered(true);
      subscribe(upgradeRequested);
    }
  }, [upgradeRequested, autoTriggered, hasActive, subscribe]);

  async function cancel() {
    if (!confirm("Cancel your subscription? You'll keep your current tier until the end of the billing period.")) {
      return;
    }
    setError("");
    setBusy(true);
    try {
      const res = await fetch("/api/billing/cancel", { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Cancel failed");
      } else {
        window.location.reload();
      }
    } catch {
      setError("Network error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      {error && (
        <div className="mb-4 flex items-center gap-2 rounded-lg bg-red-500/10 px-4 py-3 text-sm text-red-400">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {error}
        </div>
      )}

      {hasActive ? (
        <div className="space-y-3">
          <Button
            onClick={cancel}
            disabled={busy}
            className="w-full bg-red-500/10 text-red-300 hover:bg-red-500/20"
          >
            {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Cancel subscription
          </Button>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {(["pro", "proplus"] as const).map((id) => (
            <Button
              key={id}
              onClick={() => subscribe(id)}
              disabled={busy || tierId === id}
              className={
                id === "proplus"
                  ? "bg-emerald-500 hover:bg-emerald-600"
                  : ""
              }
            >
              {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              {tierId === id
                ? `Current: ${TIERS[id].displayName}`
                : `Subscribe to ${TIERS[id].displayName} ($${TIERS[id].priceMonthly}/mo)`}
            </Button>
          ))}
        </div>
      )}
    </>
  );
}
