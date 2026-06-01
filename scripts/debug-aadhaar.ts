import { createClient } from "@supabase/supabase-js";
import { decryptString } from "../lib/encryption";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

async function debugAadhaar() {
  const profileId = process.argv[2];
  if (!profileId) {
    console.error("Please provide a profile ID as an argument.");
    console.log("Usage: npx tsx scripts/debug-aadhaar.ts <profile_id>");
    process.exit(1);
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  const { data, error } = await supabase
    .from("candidate_profiles")
    .select("aadhaar_number")
    .eq("profile_id", profileId)
    .single();

  if (error) {
    console.error("Error fetching profile:", error.message);
    process.exit(1);
  }

  if (!data?.aadhaar_number) {
    console.log("No Aadhaar number found for this profile.");
    process.exit(0);
  }

  console.log("Encrypted string in DB:", data.aadhaar_number);

  try {
    const decrypted = decryptString(data.aadhaar_number);
    console.log("🔓 Decrypted Aadhaar Number:", decrypted);
  } catch (err: any) {
    console.error("Failed to decrypt:", err.message);
  }
}

debugAadhaar();
