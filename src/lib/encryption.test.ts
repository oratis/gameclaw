import { describe, it, expect, beforeAll } from "vitest";
import { encrypt, decrypt, encryptJSON, decryptJSON } from "./encryption";

describe("encryption", () => {
  beforeAll(() => {
    process.env.ENCRYPTION_KEY =
      "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";
  });

  it("round-trips plaintext through encrypt/decrypt", () => {
    const plaintext = "hello world";
    const ciphertext = encrypt(plaintext);
    expect(decrypt(ciphertext)).toBe(plaintext);
  });

  it("round-trips typical HoYoLAB cookie values", () => {
    const ltoken = "v2_AbC123-_xYz.tokenStringHere";
    const ciphertext = encrypt(ltoken);
    expect(decrypt(ciphertext)).toBe(ltoken);
  });

  it("produces different ciphertext for same plaintext (random IV)", () => {
    const plaintext = "same-input";
    expect(encrypt(plaintext)).not.toBe(encrypt(plaintext));
  });

  it("throws on malformed ciphertext", () => {
    expect(() => decrypt("not-a-valid-ciphertext")).toThrow();
    expect(() => decrypt("only:two")).toThrow();
    expect(() => decrypt("::")).toThrow();
  });

  it("throws on tampered ciphertext (auth tag failure)", () => {
    const ciphertext = encrypt("secret");
    const [iv, tag, data] = ciphertext.split(":");
    const tampered = `${iv}:${tag}:${data.slice(0, -2)}ff`;
    expect(() => decrypt(tampered)).toThrow();
  });

  it("throws when key is invalid length", () => {
    const originalKey = process.env.ENCRYPTION_KEY;
    process.env.ENCRYPTION_KEY = "tooshort";
    try {
      expect(() => encrypt("x")).toThrow(/64 hex/);
    } finally {
      process.env.ENCRYPTION_KEY = originalKey;
    }
  });

  it("encryptJSON / decryptJSON round-trip an arbitrary credential map", () => {
    const creds = {
      ltokenV2: "v2_AbC123-_xYz.tokenStringHere",
      ltuidV2: "12345678",
      cookieTokenV2: "ct.v2.zzz",
    };
    const ciphertext = encryptJSON(creds);
    expect(decryptJSON<typeof creds>(ciphertext)).toEqual(creds);
  });

  it("decryptJSON throws on tampered ciphertext", () => {
    const ciphertext = encryptJSON({ token: "abc" });
    const [iv, tag, data] = ciphertext.split(":");
    const tampered = `${iv}:${tag}:${data.slice(0, -2)}aa`;
    expect(() => decryptJSON(tampered)).toThrow();
  });
});
