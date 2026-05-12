"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Minimal wrapper around Cloudflare Turnstile. Loads the script once,
 * renders the widget into a div, surfaces the token via onToken().
 *
 * Renders NOTHING if NEXT_PUBLIC_TURNSTILE_SITE_KEY is unset — graceful
 * degradation so forms still work pre-launch / in dev.
 */

declare global {
  interface Window {
    turnstile?: {
      render: (
        el: HTMLElement,
        opts: {
          sitekey: string;
          callback: (token: string) => void;
          "error-callback"?: () => void;
          "expired-callback"?: () => void;
          theme?: "auto" | "light" | "dark";
        }
      ) => string;
      reset: (widgetId?: string) => void;
    };
  }
}

const SCRIPT_SRC =
  "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
let scriptLoading: Promise<void> | null = null;

function loadTurnstileScript(): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();
  if (window.turnstile) return Promise.resolve();
  if (scriptLoading) return scriptLoading;
  scriptLoading = new Promise<void>((resolve, reject) => {
    const s = document.createElement("script");
    s.src = SCRIPT_SRC;
    s.async = true;
    s.defer = true;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error("Failed to load Turnstile"));
    document.head.appendChild(s);
  });
  return scriptLoading;
}

interface Props {
  onToken: (token: string) => void;
  /** Called when token expires or is invalidated — caller should disable submit. */
  onExpire?: () => void;
}

export function TurnstileWidget({ onToken, onExpire }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);
  const widgetIdRef = useRef<string | null>(null);

  useEffect(() => {
    const sitekey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
    if (!sitekey || !ref.current) return;

    let cancelled = false;
    loadTurnstileScript()
      .then(() => {
        if (cancelled || !window.turnstile || !ref.current) return;
        widgetIdRef.current = window.turnstile.render(ref.current, {
          sitekey,
          theme: "dark",
          callback: onToken,
          "error-callback": () => setError("CAPTCHA failed — refresh and retry"),
          "expired-callback": () => {
            setError("CAPTCHA expired — please re-verify");
            onExpire?.();
          },
        });
      })
      .catch((e) => setError(e instanceof Error ? e.message : "load failed"));

    return () => {
      cancelled = true;
      if (widgetIdRef.current && window.turnstile) {
        try {
          window.turnstile.reset(widgetIdRef.current);
        } catch {
          // ignore — widget may already be torn down
        }
      }
    };
  }, [onToken, onExpire]);

  if (!process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY) {
    // Turnstile not configured — render nothing. Server will skip verify (fail-open).
    return null;
  }

  return (
    <div className="space-y-1.5">
      <div ref={ref} />
      {error && <p className="text-xs text-red-400">{error}</p>}
    </div>
  );
}
