const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://supabase.placetrix.app';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoiYW5vbiIsImlzcyI6InN1cGFiYXNlIiwiaWF0IjoxNzc5MzQ0MDgyLCJleHAiOjE5MzcwMjQwODJ9.8Bvvby7wblmzA2Er1cBadyh5XrZ4QWgHrBCAglV_KlM';

const supabase = createClient(supabaseUrl, supabaseKey);

async function seed() {
  console.log("Reading problems_import.json...");
  const jsonPath = path.join(__dirname, '..', 'problems_import.json');
  const fileContent = fs.readFileSync(jsonPath, 'utf8');
  const problems = JSON.parse(fileContent);

  console.log(`Found ${problems.length} problems to seed. Checking existing problems...`);
  const { data: existing, error: getError } = await supabase
    .from('coding_problems')
    .select('id, title');

  if (getError) {
    console.error("Error checking existing problems:", getError);
    return;
  }

  console.log(`Currently there are ${existing.length} problems in the database.`);

  // Create list of titles already in DB to avoid duplicate seed
  const existingTitles = new Set(existing.map(p => p.title.trim().toLowerCase()));
  const problemsToInsert = problems.filter(p => !existingTitles.has(p.title.trim().toLowerCase()));

  if (problemsToInsert.length === 0) {
    console.log("All problems in problems_import.json are already seeded!");
    return;
  }

  console.log(`Seeding ${problemsToInsert.length} new problems...`);

  const { data: inserted, error: insertError } = await supabase
    .from('coding_problems')
    .insert(problemsToInsert)
    .select('id, title');

  if (insertError) {
    console.error("Error inserting problems:", insertError);
  } else {
    console.log(`Successfully seeded ${inserted.length} problems!`);
    inserted.forEach((p, idx) => {
      console.log(`  ${idx + 1}. "${p.title}" (ID: ${p.id})`);
    });
  }
}

seed();
