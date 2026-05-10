import { describe, it, expect } from "vitest";
import { getAdapter, hasAdapter, listAdapters, listAdapterSlugs } from "./index";

describe("adapter registry", () => {
  it("exposes HoYo, Kuro, and Miyoushe (CN) adapters", () => {
    const slugs = listAdapterSlugs().sort();
    // HoYoLab (international)
    expect(slugs).toContain("genshin");
    expect(slugs).toContain("starrail");
    expect(slugs).toContain("honkai3rd");
    expect(slugs).toContain("zzz");
    expect(slugs).toContain("tears");
    // Kuro
    expect(slugs).toContain("wuwa");
    // Miyoushe (HoYo CN)
    expect(slugs).toContain("genshin-cn");
    expect(slugs).toContain("starrail-cn");
    expect(slugs).toContain("zzz-cn");
    // Skland (Hypergryph)
    expect(slugs).toContain("arknights");
  });

  it("Skland adapter declares hypergryph vendor and token auth", () => {
    const a = getAdapter("arknights");
    expect(a?.vendor).toBe("hypergryph");
    expect(a?.authMethod).toBe("token");
    expect(a?.credentialFields[0].key).toBe("hgToken");
  });

  it("returns null for unknown slug", () => {
    expect(getAdapter("nonexistent")).toBeNull();
    expect(hasAdapter("nonexistent")).toBe(false);
  });

  it("HoYo adapters declare hoyoverse vendor and cookie auth", () => {
    const a = getAdapter("genshin");
    expect(a?.vendor).toBe("hoyoverse");
    expect(a?.authMethod).toBe("cookie");
    expect(a?.capabilities).toContain("checkin");
  });

  it("Kuro adapter declares kuro vendor and token auth", () => {
    const a = getAdapter("wuwa");
    expect(a?.vendor).toBe("kuro");
    expect(a?.authMethod).toBe("token");
    expect(a?.capabilities).toContain("checkin");
    expect(a?.credentialFields[0].key).toBe("token");
  });

  it("every adapter declares non-empty capabilities and credential fields", () => {
    for (const adapter of listAdapters()) {
      expect(adapter.capabilities.length).toBeGreaterThan(0);
      expect(adapter.credentialFields.length).toBeGreaterThan(0);
      expect(adapter.slug).toBeTruthy();
      expect(adapter.displayName).toBeTruthy();
    }
  });
});
