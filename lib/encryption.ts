import crypto from "crypto";

const ALGORITHM = "aes-256-gcm";
// The key should be exactly 32 bytes (256 bits).
// We expect it to be provided as a hex string in the environment.
function getKey() {
  const keyString = process.env.ENCRYPTION_KEY;
  if (!keyString) {
    throw new Error("Missing ENCRYPTION_KEY environment variable. It must be a 32-byte hex string (64 characters).");
  }
  const key = Buffer.from(keyString, "hex");
  if (key.length !== 32) {
    throw new Error("ENCRYPTION_KEY must be exactly 32 bytes (64 hex characters).");
  }
  return key;
}

export function encryptString(text: string): string {
  if (!text) return text;
  try {
    const key = getKey();
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
    let encrypted = cipher.update(text, "utf8", "hex");
    encrypted += cipher.final("hex");
    const authTag = cipher.getAuthTag().toString("hex");

    // Format: v1:iv:authTag:encryptedData
    return `v1:${iv.toString("hex")}:${authTag}:${encrypted}`;
  } catch (error) {
    console.error("Encryption failed:", error);
    throw new Error("Failed to encrypt data.");
  }
}

export function decryptString(encryptedText: string): string {
  if (!encryptedText) return encryptedText;


  try {
    const key = getKey();
    const parts = encryptedText.split(":");
    if (parts.length !== 4 || parts[0] !== "v1") {
      throw new Error("Invalid encryption format");
    }

    const iv = Buffer.from(parts[1], "hex");
    const authTag = Buffer.from(parts[2], "hex");
    const encryptedData = parts[3];

    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);
    let decrypted = decipher.update(encryptedData, "hex", "utf8");
    decrypted += decipher.final("utf8");

    return decrypted;
  } catch (error) {
    console.error("Decryption failed:", error);
    // If it fails (e.g. key change or corrupt), return empty or throw depending on requirements.
    // We'll throw to prevent silent data loss on save.
    throw new Error("Failed to decrypt data.");
  }
}

export function maskAadhaar(aadhaar: string | null | undefined): string {
  if (!aadhaar) return "";
  const cleaned = aadhaar.replace(/\D/g, "");
  if (cleaned.length < 4) return cleaned;
  // Mask all but last 4 digits (e.g. ********1234)
  return "*".repeat(cleaned.length - 4) + cleaned.slice(-4);
}
