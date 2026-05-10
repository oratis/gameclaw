/**
 * Central adapter registry.
 *
 * To add a new game:
 *   1. Create src/adapters/<vendor>.ts implementing GameAdapter
 *   2. Import and register the adapter(s) below
 *   3. Add the slug to ADAPTER_SLUGS so it's discoverable via the registry API
 *
 * See src/adapters/README.md for the full contract.
 */

import { HOYOLAB_ADAPTERS } from "./hoyolab";
import { KURO_ADAPTERS } from "./kuro";
import { MIYOUSHE_ADAPTERS } from "./miyoushe";
import { SKLAND_ADAPTERS } from "./skland";
import type { GameAdapter } from "./types";

const REGISTRY: Record<string, GameAdapter> = {
  ...HOYOLAB_ADAPTERS,
  ...KURO_ADAPTERS,
  ...MIYOUSHE_ADAPTERS,
  ...SKLAND_ADAPTERS,
};

export function getAdapter(slug: string): GameAdapter | null {
  return REGISTRY[slug] ?? null;
}

export function listAdapters(): GameAdapter[] {
  return Object.values(REGISTRY);
}

export function listAdapterSlugs(): string[] {
  return Object.keys(REGISTRY);
}

export function hasAdapter(slug: string): boolean {
  return slug in REGISTRY;
}

export type { GameAdapter, Task, TaskResult, TaskStatus, Capability, Credentials, AccountInfo, AuthMethod, CredentialField } from "./types";
