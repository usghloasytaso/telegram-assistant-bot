const DB = require('../db');
const { generateAIResponse } = require('../ai/groq');

/**
 * Handles "دستیار قرعه کشی"
 */
async function handleLottery(ctx) {
  const chatId = ctx.chat.id;
  const recentMsgs = await DB.getRecentMessages(chatId, 50);

  if (!recentMsgs || recentMsgs.length === 0) {
    return ctx.reply('تعداد پیام‌های فعال برای قرعه‌کشی کافی نیست.');
  }

  // Filter unique active users excluding bot
  const uniqueUsers = [];
  const seenIds = new Set();

  for (const m of recentMsgs) {
    if (m.user_id !== String(ctx.me.id) && !seenIds.has(m.user_id)) {
      seenIds.add(m.user_id);
      uniqueUsers.push(m);
    }
  }

  if (uniqueUsers.length === 0) {
    return ctx.reply('کاربر فعالی برای قرعه‌کشی پیدا نشد.');
  }

  const winner = uniqueUsers[Math.floor(Math.random() * uniqueUsers.length)];

  const text = `🎉 **قرعه‌کشی هوشمند گروه انجام شد!**

🏆 **برنده خوش‌شانس این قرعه‌کشی:**
👤 **${winner.first_name}** (@${winner.username || 'بدون آیدی'})

تبریک به برنده! 👏🥳`;

  await ctx.reply(text, { parse_mode: 'Markdown' });
}

/**
 * Handles "دستیار چیستان"
 */
async function handleRiddle(ctx) {
  await ctx.replyWithChatAction('typing');
  const systemPrompt = `تو یک طراح چیستان‌های هوشمندانه و جذاب به زبان فارسی هستی. یک چیستان جدید و سرگرم‌کننده همراه با جواب اسپویلر شده (یا انتهای متن) بساز.`;
  const response = await generateAIResponse('یک چیستان برام بگو', systemPrompt, [], 400);
  await ctx.reply(`🧩 **چیستان دستیار:**\n\n${response}`, { parse_mode: 'Markdown' });
}

/**
 * Handles "دستیار جوک"
 */
async function handleJoke(ctx) {
  await ctx.replyWithChatAction('typing');
  const systemPrompt = `تو یک طنزپرداز خنده‌دار فارسی هستی. یک جوک بامزه، جدید و خنده‌دار تعریف کن.`;
  const response = await generateAIResponse('یک جوک بگویید', systemPrompt, [], 400);
  await ctx.reply(`😄 **طنز دستیار:**\n\n${response}`, { parse_mode: 'Markdown' });
}

/**
 * Handles "دستیار نظرسنجی [موضوع]"
 */
async function handlePollGenerator(ctx) {
  const text = (ctx.message.text || '').replace(/ي/g, 'ی').replace(/ك/g, 'ک').replace(/‌/g, ' ');
  const topic = text.replace(/^دستیار\s*نظرسنجی/i, '').replace(/^نظرسنجی/, '').trim() || 'موضوعات روز گروه';

  await ctx.replyWithChatAction('typing');
  const systemPrompt = `تو یک سیستم ساخت نظرسنجی هوشمند هستی. برای موضوع داده شده، یک سوال جذاب و بین ۳ تا ۴ گزینه مناسب پیشنهاد بده. خروجی را دقیقاً به شکل JSON زیر برگردان:
{
  "question": "سوال نظرسنجی",
  "options": ["گزینه ۱", "گزینه ۲", "گزینه ۳"]
}`;

  try {
    const rawRes = await generateAIResponse(`موضوع نظرسنجی: "${topic}"`, systemPrompt, [], 400);
    const cleanedJson = rawRes.replace(/```json/gi, '').replace(/```/g, '').trim();
    const parsed = JSON.parse(cleanedJson);

    await ctx.replyWithPoll(parsed.question, parsed.options, { is_anonymous: false });
  } catch (err) {
    // Fallback if JSON parsing fails
    await ctx.replyWithPoll(`نظر شما درباره ${topic} چیست؟`, ['موافقم 👍', 'مخالفم 👎', 'نیاز به بررسی بیشتر 🧐'], { is_anonymous: false });
  }
}

module.exports = {
  handleLottery,
  handleRiddle,
  handleJoke,
  handlePollGenerator
};
