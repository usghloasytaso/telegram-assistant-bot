const { Groq } = require('groq-sdk');
require('dotenv').config();

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

async function checkModels() {
  try {
    const models = await groq.models.list();
    console.log("Available models:", models.data.map(m => m.id));
  } catch (err) {
    console.error("Error listing models:", err);
  }
}

checkModels();
