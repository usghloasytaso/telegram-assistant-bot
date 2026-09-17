const { Groq } = require('groq-sdk');
require('dotenv').config();

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

const candidateModels = [
  'qwen/qwen3.8-27b',
  'openai/gpt-oss-120b',
  'allam-2-7b',
  'groq/compound',
  'groq/compound-mini',
  'openai/gpt-oss-20b'
];

async function testAll() {
  for (const model of candidateModels) {
    console.log(`\n--- Testing ${model} ---`);
    try {
      const response = await groq.chat.completions.create({
        messages: [
          { role: "system", content: "تو یک دستیار هوشمند تلگرام به زبان فارسی هستی." },
          { role: "user", content: "سلام! دستیار خلاصه‌ای از بازار بورس بگو" }
        ],
        model: model,
        max_tokens: 150
      });
      console.log(`Result (${model}):`, response.choices[0]?.message?.content);
    } catch (err) {
      console.log(`Failed (${model}):`, err.message);
    }
  }
}

testAll();
