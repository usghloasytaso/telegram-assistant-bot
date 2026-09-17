const { Groq } = require('groq-sdk');
require('dotenv').config();

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

async function testQwenPersona() {
  const startTime = Date.now();
  const res = await groq.chat.completions.create({
    model: "qwen/qwen3.8-27b",
    messages: [
      {
        role: "system",
        content: `تو یک دستیار هوشمند و فوق‌العاده حرفه‌ای در گروه تلگرام هستی.
اسم تو "دستیار" است.
لحن: صمیمی، محترمانه، هوشمند، فارسی روان، همراه با ایموجی.
حافظه کاربران:
- علی: تحلیل‌گر تکنیکال، معمولاً نگاه صعودی دارد.
- سارا: خبرنگار اقتصادی، فکت‌ها را چک می‌کند.

کاربر "علی" پیام داده: "دستیار به نظرت بیت کوین ۱۰۰ هزار دلار رو رد می‌کنه؟"`
      },
      {
        role: "user",
        content: "دستیار به نظرت بیت کوین ۱۰۰ هزار دلار رو رد می‌کنه؟"
      }
    ],
    temperature: 0.7,
    max_tokens: 300
  });

  console.log(`Time taken: ${Date.now() - startTime}ms`);
  console.log(res.choices[0].message.content);
}

testQwenPersona();
