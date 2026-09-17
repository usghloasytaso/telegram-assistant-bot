const { Groq } = require('groq-sdk');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

async function testGroq() {
  console.log("Testing Groq...");
  try {
    const response = await groq.chat.completions.create({
      messages: [{ role: "user", content: "سلام! حالت چطوره؟" }],
      model: "llama-3.3-70b-versatile",
    });
    console.log("Groq response:", response.choices[0]?.message?.content);
  } catch (err) {
    console.error("Groq error:", err.message);
  }
}

async function testSupabase() {
  console.log("Testing Supabase...");
  try {
    const { data, error } = await supabase.from('group_settings').select('*').limit(1);
    if (error) {
      console.log("Supabase table test query error (might mean table doesn't exist yet):", error.message);
    } else {
      console.log("Supabase group_settings query success:", data);
    }
  } catch (err) {
    console.error("Supabase error:", err.message);
  }
}

async function main() {
  await testGroq();
  await testSupabase();
}

main();
