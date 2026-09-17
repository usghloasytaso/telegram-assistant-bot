const DB = require('../db');

/**
 * Checks if a user is Owner, Admin, or Regular Member.
 * Roles: 'owner' | 'admin' | 'member'
 */
async function getUserRole(ctx) {
  if (!ctx.chat || (ctx.chat.type !== 'group' && ctx.chat.type !== 'supergroup')) {
    return 'owner'; // In private chat, treat as owner/full access
  }

  const chatId = ctx.chat.id;
  const userId = ctx.from.id;

  // 1. Check if DB has specified an owner
  const settings = await DB.getGroupSettings(chatId);
  if (settings && settings.owner_id && String(settings.owner_id) === String(userId)) {
    return 'owner';
  }

  // 2. Check Telegram administrators
  try {
    const member = await ctx.api.getChatMember(chatId, userId);
    if (member.status === 'creator') {
      // Set as owner in DB if not set
      if (!settings || !settings.owner_id) {
        await DB.setGroupOwner(chatId, userId);
      }
      return 'owner';
    }
    if (member.status === 'administrator') {
      return 'admin';
    }
  } catch (err) {
    console.error("Error getting chat member:", err.message);
  }

  // 3. Check custom admins added via bot
  const customAdmins = await DB.getCustomAdmins(chatId);
  if (customAdmins.includes(String(userId))) {
    return 'admin';
  }

  return 'member';
}

module.exports = { getUserRole };
