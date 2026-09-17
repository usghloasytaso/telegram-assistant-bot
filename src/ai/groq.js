const { Groq } = require('groq-sdk');
const fs = require('fs');
require('dotenv').config();

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
const TEXT_MODEL = 'qwen/qwen3.8-27b';
const VOICE_MODEL = 'whisper-large-v3-turbo';

/**
 * Generates AI text response with optional system instructions and history
 */
async function generateAIResponse(prompt, systemPrompt = '', history = [], maxTokens = 1000) {
  try {
    const messages = [];

    if (systemPrompt) {
      messages.push({ role: 'system', content: systemPrompt });
    }

    // Append context history if provided
    for (const h of history) {
      messages.push({
        role: h.role || 'user',
        content: h.content || h.message_text
      });
    }

    messages.push({ role: 'user', content: prompt });

    const completion = await groq.chat.completions.create({
      model: TEXT_MODEL,
      messages: messages,
      temperature: 0.7,
      max_tokens: maxTokens,
    });

    return completion.choices[0]?.message?.content || 'متأسفانه نتوانستم پاسخی تولید کنم.';
  } catch (err) {
    console.error('Groq AI Error:', err.message);
    return 'خطا در برقراری ارتباط با هوش مصنوعی. لطفاً دوباره تلاش کنید.';
  }
}

/**
 * Transcribes audio file using Groq Whisper API
 */
async function transcribeAudio(filePath) {
  try {
    const fileStream = fs.createReadStream(filePath);
    const translation = await groq.audio.transcriptions.create({
      file: fileStream,
      model: VOICE_MODEL,
      language: 'fa', // Persian language code
      response_format: 'json',
    });

    return translation.text || '';
  } catch (err) {
    console.error('Groq Whisper Error:', err.message);
    return null;
  }
}

/**
 * Analyzes news or post content
 */
async function analyzeNewsPost(content, userContext = '') {
  const systemPrompt = `تو یک تحلیل‌گر ارشد اخبار و داده‌های اقتصادی، کریپتو و بورس به زبان فارسی هستی.
وظیفه تو این است که متن یا خبر ورودی را به‌صورت کاملاً دقیق، ساختاریافته و بی‌طرفانه تحلیل کنی.
ارائه خروجی شامل بخش‌های زیر باشد:
📌 **خلاصه خبر / نکات کلیدی**
⚠️ **فرصت‌ها و ریسک‌های احتمالی**
📊 **سنجش فکت‌ها و میزان هیجان موجود در خبر** (مثلاً: هیجانی / منطقی / تایید نشده)
💡 **جمع‌بندی تحلیلی**

لحن: حرفه‌ای، محترمانه و دقیق همراه با ایموجی.`;

  const prompt = `متن جهت تحلیل:\n"${content}"\n\n${userContext ? `اطلاعات کاربر ارسال‌کننده: ${userContext}` : ''}`;
  return await generateAIResponse(prompt, systemPrompt, [], 800);
}

/**
 * Generates Daily Executive Summary for group
 */
async function generateDailyReport(messages) {
  const formattedMessages = messages
    .map(m => `- [${m.first_name || 'کاربر'}]: ${m.message_text}`)
    .join('\n');

  const systemPrompt = `تو یک مدیر هوشمند گزارش‌گیری گروه هستی.
بر اساس چت‌ها و گفتگوهای اخیر گروه، یک "گزارش جامع روزانه" به زبان فارسی روان شامل بخش‌های زیر بساز:
📊 **موضوعات داغ و ترندهای امروز گروه**
🌟 **تحلیل‌گران و اعضای برجسته امروز**
📰 **خلاصه مهم‌ترین اخبار و تحلیل‌های مطرح شده**
🔮 **جمع‌بندی روحیات و جو کلی گروه (مثلاً صعودی، نزولی، طنز یا نگرانی)**

پاسخ را بسیار شکیل و با ایموجی تنظیم کن.`;

  const prompt = `چت‌های امروز گروه:\n${formattedMessages}`;
  return await generateAIResponse(prompt, systemPrompt, [], 1000);
}

/**
 * Translation tool
 */
async function translateText(text, targetLang = 'fa') {
  const systemPrompt = `تو یک مترجم پیشرفته و روان هستی. متن زیر را به زبان ${targetLang === 'fa' ? 'فارسی روان و روان‌شناختی' : 'انگلیسی استاندارد'} ترجمه کن. فقط خود ترجمه را خروجی بده.`;
  return await generateAIResponse(text, systemPrompt, [], 500);
}

/**
 * Proofreading / Editing tool
 */
async function proofreadText(text) {
  const systemPrompt = `تو یک ویراستار ادبی و نگارشی زبان فارسی هستی. متن زیر را از نظر غلط‌های املایی، نگارشی و روان بودن ویرایش کن و نسخه اصلاح‌شده شکیل را تحویل بده.`;
  return await generateAIResponse(text, systemPrompt, [], 500);
}

module.exports = {
  generateAIResponse,
  transcribeAudio,
  analyzeNewsPost,
  generateDailyReport,
  translateText,
  proofreadText
};
