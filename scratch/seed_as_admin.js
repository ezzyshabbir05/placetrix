const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://supabase.placetrix.app';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoiYW5vbiIsImlzcyI6InN1cGFiYXNlIiwiaWF0IjoxNzc5MzQ0MDgyLCJleHAiOjE5MzcwMjQwODJ9.8Bvvby7wblmzA2Er1cBadyh5XrZ4QWgHrBCAglV_KlM';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Check what email/password args were passed
const email = process.argv[2];
const password = process.argv[3];

async function seedAsAdmin() {
  if (!email || !password) {
    console.log("Usage: node scratch/seed_as_admin.js <admin_email> <admin_password>");
    console.log("\nThis script signs in as an admin user then seeds the database.");
    console.log("The anon RLS policy allows admins to INSERT into coding_problems.");
    return;
  }

  console.log(`Signing in as ${email}...`);
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (authError) {
    console.error("Auth failed:", authError.message);
    return;
  }
  console.log("Signed in! User ID:", authData.user.id);

  // Check profile account_type
  const { data: profile } = await supabase.from('profiles').select('account_type').eq('id', authData.user.id).single();
  console.log("Account type:", profile?.account_type);

  const fs = require('fs');
  const path = require('path');
  const jsonPath = path.join(__dirname, '..', 'problems_import.json');
  const problems = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
  console.log(`Read ${problems.length} problems from problems_import.json`);

  const { data: existing } = await supabase.from('coding_problems').select('title');
  const existingTitles = new Set((existing || []).map(p => p.title.trim().toLowerCase()));
  const toInsert = problems.filter(p => !existingTitles.has(p.title.trim().toLowerCase()));
  
  if (toInsert.length === 0) {
    console.log("All problems already seeded!");
    return;
  }

  console.log(`Inserting ${toInsert.length} problems...`);
  const { data, error } = await supabase.from('coding_problems').insert(toInsert).select('id, title');

  if (error) {
    console.error("Insert error:", error);
  } else {
    console.log(`Successfully inserted ${data.length} problems!`);
    data.forEach((p, i) => console.log(`  ${i+1}. ${p.title} (${p.id})`));
  }
}

seedAsAdmin();
