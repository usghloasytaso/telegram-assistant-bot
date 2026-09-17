const axios = require('axios');
const fs = require('fs');
const path = require('path');
const { transcribeAudio, generateAIResponse, analyzeNewsPost } = require('../ai/groq');
const { buildMiraSystemPrompt } = require('../ai/persona');

const tempDir = path.join(__dirname, '../../temp');
if (!fs.existsSync(tempDir)) {
  fs.mkdirSync(tempDir, { recursive: true });
}

/**
 * Handles voice messages
 */
async function handleVoiceMessage(ctx) {
  const message = ctx.message;
  const voice = message.voice;
  if (!voice) return;

  const caption = message.caption || '';
  const isReply = message.reply_to_message && message.reply_to_message.voice;
  const isDirectVoiceCall = caption.includes('دستیار');

  // If replied to a voice message with "دستیار" or "دستیار تحلیل"
  let isAnalysisNeeded = false;
  let targetVoice = voice;

  if (isReply) {
    const replyText = message.text || '';
    if (!replyText.includes('دستیار')) return;
    targetVoice = message.reply_to_message.voice;
    if (replyText.includes('تحلیل')) {
      isAnalysisNeeded = true;
    }
  } else if (!isDirectVoiceCall) {
    return; // Ignore normal un-targeted voice messages
  }

  const statusMsg = await ctx.reply('🎙 **در حال دریافت ویس و تبدیل صوت به متن (Whisper)...**', { parse_mode: 'Markdown' });

  try {
    // Get file link from Telegram
    const file = await ctx.api.getFile(targetVoice.file_id);
    const fileUrl = `https://api.telegram.org/file/bot${process.env.TELEGRAM_BOT_TOKEN}/${file.file_path}`;

    // Download voice file locally
    const filePath = path.join(tempDir, `${targetVoice.file_unique_id}.ogg`);
    const response = await axios({
      method: 'GET',
      url: fileUrl,
      responseType: 'stream'
    });

    const writer = fs.createWriteStream(filePath);
    response.data.pipe(writer);

    await new Promise((resolve, reject) => {
      writer.on('finish', resolve);
      writer.on('error', reject);
    });

    // Transcribe via Groq Whisper API
    const transcribedText = await transcribeAudio(filePath);

    // Clean up local temp file
    try { fs.unlinkSync(filePath); } catch (e) {}

    if (!transcribedText) {
      return ctx.api.editMessageText(ctx.chat.id, statusMsg.message_id, 'متأسفانه صوت واضح نبود یا مشکلی در تبدیل ویس به متن پیش آمد.');
    }

    if (isAnalysisNeeded) {
      await ctx.api.editMessageText(ctx.chat.id, statusMsg.message_id, `📝 **متن پیاده‌شده از ویس:**\n"${transcribedText}"\n\n🔍 **در حال تحلیل هوشمند...**`, { parse_mode: 'Markdown' });
      const analysis = await analyzeNewsPost(transcribedText, `ویس ارسال شده توسط ${ctx.from.first_name}`);
      return ctx.reply(`🎙 **پیاده‌سازی و تحلیل ویس:**\n\n📝 **متن ویس:**\n${transcribedText}\n\n${analysis}`, { parse_mode: 'Markdown' });
    }

    // Direct AI reply to transcribed text
    await ctx.api.editMessageText(ctx.chat.id, statusMsg.message_id, `📝 **متن ویس:**\n"${transcribedText}"\n\n💭 **در حال پاسخ...**`, { parse_mode: 'Markdown' });

    const systemPrompt = await buildMiraSystemPrompt(ctx.chat.id, ctx.from.id, ctx.from.username, ctx.from.first_name);
    const aiResponse = await generateAIResponse(`متن ویس کاربر: "${transcribedText}"`, systemPrompt, [], 600);

    return ctx.reply(`🎙 **متن ویس شما:**\n"${transcribedText}"\n\n🤖 **پاسخ دستیار:**\n${aiResponse}`, { parse_mode: 'Markdown' });

  } catch (err) {
    console.error('Voice Handling Error:', err.message);
    return ctx.api.editMessageText(ctx.chat.id, statusMsg.message_id, 'خطایی در پردازش ویس رخ داد.');
  }
}

module.exports = { handleVoiceMessage };
