// artifacts/api-server/src/lib/license-crypto.ts
//
// AES-256-GCM encryption helpers for ZeniPost license files.
//
// Encryption key is derived from LICENSE_SECRET (the same secret used to sign
// the JWT payload) via SHA-256, so no second secret needs to be managed.
//
// .lic file format (binary, then base64-encoded for transport):
//   [iv  — 12 bytes][authTag — 16 bytes][ciphertext — variable]
//
// The email-app decrypts with decryptLicense() using the same key, then
// JSON.parses the result to read license fields.

import crypto from "crypto";

/** Derive a 32-byte AES-256 key from an arbitrary secret string. */
function deriveKey(secret: string): Buffer {
  return crypto.createHash("sha256").update(secret).digest();
}

/**
 * encryptLicense(payload, secret) → base64 string
 *
 * Encrypts the license payload object with AES-256-GCM.
 * Output is a base64-encoded blob: iv(12) + authTag(16) + ciphertext.
 */
export function encryptLicense(payload: object, secret: string): string {
  const key        = deriveKey(secret);
  const iv         = crypto.randomBytes(12);                        // 96-bit IV for GCM
  const cipher     = crypto.createCipheriv("aes-256-gcm", key, iv);

  const plaintext  = JSON.stringify(payload);
  const encrypted  = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ]);
  const authTag    = cipher.getAuthTag();                          // 16 bytes

  // Concatenate: iv || authTag || ciphertext
  const blob       = Buffer.concat([iv, authTag, encrypted]);
  return blob.toString("base64");
}

/**
 * decryptLicense(base64Blob, secret) → parsed payload object
 *
 * Inverse of encryptLicense. Throws if the blob is tampered or the key is wrong.
 */
export function decryptLicense(base64Blob: string, secret: string): object {
  const key        = deriveKey(secret);
  const blob       = Buffer.from(base64Blob, "base64");

  if (blob.length < 28) {
    throw new Error("License blob too short to be valid");
  }

  const iv         = blob.subarray(0, 12);
  const authTag    = blob.subarray(12, 28);
  const ciphertext = blob.subarray(28);

  const decipher   = crypto.createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(authTag);

  const decrypted  = Buffer.concat([
    decipher.update(ciphertext),
    decipher.final(),                                              // throws if auth tag fails
  ]);

  return JSON.parse(decrypted.toString("utf8"));
}
