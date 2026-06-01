import { createClient } from "@supabase/supabase-js";
import crypto from "crypto";
import dotenv from "dotenv";

// Load environment variables from .env.local
dotenv.config({ path: ".env.local" });

const ALGORITHM = "aes-256-gcm";

function getKey() {
  const keyString = process.env.ENCRYPTION_KEY;
  if (!keyString) {
    throw new Error("Missing ENCRYPTION_KEY environment variable.");
  }
  const key = Buffer.from(keyString, "hex");
  if (key.length !== 32) {
    throw new Error("ENCRYPTION_KEY must be exactly 32 bytes (64 hex characters).");
  }
  return key;
}

function encryptString(text: string): string {
  if (!text) return text;
  const key = getKey();
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  let encrypted = cipher.update(text, "utf8", "hex");
  encrypted += cipher.final("hex");
  const authTag = cipher.getAuthTag().toString("hex");

  return `v1:${iv.toString("hex")}:${authTag}:${encrypted}`;
}

async function migrate() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  console.log("Fetching candidate profiles...");
  // Use pagination if there are many rows, but we will fetch all for this example.
  const { data: profiles, error } = await supabase
    .from("candidate_profiles")
    .select("profile_id, aadhaar_number")
    .not("aadhaar_number", "is", null);

  if (error) {
    console.error("Error fetching profiles:", error);
    process.exit(1);
  }

  console.log(`Found ${profiles.length} profiles with aadhaar numbers.`);
  let updatedCount = 0;

  for (const profile of profiles) {
    const aadhaar = profile.aadhaar_number;
    // Skip already encrypted values
    if (aadhaar.startsWith("v1:")) {
      continue;
    }

    try {
      const encrypted = encryptString(aadhaar);
      const { error: updateError } = await supabase
        .from("candidate_profiles")
        .update({ aadhaar_number: encrypted })
        .eq("profile_id", profile.profile_id);

      if (updateError) {
        console.error(`Failed to update profile ${profile.profile_id}:`, updateError);
      } else {
        updatedCount++;
        console.log(`Encrypted Aadhaar for profile ${profile.profile_id}`);
      }
    } catch (e) {
      console.error(`Encryption failed for profile ${profile.profile_id}`, e);
    }
  }

  console.log(`Migration complete. Updated ${updatedCount} profiles.`);
}

migrate().catch(console.error);
