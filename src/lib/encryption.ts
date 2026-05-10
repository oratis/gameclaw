import { createCipheriv, createDecipheriv, randomBytes } from "crypto";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12;

function getKey(): Buffer {
  const key = process.env.ENCRYPTION_KEY;
  if (!key) throw new Error("ENCRYPTION_KEY environment variable is not set");
  if (!/^[0-9a-fA-F]{64}$/.test(key)) {
    throw new Error("ENCRYPTION_KEY must be exactly 64 hex characters (32 bytes)");
  }
  return Buffer.from(key, "hex");
}

export function encrypt(plaintext: string): string {
  const key = getKey();
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, key, iv);

  let encrypted = cipher.update(plaintext, "utf8", "hex");
  encrypted += cipher.final("hex");
  const tag = cipher.getAuthTag();

  return iv.toString("hex") + ":" + tag.toString("hex") + ":" + encrypted;
}

export function encryptJSON(value: unknown): string {
  return encrypt(JSON.stringify(value));
}

export function decryptJSON<T = unknown>(ciphertext: string): T {
  return JSON.parse(decrypt(ciphertext)) as T;
}

export function decrypt(ciphertext: string): string {
  const key = getKey();
  const parts = ciphertext.split(":");
  if (parts.length !== 3) {
    throw new Error("Invalid ciphertext format: expected 'iv:tag:encrypted'");
  }
  const [ivHex, tagHex, encrypted] = parts;

  if (!ivHex || !tagHex || !encrypted) {
    throw new Error("Invalid ciphertext: missing iv, tag, or encrypted data");
  }

  try {
    const iv = Buffer.from(ivHex, "hex");
    const tag = Buffer.from(tagHex, "hex");
    const decipher = createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(tag);

    let decrypted = decipher.update(encrypted, "hex", "utf8");
    decrypted += decipher.final("utf8");

    return decrypted;
  } catch (error) {
    throw new Error(
      `Decryption failed: ${error instanceof Error ? error.message : "unknown error"}`
    );
  }
}
