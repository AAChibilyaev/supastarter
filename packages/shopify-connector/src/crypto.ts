/**
 * Token encryption using AES-256-GCM.
 *
 * Encryption key loaded from SHOPIFY_ENCRYPTION_KEY env var (64 hex chars = 32 bytes).
 * Falls back to deriving from SHOPIFY_API_SECRET in dev.
 */

import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";

import { logger } from "@repo/logs";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 16;

function getEncryptionKey(): Buffer {
	const raw = process.env.SHOPIFY_ENCRYPTION_KEY || process.env.SHOPIFY_API_SECRET || "";
	if (!raw) {
		throw new Error(
			"Missing SHOPIFY_ENCRYPTION_KEY (or SHOPIFY_API_SECRET as fallback). " +
				"Set one of these environment variables to encrypt Shopify tokens at rest.",
		);
	}
	// Derive 32-byte key via SHA-256
	return createHash("sha256").update(raw).digest();
}

/** Encrypt a plaintext string. Returns hex-encoded: iv:ciphertext:authTag */
export function encryptToken(plaintext: string): string {
	const key = getEncryptionKey();
	const iv = randomBytes(IV_LENGTH);
	const cipher = createCipheriv(ALGORITHM, key, iv);

	const encrypted = Buffer.concat([cipher.update(plaintext, "utf-8"), cipher.final()]);
	const authTag = cipher.getAuthTag();

	const result = `${iv.toString("hex")}:${encrypted.toString("hex")}:${authTag.toString("hex")}`;
	logger.debug("Token encrypted", { ivLength: iv.length, cipherLength: encrypted.length });
	return result;
}

/** Decrypt a hex-encoded string produced by encryptToken */
export function decryptToken(encoded: string): string {
	const parts = encoded.split(":");
	if (parts.length !== 3) {
		throw new Error("Invalid encrypted token format — expected iv:ciphertext:authTag");
	}

	const [ivHex, cipherHex, tagHex] = parts;
	const key = getEncryptionKey();
	const iv = Buffer.from(ivHex, "hex");
	const encrypted = Buffer.from(cipherHex, "hex");
	const authTag = Buffer.from(tagHex, "hex");

	const decipher = createDecipheriv(ALGORITHM, key, iv);
	decipher.setAuthTag(authTag);

	const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);
	return decrypted.toString("utf-8");
}
