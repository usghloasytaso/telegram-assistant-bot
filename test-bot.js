const { Bot } = require('grammy');
require('dotenv').config();

const bot = new Bot(process.env.TELEGRAM_BOT_TOKEN);

async function testBot() {
  try {
    const me = await bot.api.getMe();
    console.log("Bot Connected Successfully!");
    console.log("Bot Name:", me.first_name);
    console.log("Bot Username: @" + me.username);
  } catch (err) {
    console.error("Bot Connection Error:", err.message);
  }
}

testBot();
