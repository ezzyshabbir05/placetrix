const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://supabase.placetrix.app';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoiYW5vbiIsImlzcyI6InN1cGFiYXNlIiwiaWF0IjoxNzc5MzQ0MDgyLCJleHAiOjE5MzcwMjQwODJ9.8Bvvby7wblmzA2Er1cBadyh5XrZ4QWgHrBCAglV_KlM';

const supabase = createClient(supabaseUrl, supabaseKey);

async function test() {
  console.log("Testing coding_problems selection with acceptance_rate and total_submissions...");
  const { data: data1, error: error1 } = await supabase
    .from('coding_problems')
    .select('id, title, difficulty, acceptance_rate, total_submissions, tags, created_at')
    .limit(5);

  if (error1) {
    console.error("Error with acceptance_rate:", error1);
  } else {
    console.log("Success with acceptance_rate. Data length:", data1.length);
  }

  console.log("\nTesting coding_problems selection WITHOUT acceptance_rate and total_submissions...");
  const { data: data2, error: error2 } = await supabase
    .from('coding_problems')
    .select('id, title, difficulty, tags, created_at')
    .limit(5);

  if (error2) {
    console.error("Error without acceptance_rate:", error2);
  } else {
    console.log("Success without acceptance_rate. Data length:", data2.length);
    console.log("First item:", data2[0]);
  }

  console.log("\nTesting fetching all coding_problems...");
  const { data: allProbs, error: probsErr } = await supabase
    .from('coding_problems')
    .select('id, title');
  if (probsErr) {
    console.error("Error fetching all coding_problems:", probsErr);
  } else {
    console.log("Total coding_problems in DB:", allProbs.length);
  }

  console.log("\nTesting coding_submissions...");
  const { data: allSubs, error: subsErr } = await supabase
    .from('coding_submissions')
    .select('id');
  if (subsErr) {
    console.error("Error fetching coding_submissions:", subsErr);
  } else {
    console.log("Total coding_submissions in DB:", allSubs.length);
  }
}

test();
