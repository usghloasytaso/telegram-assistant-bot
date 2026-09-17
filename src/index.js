const { Bot } = require('grammy');
require('dotenv').config();

const DB = require('./db');
const { handleHelpCommand } = require('./handlers/help');
const { handleNewChatMembers, handleBotPromotion } = require('./handlers/groupEvents');
const { handleAIChat } = require('./handlers/aiChat');
const { handleAnalysisCommand, handlePredictionCommand, handleMyPredictions } = require('./handlers/analysis');
const { handleKarmaIncrement, handleLeaderboard, handleStats } = require('./handlers/reputation');
const { handleVoiceMessage } = require('./handlers/voice');
const { handleLottery, handleRiddle, handleJoke, handlePollGenerator } = require('./handlers/entertainment');
const { handleInstantReport, initDailyReportCron } = require('./handlers/reports');
const {
  handleWarn,
  handleMute,
  handleUnmute,
  handleSetRules,
  handleGetRules,
  handleAddAdmin,
  handleDelAdmin,
  checkSpamFilter
} = require('./handlers/moderation');

const bot = new Bot(process.env.TELEGRAM_BOT_TOKEN);

// 1. Group Member Events
bot.on('message:new_chat_members', handleNewChatMembers);
bot.on('my_chat_member', handleBotPromotion);

// 2. Global Middleware (Log message & Spam Check)
bot.use(async (ctx, next) => {
  if (ctx.message && ctx.chat) {
    const isSpam = await checkSpamFilter(ctx);
    if (isSpam) return; // Drop spam message

    // Log message to history for context
    const text = ctx.message.text || ctx.message.caption || '';
    if (text) {
      await DB.logMessage(
        ctx.chat.id,
        ctx.from.id,
        ctx.from.username,
        ctx.from.first_name,
        text,
        'chat'
      );
    }
  }
  await next();
});

// 3. Commands
bot.command(['start', 'help'], handleHelpCommand);
bot.command('rules', handleGetRules);
bot.command('setrules', handleSetRules);
bot.command('warn', handleWarn);
bot.command('mute', handleMute);
bot.command('unmute', handleUnmute);
bot.command('addadmin', handleAddAdmin);
bot.command('deladmin', handleDelAdmin);
bot.command('top', handleLeaderboard);
bot.command('stats', handleStats);
bot.command('predictions', handleMyPredictions);

// 4. Voice Messages
bot.on('message:voice', handleVoiceMessage);

// 5. Text Pattern & Keyword Listeners — همه فارسی، بدون اسلش
function normFa(s) {
  return (s || '')
    .replace(/ي/g, 'ی').replace(/ك/g, 'ک')
    .replace(/‌/g, ' ').replace(/\s+/g, ' ').trim();
}

bot.on('message:text', async (ctx) => {
  const raw = ctx.message.text || '';
  const text = normFa(raw);
  const hasReply = !!ctx.message.reply_to_message;

  // راهنما (شروع، کمک، دستورات هم قبول است)
  if (['راهنما', 'شروع', 'کمک', 'دستورات', 'دستور'].includes(text)) {
    return handleHelpCommand(ctx);
  }

  // قوانین
  if (text === 'قوانین' || text === 'قوانین گروه' || text === 'دستیار قوانین' || text === 'نمایش قوانین') {
    return handleGetRules(ctx);
  }

  // تنظیم قوانین (فقط مالک و مدیر)
  if (text.startsWith('تنظیم قوانین') || text.startsWith('تنظیم قانون')) {
    return handleSetRules(ctx);
  }

  // اخطار (ریپلای)
  if ((text === 'اخطار' || text === 'دستیار اخطار') && hasReply) {
    return handleWarn(ctx);
  }

  // سکوت (ریپلای) — مثال: سکوت ۱۵
  if ((text === 'سکوت' || text.startsWith('سکوت ') || text === 'دستیار سکوت' || text.startsWith('دستیار سکوت ')) && hasReply) {
    return handleMute(ctx);
  }

  // رفع سکوت (ریپلای)
  if ((text === 'رفع سکوت' || text === 'لغو سکوت' || text === 'دستیار رفع سکوت') && hasReply) {
    return handleUnmute(ctx);
  }

  // افزودن مدیر / حذف مدیر (ریپلای — فقط مالک)
  if ((text === 'افزودن مدیر' || text === 'اضافه کردن مدیر' || text === 'دستیار افزودن مدیر') && hasReply) {
    return handleAddAdmin(ctx);
  }
  if ((text === 'حذف مدیر' || text === 'دستیار حذف مدیر') && hasReply) {
    return handleDelAdmin(ctx);
  }

  // جدول امتیاز و برترین‌ها
  if (text.includes('برترین') || text.includes('برترین ها') || text.includes('رتبه بندی') || text.includes('لیدربورد') || text.includes('جدول امتیاز')) {
    return handleLeaderboard(ctx);
  }

  // آمار من
  if (text === 'آمار من' || text === 'آمار' || text === 'امتیاز من' || text === 'پروفایل من' || text === 'دستیار آمار') {
    return handleStats(ctx);
  }

  // پیش‌بینی‌های من
  if (text.includes('پیش بینی های من') || text.includes('پیشبینی های من')) {
    return handleMyPredictions(ctx);
  }

  // امتیاز دادن (ریپلای با: مثبت یک، +1، 👍)
  if ((text === 'مثبت یک' || text === '+' || text === '+1' || text === '👍' || text === 'دستیار مثبت یک') && hasReply) {
    return handleKarmaIncrement(ctx);
  }

  // تحلیل
  if (text.startsWith('دستیار تحلیل') || (text === 'تحلیل' && hasReply) || text.startsWith('تحلیل ')) {
    return handleAnalysisCommand(ctx);
  }

  // ثبت پیش‌بینی
  if (text.startsWith('دستیار پیش بینی') || text.startsWith('پیش بینی ')) {
    return handlePredictionCommand(ctx);
  }

  // قرعه‌کشی
  if (text.includes('قرعه کشی')) {
    return handleLottery(ctx);
  }

  // چیستان
  if (text.includes('چیستان')) {
    return handleRiddle(ctx);
  }

  // جوک
  if (text.includes('جوک') || text.includes('لطیفه')) {
    return handleJoke(ctx);
  }

  // نظرسنجی
  if (text.startsWith('دستیار نظرسنجی') || text.startsWith('نظرسنجی ')) {
    return handlePollGenerator(ctx);
  }

  // گزارش
  if (text.includes('گزارش')) {
    return handleInstantReport(ctx);
  }

  // ترجمه و ویراستاری با متن ساده هم کار کنند
  if (text.startsWith('ترجمه') || text.startsWith('ویراستاری') || text.startsWith('خلاصه')) {
    return handleAIChat(ctx);
  }

  // گفتگوی آزاد با کلمه دستیار یا ریپلای روی پیام ربات
  const isReplyToBot = ctx.message.reply_to_message && ctx.message.reply_to_message.from && ctx.message.reply_to_message.from.id === ctx.me.id;
  const isKeywordCall = text.includes('دستیار');

  if (isKeywordCall || isReplyToBot) {
    return handleAIChat(ctx);
  }
});

// Initialize Cron
initDailyReportCron(bot);

// Error Handling
bot.catch((err) => {
  console.error('Bot Runtime Error:', err);
});

// Health server (required for Render/Railway free hosting) + webhook support
const express = require('express');
const app = express();
app.use(express.json());
app.get('/', (req, res) => res.send('🤖 Bot is alive!'));
app.get('/health', (req, res) => res.json({ status: 'ok', uptime: process.uptime() }));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🌐 Health server on port ${PORT}`));

async function startBot() {
  console.log('🚀 Telegram Assistant Bot is starting...');
  const WEBHOOK_URL = process.env.WEBHOOK_URL || process.env.RENDER_EXTERNAL_URL;

  if (WEBHOOK_URL) {
    // Webhook mode (24/7 hosting: Render / Railway)
    const { webhookCallback } = require('grammy');
    const secretPath = process.env.WEBHOOK_SECRET || 'telegram-webhook';
    app.use(`/${secretPath}`, webhookCallback(bot, 'express'));
    const fullUrl = `${WEBHOOK_URL.replace(/\/$/, '')}/${secretPath}`;
    try {
      await bot.api.setWebhook(fullUrl, { drop_pending_updates: false });
      const me = await bot.api.getMe();
      console.log(`✅ Bot @${me.username} in WEBHOOK mode: ${fullUrl}`);
    } catch (e) {
      console.error('Webhook setup failed, fallback to polling:', e.message);
      bot.start({
        onStart: (botInfo) => console.log(`✅ Bot @${botInfo.username} (polling fallback) online!`),
      });
    }
  } else {
    // Local mode (your PC)
    try { await bot.api.deleteWebhook({ drop_pending_updates: true }); } catch (e) {}
    bot.start({
      onStart: (botInfo) => {
        console.log(`✅ Bot @${botInfo.username} (${botInfo.first_name}) is online and listening! (polling)`);
      },
    });
  }
}

startBot();
