const DB = require('../db');

/**
 * Handles Karma increments (+1 or + or 👍)
 */
async function handleKarmaIncrement(ctx) {
  if (!ctx.message.reply_to_message) return;

  const targetUser = ctx.message.reply_to_message.from;
  const giverUser = ctx.from;

  // Prevent self karma
  if (targetUser.id === giverUser.id) {
    return ctx.reply('شما نمی‌توانید به خودتان امتیاز کارما بدهید! 😄');
  }

  // Prevent giving karma to bots
  if (targetUser.is_bot) {
    return ctx.reply('ربات‌ها نیاز به امتیاز کارما ندارند! 🤖');
  }

  const chatId = ctx.chat.id;
  const newKarma = await DB.updateKarma(chatId, targetUser.id, 1);

  await ctx.reply(`⭐ **+1 امتیاز کارما به ${targetUser.first_name} اهداء شد!**\nمجموع کارمای فعلی: **${newKarma}**`, { parse_mode: 'Markdown' });
}

/**
 * Displays Top Leaderboard (/top or "دستیار لیدربورد")
 */
async function handleLeaderboard(ctx) {
  const chatId = ctx.chat.id;
  const topUsers = await DB.getTopLeaderboard(chatId, 10);

  if (!topUsers || topUsers.length === 0) {
    return ctx.reply('هنوز هیچ رتبه‌بندی کارمایی در این گروه ثبت نشده است.');
  }

  let text = `🏆 **جدول برترین تحلیل‌گران و اعضای معتبر گروه (Leaderboard)**\n\n`;
  const medals = ['🥇', '🥈', '🥉', '4️⃣', '5️⃣', '6️⃣', '7️⃣', '8️⃣', '9️⃣', '🔟'];

  topUsers.forEach((u, idx) => {
    const medal = medals[idx] || '👤';
    const name = u.first_name || (u.username ? `@${u.username}` : 'کاربر');
    text += `${medal} **${name}** — ⭐ ${u.karma || 0} کارما | 💬 ${u.messages_count || 0} پیام\n`;
  });

  await ctx.reply(text, { parse_mode: 'Markdown' });
}

/**
 * Displays personal stats (/stats)
 */
async function handleStats(ctx) {
  const chatId = ctx.chat.id;
  const userId = ctx.from.id;

  const profile = await DB.getUserProfile(chatId, userId);

  const karma = profile ? (profile.karma || 0) : 0;
  const msgCount = profile ? (profile.messages_count || 0) : 1;
  const trait = profile ? (profile.personality_summary || 'عضو فعال') : 'عضو جدید';

  const statsText = `📊 **شناسنامه تحلیلی و آمار ${ctx.from.first_name}:**

⭐ **امتیاز اعتبار (Karma):** ${karma}
💬 **تعداد گفتگوها:** ${msgCount}
🧠 **شناخت دستیار از شما:** ${trait}
📅 **آخرین فعالیت:** هم‌اکنون`;

  await ctx.reply(statsText, { parse_mode: 'Markdown' });
}

module.exports = {
  handleKarmaIncrement,
  handleLeaderboard,
  handleStats
};
