const DB = require('../db');

/**
 * Handles bot added to a new chat
 */
async function handleNewChatMembers(ctx) {
  const newMembers = ctx.message.new_chat_members;
  const botId = ctx.me.id;

  const isBotAdded = newMembers.some(m => m.id === botId);

  if (isBotAdded) {
    const welcomeText = `سلام اعضای گرامی گروه! 👋
من **دستیار هوشمند گروه** هستم 🤖

لطفاً من را به عنوان **ادمین گروه (Administrator)** قرار دهید تا بتوانم تمام قابلیت‌های تحلیلی، مدیریتی، حافظه اختصاصی اعضا و فیلترها را فعال کنم! 🚀

📌 پس از ادمین کردن، کلمه **\`راهنما\`** را ارسال کنید.`;

    await ctx.reply(welcomeText, { parse_mode: 'Markdown' });
  } else {
    // Welcome regular members if custom welcome exists
    const chatId = ctx.chat.id;
    const settings = await DB.getGroupSettings(chatId);
    if (settings && settings.welcome_message) {
      const names = newMembers.map(m => m.first_name).join(', ');
      await ctx.reply(`${settings.welcome_message}\n\nخوش آمدید ${names} عزیز! 👋`);
    }
  }
}

/**
 * Handles bot promotion to administrator
 */
async function handleBotPromotion(ctx) {
  const oldStatus = ctx.myChatMember.old_chat_member.status;
  const newStatus = ctx.myChatMember.new_chat_member.status;

  if (oldStatus !== 'administrator' && newStatus === 'administrator') {
    const chatId = ctx.chat.id;
    const promoterId = ctx.from.id;

    // Set group owner to promoter
    await DB.setGroupOwner(chatId, promoterId);

    const installedText = `🎉 **ربات با موفقیت نصب و به عنوان مدیر گروه فعال شد!**

تمام قابلیت‌های هوشمند اکنون در دسترس شماست:
🔹 حافظه بلندمدت و پروفایل اعضا (سبک میرا)
🔹 تحلیل اخبار، پست‌ها و ویس‌ها
🔹 گزارش اتوماتیک روزانه
🔹 سیستم امتیازدهی و لیدربورد اعضا

برای شروع، کلمه **\`راهنما\`** را در گروه ارسال کنید!`;

    await ctx.reply(installedText, { parse_mode: 'Markdown' });
  }
}

module.exports = { handleNewChatMembers, handleBotPromotion };
