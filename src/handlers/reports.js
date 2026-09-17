const DB = require('../db');
const { generateDailyReport } = require('../ai/groq');
const cron = require('node-cron');

/**
 * Handles "دستیار گزارش"
 */
async function handleInstantReport(ctx) {
  await ctx.replyWithChatAction('typing');

  const chatId = ctx.chat.id;
  const recentMsgs = await DB.getRecentMessages(chatId, 40);

  if (!recentMsgs || recentMsgs.length < 5) {
    return ctx.reply('هنوز پیام کافی در تاریخچه گروه برای ارائه گزارش تحلیلی ثبت نشده است.');
  }

  const report = await generateDailyReport(recentMsgs);
  await ctx.reply(`📊 **گزارش تحلیلی و مدیریتی گروه:**\n\n${report}`, { parse_mode: 'Markdown' });
}

/**
 * Initializes automatic daily report cron (runs every day at 23:00 / 11 PM)
 */
function initDailyReportCron(bot) {
  // Cron schedule: At 23:00 every day
  cron.schedule('0 23 * * *', async () => {
    console.log('Running daily group report cron job...');
    try {
      // In a real environment, we would iterate through active installed groups
      // Here we log the scheduled status
    } catch (err) {
      console.error('Error in daily report cron:', err.message);
    }
  });
}

module.exports = {
  handleInstantReport,
  initDailyReportCron
};
