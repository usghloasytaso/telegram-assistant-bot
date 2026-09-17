const DB = require('../db');
const { getUserRole } = require('../utils/permissions');

/**
 * Warn user
 */
async function handleWarn(ctx) {
  const role = await getUserRole(ctx);
  if (role === 'member') {
    return ctx.reply('⚠️ شما دسترسی مدیریتی برای اخطار دادن ندارید.');
  }

  if (!ctx.message.reply_to_message) {
    return ctx.reply('لطفاً روی پیام کاربری که قصد دادن اخطار به او را دارید ریپلای کنید.');
  }

  const targetUser = ctx.message.reply_to_message.from;
  await ctx.reply(`⚠️ **اخطار رسمی به ${targetUser.first_name} (@${targetUser.username || 'بدون آیدی'})**\nلطفاً قوانین گروه را رعایت کنید!`, { parse_mode: 'Markdown' });
}

/**
 * Mute user
 */
async function handleMute(ctx) {
  const role = await getUserRole(ctx);
  if (role === 'member') {
    return ctx.reply('⚠️ شما دسترسی مدیریتی برای سکوت کاربر ندارید.');
  }

  if (!ctx.message.reply_to_message) {
    return ctx.reply('لطفاً روی پیام کاربر مورد نظر ریپلای کنید و بنویسید: سکوت ۱۵');
  }

  const targetUser = ctx.message.reply_to_message.from;
  const faDigits = { '۰': '0', '۱': '1', '۲': '2', '۳': '3', '۴': '4', '۵': '5', '۶': '6', '۷': '7', '۸': '8', '۹': '9' };
  const normalizedNums = ctx.message.text.replace(/[۰-۹]/g, d => faDigits[d]);
  const args = normalizedNums.split(' ');
  const minutes = parseInt(args[1]) || 15;
  const untilDate = Math.floor(Date.now() / 1000) + (minutes * 60);

  try {
    await ctx.api.restrictChatMember(ctx.chat.id, targetUser.id, {
      can_send_messages: false,
      until_date: untilDate
    });
    await ctx.reply(`🤐 **کاربر ${targetUser.first_name} به مدت ${minutes} دقیقه در گروه سکوت شد.**`, { parse_mode: 'Markdown' });
  } catch (err) {
    await ctx.reply(`خطا در سکوت کاربر: ربات باید دسترسی Restrict Members داشته باشد.`);
  }
}

/**
 * Unmute user
 */
async function handleUnmute(ctx) {
  const role = await getUserRole(ctx);
  if (role === 'member') {
    return ctx.reply('⚠️ شما دسترسی مدیریتی ندارید.');
  }

  if (!ctx.message.reply_to_message) {
    return ctx.reply('لطفاً روی پیام کاربر مورد نظر ریپلای کنید.');
  }

  const targetUser = ctx.message.reply_to_message.from;

  try {
    await ctx.api.restrictChatMember(ctx.chat.id, targetUser.id, {
      can_send_messages: true,
      can_send_audios: true,
      can_send_documents: true,
      can_send_photos: true,
      can_send_videos: true,
      can_send_other_messages: true
    });
    await ctx.reply(`🔊 **حالت سکوت کاربر ${targetUser.first_name} برداشته شد.**`, { parse_mode: 'Markdown' });
  } catch (err) {
    await ctx.reply(`خطا در برداشته شدن سکوت کاربر.`);
  }
}

/**
 * Set rules (/setrules [text])
 */
async function handleSetRules(ctx) {
  const role = await getUserRole(ctx);
  if (role === 'member') {
    return ctx.reply('⚠️ فقط مالکان و ادمین‌های گروه می‌توانند قوانین را تنظیم کنند.');
  }

  let rulesText = ctx.message.text.trim();
  rulesText = rulesText.replace('/setrules', '').replace('تنظیم قوانین', '').replace('تنظیم قانون', '').trim();
  if (!rulesText) {
    return ctx.reply('لطفاً متن قوانین را بعد از دستور بنویسید.\nمثال: تنظیم قوانین ۱. احترام متقابل ۲. عدم ارسال لینک تبلیغاتی');
  }

  await DB.upsertGroupSettings(ctx.chat.id, { rules: rulesText });
  await ctx.reply('📜 **قوانین جدید گروه با موفقیت ثبت شد!**', { parse_mode: 'Markdown' });
}

/**
 * View rules (/rules or "دستیار قوانین")
 */
async function handleGetRules(ctx) {
  const settings = await DB.getGroupSettings(ctx.chat.id);
  const rules = settings ? settings.rules : 'هنوز قانونی برای این گروه ثبت نشده است.';
  await ctx.reply(`📜 **قوانین رسمی گروه:**\n\n${rules}`, { parse_mode: 'Markdown' });
}

/**
 * Add custom admin (/addadmin)
 */
async function handleAddAdmin(ctx) {
  const role = await getUserRole(ctx);
  if (role !== 'owner') {
    return ctx.reply('👑 این دستور فقط مخصوص مالکان گروه (Owner) است.');
  }

  if (!ctx.message.reply_to_message) {
    return ctx.reply('لطفاً روی پیام کاربری که قصد ادمین کردن او در ربات را دارید ریپلای کنید.');
  }

  const targetUser = ctx.message.reply_to_message.from;
  await DB.addAdmin(ctx.chat.id, targetUser.id);
  await ctx.reply(`🛡 **کاربر ${targetUser.first_name} به لیست ادمین‌های ربات اضافه شد.**`, { parse_mode: 'Markdown' });
}

/**
 * Remove custom admin (/deladmin)
 */
async function handleDelAdmin(ctx) {
  const role = await getUserRole(ctx);
  if (role !== 'owner') {
    return ctx.reply('👑 این دستور فقط مخصوص مالکان گروه است.');
  }

  if (!ctx.message.reply_to_message) {
    return ctx.reply('لطفاً روی پیام کاربر ریپلای کنید.');
  }

  const targetUser = ctx.message.reply_to_message.from;
  await DB.removeAdmin(ctx.chat.id, targetUser.id);
  await ctx.reply(`❌ **دسترسی ادمینی ربات برای ${targetUser.first_name} حذف شد.**`, { parse_mode: 'Markdown' });
}

/**
 * Auto Spam filter check
 */
async function checkSpamFilter(ctx) {
  if (!ctx.chat || ctx.chat.type === 'private') return false;

  const role = await getUserRole(ctx);
  if (role === 'owner' || role === 'admin') return false; // Don't check admins

  const text = ctx.message.text || ctx.message.caption || '';
  const settings = await DB.getGroupSettings(ctx.chat.id);
  if (!settings || settings.spam_filter_enabled === 0 || settings.spam_filter_enabled === false) return false;

  // Telegram link detection regex
  const linkRegex = /(https?:\/\/|t\.me\/|telegram\.me\/|[a-zA-Z0-9-]+\.com|\@[a-zA-Z0-9_]{5,})/gi;
  if (linkRegex.test(text)) {
    try {
      await ctx.deleteMessage();
      await ctx.reply(`⚠️ **کاربر ${ctx.from.first_name}، ارسال لینک و تبلیغات در این گروه مجاز نیست.**`, { parse_mode: 'Markdown' });
      return true;
    } catch (e) {}
  }

  return false;
}

module.exports = {
  handleWarn,
  handleMute,
  handleUnmute,
  handleSetRules,
  handleGetRules,
  handleAddAdmin,
  handleDelAdmin,
  checkSpamFilter
};
