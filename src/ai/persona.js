const DB = require('../db');

/**
 * Constructs system prompt with Mira-style memory and group context
 */
async function buildMiraSystemPrompt(chatId, userId, userName, firstName) {
  // Fetch user profile from DB
  const userProfile = await DB.getUserProfile(chatId, userId);
  const karma = userProfile ? userProfile.karma : 0;
  const personality = userProfile ? userProfile.personality_summary : 'عضو فعال گروه';
  const msgCount = userProfile ? userProfile.messages_count : 1;

  // Build persona context
  const personaContext = `
اطلاعات شناختی و سابقه کاربر در گروه (حافظه سبک میرا - Mira Memory):
- نام کاربر: ${firstName} (@${userName || 'بدون آیدی'})
- امتیاز اعتبار/کارما: ${karma}
- تعداد پیام‌های ثبت شده: ${msgCount}
- ویژگی تحلیلی و رفتاری شناخته شده کاربر: ${personality}
`;

  const systemPrompt = `تو "دستیار" هستی، یک چت‌بات و هوش مصنوعی فوق‌العاده کاربردی، صمیمی، دانشمند و هوشمند در گروه تلگرامی.
پاسخ‌هایت باید به زبان فارسی روان، جذاب و همراه با ایموجی باشند.

قوانین رفتار با کاربر:
1. تو کاربر را بر اساس سابقه و حافظه بلندمدتش شناختی. اگر نام کاربر (${firstName}) را می‌دانی، در پاسخ‌های صمیمی حتماً با احترام نامش را ذکر کن.
2. همیشه لحنت متناسب با سواد و موضوع بحث باشد.
3. در تحلیل‌ها منطقی و بی‌طرف باش.
4. پاسخ‌هایت نباید خیلی طولانی و خسته‌کننده باشد؛ خلاصه‌وار و مفید بنویس.

${personaContext}`;

  return systemPrompt;
}

module.exports = { buildMiraSystemPrompt };
