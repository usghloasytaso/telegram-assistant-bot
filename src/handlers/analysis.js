const DB = require('../db');
const { analyzeNewsPost } = require('../ai/groq');

/**
 * Handles "دستیار تحلیل" for posts/news
 */
async function handleAnalysisCommand(ctx) {
  const text = (ctx.message.text || '').replace(/ي/g, 'ی').replace(/ك/g, 'ک').replace(/‌/g, ' ');
  let targetPost = text.replace(/^دستیار\s*تحلیل/i, '').replace(/^تحلیل/, '').trim();

  // If replied to a post/message
  if (!targetPost && ctx.message.reply_to_message && ctx.message.reply_to_message.text) {
    targetPost = ctx.message.reply_to_message.text;
  }

  if (!targetPost) {
    return ctx.reply('لطفاً خبر را بعد از دستور بنویسید یا روی یک پیام ریپلای بزنید و بنویسید: تحلیل');
  }

  await ctx.replyWithChatAction('typing');

  const senderName = ctx.message.reply_to_message ? ctx.message.reply_to_message.from.first_name : ctx.from.first_name;
  const analysisResult = await analyzeNewsPost(targetPost, `ارسال شده توسط ${senderName}`);

    try {
    await ctx.reply(analysisResult, {
      reply_to_message_id: ctx.message.message_id,
      parse_mode: 'Markdown'
    });
  } catch (e) {
    await ctx.reply(analysisResult);
  }
}

/**
 * Handles prediction registration: "دستیار پیش‌بینی [متن]"
 */
async function handlePredictionCommand(ctx) {
  const text = (ctx.message.text || '').replace(/ي/g, 'ی').replace(/ك/g, 'ک').replace(/‌/g, ' ');
  const predictionText = text.replace(/^دستیار\s*پیش\s*بینی/i, '').replace(/^پیش\s*بینی/, '').trim();

  if (!predictionText) {
    return ctx.reply('لطفاً متن پیش بینی را بعد از دستور بنویسید.\nمثال: پیش بینی بیت کوین تا آخر ماه بالا می رود');
  }

  const chatId = ctx.chat.id;
  const userId = ctx.from.id;
  const username = ctx.from.username;

  await DB.addPrediction(chatId, userId, username, predictionText);

  const responseText = `🎯 **پیش‌بینی شما با موفقیت در تاریخچه گروه ثبت شد!**

📝 **متن پیش‌بینی:** ${predictionText}
👤 **تحلیل‌گر:** ${ctx.from.first_name}

ربات در آینده این پیش‌بینی را آرشیو کرده و میزان دقت آن را بررسی خواهد نمود. 📈`;

  await ctx.reply(responseText, { parse_mode: 'Markdown' });
}

/**
 * Lists user predictions
 */
async function handleMyPredictions(ctx) {
  const chatId = ctx.chat.id;
  const userId = ctx.from.id;

  const predictions = await DB.getUserPredictions(chatId, userId);

  if (!predictions || predictions.length === 0) {
    return ctx.reply('شما هنوز هیچ پیش‌بینی ثبت‌شده‌ای در این گروه ندارید.');
  }

  let result = `🔮 **پیش‌بینی‌های ثبت‌شده ${ctx.from.first_name}:**\n\n`;
  predictions.forEach((p, idx) => {
    const statusIcon = p.status === 'correct' ? '✅' : p.status === 'wrong' ? '❌' : '⏳';
    result += `${idx + 1}. ${statusIcon} ${p.prediction_text}\nتاریخ: ${new Date(p.created_at).toLocaleDateString('fa-IR')}\n\n`;
  });

  await ctx.reply(result, { parse_mode: 'Markdown' });
}

module.exports = {
  handleAnalysisCommand,
  handlePredictionCommand,
  handleMyPredictions
};
