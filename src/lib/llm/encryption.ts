import "server-only";

import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

const ALGORITHM = "aes-256-gcm";
const FORMAT_VERSION = "v1";

export class EncryptionKeyMissingError extends Error {
  readonly code = "encryption_key_missing";
}

function getMasterKey() {
  const encoded = process.env.APP_ENCRYPTION_KEY?.trim();
  if (!encoded) throw new EncryptionKeyMissingError("APP_ENCRYPTION_KEY is required");

  const key = Buffer.from(encoded, "base64");
  if (key.length !== 32) {
    throw new Error("APP_ENCRYPTION_KEY must be a base64-encoded 32-byte key");
  }
  return key;
}

export function encryptSecret(value: string) {
  const iv = randomBytes(12);
  const cipher = createCipheriv(ALGORITHM, getMasterKey(), iv);
  const encrypted = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();

  return [
    FORMAT_VERSION,
    iv.toString("base64"),
    tag.toString("base64"),
    encrypted.toString("base64"),
  ].join(":");
}

export function decryptSecret(payload: string) {
  const [version, ivValue, tagValue, encryptedValue] = payload.split(":");
  if (version !== FORMAT_VERSION || !ivValue || !tagValue || !encryptedValue) {
    throw new Error("Encrypted secret has an unsupported format");
  }

  const decipher = createDecipheriv(
    ALGORITHM,
    getMasterKey(),
    Buffer.from(ivValue, "base64"),
  );
  decipher.setAuthTag(Buffer.from(tagValue, "base64"));
  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(encryptedValue, "base64")),
    decipher.final(),
  ]);
  return decrypted.toString("utf8");
}
