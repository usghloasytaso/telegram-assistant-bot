const DB = require('../db');
const { generateAIResponse, translateText, proofreadText } = require('../ai/groq');
const { buildMiraSystemPrompt } = require('../ai/persona');

/**
 * Main AI chat handler for "دستیار" keyword or replies
 */
async function handleAIChat(ctx) {
  const text = ctx.message.text || '';
  const chatId = ctx.chat.id;
  const userId = ctx.from.id;
  const userName = ctx.from.username;
  const firstName = ctx.from.first_name;

  const norm = (s) => (s || '').replace(/ي/g, 'ی').replace(/ك/g, 'ک').replace(/‌/g, ' ').replace(/\s+/g, ' ').trim();
  const ntext = norm(text);

  // Check if it's a translation request (دستیار ترجمه / ترجمه)
  if (ntext.startsWith('دستیار ترجمه') || ntext.startsWith('ترجمه')) {
    let targetText = ntext.replace('دستیار ترجمه', '').replace(/^ترجمه/, '').trim();
    if (!targetText && ctx.message.reply_to_message && ctx.message.reply_to_message.text) {
      targetText = ctx.message.reply_to_message.text;
    }

    if (!targetText) {
      return ctx.reply('لطفاً متن را بعد از دستور بنویسید یا روی یک پیام ریپلای بزنید و بنویسید: ترجمه');
    }

    await ctx.replyWithChatAction('typing');
    const translated = await translateText(targetText);
    return ctx.reply(`🌐 ترجمه هوشمند:\n\n${translated}`);
  }

  // Check if it's a proofreading request (دستیار ویراستاری / ویراستاری)
  if (ntext.startsWith('دستیار ویراستاری') || ntext.startsWith('ویراستاری')) {
    let targetText = ntext.replace('دستیار ویراستاری', '').replace(/^ویراستاری/, '').trim();
    if (!targetText && ctx.message.reply_to_message && ctx.message.reply_to_message.text) {
      targetText = ctx.message.reply_to_message.text;
    }

    if (!targetText) {
      return ctx.reply('لطفاً متن را بعد از دستور بنویسید یا روی یک پیام ریپلای بزنید و بنویسید: ویراستاری');
    }

    await ctx.replyWithChatAction('typing');
    const edited = await proofreadText(targetText);
    return ctx.reply(`✍️ متن ویراستاری شده:\n\n${edited}`);
  }

  // Check if it's a summary request (دستیار خلاصه / خلاصه / دستیار خلاصه ساز)
  if (ntext.includes('خلاصه')) {
    await ctx.replyWithChatAction('typing');
    const recentMsgs = await DB.getRecentMessages(chatId, 25);
    if (!recentMsgs || recentMsgs.length < 3) {
      return ctx.reply('هنوز پیام کافی در تاریخچه گروه برای خلاصه‌سازی ذخیره نشده است.');
    }

    const formattedMsgs = recentMsgs.map(m => `${m.first_name}: ${m.message_text}`).join('\n');
    const summaryPrompt = `لطفاً گفتگوهای زیر را در ۲ تا ۴ بند به زبان فارسی خلاصه کن:\n${formattedMsgs}`;
    const summary = await generateAIResponse(summaryPrompt, 'تو خلاصه‌ساز گفتگوهای گروه هستی.', [], 500);

    return ctx.reply(`📝 **خلاصه گفتگوهای اخیر گروه:**\n\n${summary}`, { parse_mode: 'Markdown' });
  }

  // Standard AI Chat with Mira-style memory
  await ctx.replyWithChatAction('typing');

  // Build Mira-style system prompt
  const systemPrompt = await buildMiraSystemPrompt(chatId, userId, userName, firstName);

  // Get recent 10 messages context
  const recentMsgs = await DB.getRecentMessages(chatId, 10);
  const formattedHistory = recentMsgs.map(m => ({
    role: (m.user_id === String(ctx.me.id)) ? 'assistant' : 'user',
    content: `${m.first_name}: ${m.message_text}`
  }));

  // Clean prompt text
  let userQuery = text.replace(/^دستیار\s*/i, '').trim();
  if (!userQuery && ctx.message.reply_to_message && ctx.message.reply_to_message.text) {
    userQuery = `درباره پیام زیر نظر بده: "${ctx.message.reply_to_message.text}"`;
  }
  if (!userQuery) {
    userQuery = 'سلام دستیار! چطور می‌تونی کمکم کنی؟';
  }

  const aiResponse = await generateAIResponse(userQuery, systemPrompt, formattedHistory, 800);

    // Reply to user (fallback to plain send if original message was deleted)
  try {
    await ctx.reply(aiResponse, {
      reply_to_message_id: ctx.message.message_id,
      parse_mode: 'Markdown'
    });
  } catch (e) {
    try {
      await ctx.reply(aiResponse);
    } catch (e2) {
      console.error('Reply failed:', e2.message);
    }
  }

module.exports = { handleAIChat };
