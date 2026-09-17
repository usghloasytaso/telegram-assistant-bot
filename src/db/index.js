const { createClient } = require('@supabase/supabase-js');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

// Initialize local SQLite fallback (optional — on cloud hosts without native build, use Supabase only)
let localDb = null;
try {
  const Database = require('better-sqlite3');
  const dataDir = path.join(__dirname, '../../data');
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
  localDb = new Database(path.join(dataDir, 'bot.db'));
} catch (e) {
  console.log('⚠️ better-sqlite3 not available, using Supabase only:', e.message);
}

function localExec(sql) {
  if (!localDb) return;
  try { localDb.exec(sql); } catch (e) {}
}
function localPrepare(sql) {
  if (!localDb) return { get: () => null, run: () => {}, all: () => [] };
  try { return localPrepare(sql); } catch (e) { return { get: () => null, run: () => {}, all: () => [] }; }
}

// Initialize Local Tables
localExec(`
  CREATE TABLE IF NOT EXISTS group_settings (
    chat_id TEXT PRIMARY KEY,
    owner_id TEXT,
    rules TEXT DEFAULT 'هنوز قانونی برای این گروه تنظیم نشده است.',
    welcome_message TEXT DEFAULT 'به گروه خوش آمدید! 👋',
    is_installed INTEGER DEFAULT 1,
    spam_filter_enabled INTEGER DEFAULT 1,
    daily_report_enabled INTEGER DEFAULT 1,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS group_admins (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    chat_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(chat_id, user_id)
  );

  CREATE TABLE IF NOT EXISTS user_profiles (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    chat_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    username TEXT,
    first_name TEXT,
    karma INTEGER DEFAULT 0,
    messages_count INTEGER DEFAULT 0,
    personality_summary TEXT DEFAULT 'عضو فعال گروه',
    last_analysis TEXT,
    last_active TEXT DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(chat_id, user_id)
  );

  CREATE TABLE IF NOT EXISTS messages_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    chat_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    username TEXT,
    first_name TEXT,
    message_text TEXT NOT NULL,
    msg_type TEXT DEFAULT 'chat',
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS predictions_track (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    chat_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    username TEXT,
    prediction_text TEXT NOT NULL,
    status TEXT DEFAULT 'pending',
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  );
`);

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);
let useSupabase = true;

class DB {
  static async getGroupSettings(chatId) {
    const sChatId = String(chatId);
    if (useSupabase) {
      try {
        const { data, error } = await supabase
          .from('group_settings')
          .select('*')
          .eq('chat_id', sChatId)
          .maybeSingle();

        if (!error && data) return data;
        if (error && error.code === '42P01') {
          useSupabase = false; // Table doesn't exist yet in Supabase
        }
      } catch (err) {
        useSupabase = false;
      }
    }
    // Local SQLite fallback
    const row = localPrepare('SELECT * FROM group_settings WHERE chat_id = ?').get(sChatId);
    return row || null;
  }

  static async upsertGroupSettings(chatId, fields) {
    const sChatId = String(chatId);
    if (useSupabase) {
      try {
        const payload = { chat_id: sChatId, ...fields };
        const { error } = await supabase.from('group_settings').upsert(payload, { onConflict: 'chat_id' });
        if (error && error.code === '42P01') useSupabase = false;
      } catch (err) {
        useSupabase = false;
      }
    }
    // Local SQLite
    const existing = localPrepare('SELECT * FROM group_settings WHERE chat_id = ?').get(sChatId);
    if (existing) {
      const keys = Object.keys(fields).map(k => `${k} = ?`).join(', ');
      const values = [...Object.values(fields), sChatId];
      localPrepare(`UPDATE group_settings SET ${keys} WHERE chat_id = ?`).run(...values);
    } else {
      const keys = ['chat_id', ...Object.keys(fields)];
      const placeholders = keys.map(() => '?').join(', ');
      const values = [sChatId, ...Object.values(fields)];
      localPrepare(`INSERT INTO group_settings (${keys.join(', ')}) VALUES (${placeholders})`).run(...values);
    }
  }

  static async setGroupOwner(chatId, ownerId) {
    await this.upsertGroupSettings(chatId, { owner_id: String(ownerId), is_installed: 1 });
  }

  static async addAdmin(chatId, userId) {
    const sChatId = String(chatId);
    const sUserId = String(userId);
    if (useSupabase) {
      try {
        await supabase.from('group_admins').upsert({ chat_id: sChatId, user_id: sUserId });
      } catch (e) {}
    }
    try {
      localPrepare('INSERT OR IGNORE INTO group_admins (chat_id, user_id) VALUES (?, ?)').run(sChatId, sUserId);
    } catch (e) {}
  }

  static async removeAdmin(chatId, userId) {
    const sChatId = String(chatId);
    const sUserId = String(userId);
    if (useSupabase) {
      try {
        await supabase.from('group_admins').delete().eq('chat_id', sChatId).eq('user_id', sUserId);
      } catch (e) {}
    }
    localPrepare('DELETE FROM group_admins WHERE chat_id = ? AND user_id = ?').run(sChatId, sUserId);
  }

  static async getCustomAdmins(chatId) {
    const sChatId = String(chatId);
    if (useSupabase) {
      try {
        const { data, error } = await supabase.from('group_admins').select('user_id').eq('chat_id', sChatId);
        if (!error && data) return data.map(d => String(d.user_id));
      } catch (e) {}
    }
    const rows = localPrepare('SELECT user_id FROM group_admins WHERE chat_id = ?').all(sChatId);
    return rows.map(r => String(r.user_id));
  }

  // --- User Profile & Mira Memory ---
  static async getUserProfile(chatId, userId) {
    const sChatId = String(chatId);
    const sUserId = String(userId);
    if (useSupabase) {
      try {
        const { data, error } = await supabase
          .from('user_profiles')
          .select('*')
          .eq('chat_id', sChatId)
          .eq('user_id', sUserId)
          .maybeSingle();
        if (!error && data) return data;
      } catch (e) {}
    }
    const row = localPrepare('SELECT * FROM user_profiles WHERE chat_id = ? AND user_id = ?').get(sChatId, sUserId);
    return row || null;
  }

  static async saveUserProfile(chatId, userId, username, firstName, extra = {}) {
    const sChatId = String(chatId);
    const sUserId = String(userId);
    const payload = {
      chat_id: sChatId,
      user_id: sUserId,
      username: username || '',
      first_name: firstName || 'کاربر',
      last_active: new Date().toISOString(),
      ...extra
    };

    if (useSupabase) {
      try {
        await supabase.from('user_profiles').upsert(payload, { onConflict: 'chat_id,user_id' });
      } catch (e) {}
    }

    const existing = localPrepare('SELECT * FROM user_profiles WHERE chat_id = ? AND user_id = ?').get(sChatId, sUserId);
    if (existing) {
      const keys = Object.keys(extra).concat(['username', 'first_name', 'last_active']).map(k => `${k} = ?`).join(', ');
      const values = [...Object.keys(extra).map(k => extra[k]), username || '', firstName || 'کاربر', new Date().toISOString(), sChatId, sUserId];
      localPrepare(`UPDATE user_profiles SET messages_count = messages_count + 1, ${keys} WHERE chat_id = ? AND user_id = ?`).run(...values);
    } else {
      localPrepare(`
        INSERT INTO user_profiles (chat_id, user_id, username, first_name, karma, messages_count, personality_summary, last_active)
        VALUES (?, ?, ?, ?, 0, 1, ?, ?)
      `).run(sChatId, sUserId, username || '', firstName || 'کاربر', extra.personality_summary || 'عضو جدید', new Date().toISOString());
    }
  }

  static async updateKarma(chatId, userId, amount) {
    const sChatId = String(chatId);
    const sUserId = String(userId);

    const profile = await this.getUserProfile(sChatId, sUserId);
    const newKarma = (profile ? (profile.karma || 0) : 0) + amount;

    if (useSupabase) {
      try {
        await supabase.from('user_profiles').upsert({ chat_id: sChatId, user_id: sUserId, karma: newKarma }, { onConflict: 'chat_id,user_id' });
      } catch (e) {}
    }
    localPrepare('UPDATE user_profiles SET karma = karma + ? WHERE chat_id = ? AND user_id = ?').run(amount, sChatId, sUserId);
    return newKarma;
  }

  static async getTopLeaderboard(chatId, limit = 10) {
    const sChatId = String(chatId);
    if (useSupabase) {
      try {
        const { data, error } = await supabase
          .from('user_profiles')
          .select('*')
          .eq('chat_id', sChatId)
          .order('karma', { ascending: false })
          .limit(limit);
        if (!error && data && data.length > 0) return data;
      } catch (e) {}
    }
    return localPrepare('SELECT * FROM user_profiles WHERE chat_id = ? ORDER BY karma DESC LIMIT ?').all(sChatId, limit);
  }

  // --- History & Context ---
  static async logMessage(chatId, userId, username, firstName, text, msgType = 'chat') {
    const sChatId = String(chatId);
    const sUserId = String(userId);
    if (useSupabase) {
      try {
        await supabase.from('messages_history').insert({
          chat_id: sChatId,
          user_id: sUserId,
          username: username || '',
          first_name: firstName || 'کاربر',
          message_text: text,
          msg_type: msgType
        });
      } catch (e) {}
    }
    localPrepare(`
      INSERT INTO messages_history (chat_id, user_id, username, first_name, message_text, msg_type)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(sChatId, sUserId, username || '', firstName || 'کاربر', text, msgType);

    // Update user profile active status
    await this.saveUserProfile(sChatId, sUserId, username, firstName);
  }

  static async getRecentMessages(chatId, limit = 15) {
    const sChatId = String(chatId);
    if (useSupabase) {
      try {
        const { data, error } = await supabase
          .from('messages_history')
          .select('*')
          .eq('chat_id', sChatId)
          .order('id', { ascending: false })
          .limit(limit);
        if (!error && data && data.length > 0) return data.reverse();
      } catch (e) {}
    }
    const rows = localPrepare('SELECT * FROM messages_history WHERE chat_id = ? ORDER BY id DESC LIMIT ?').all(sChatId, limit);
    return rows.reverse();
  }

  // --- Prediction Track Record ---
  static async addPrediction(chatId, userId, username, text) {
    const sChatId = String(chatId);
    const sUserId = String(userId);
    if (useSupabase) {
      try {
        await supabase.from('predictions_track').insert({
          chat_id: sChatId,
          user_id: sUserId,
          username: username || '',
          prediction_text: text,
          status: 'pending'
        });
      } catch (e) {}
    }
    localPrepare(`
      INSERT INTO predictions_track (chat_id, user_id, username, prediction_text, status)
      VALUES (?, ?, ?, ?, 'pending')
    `).run(sChatId, sUserId, username || '', text);
  }

  static async getUserPredictions(chatId, userId) {
    const sChatId = String(chatId);
    const sUserId = String(userId);
    if (useSupabase) {
      try {
        const { data, error } = await supabase
          .from('predictions_track')
          .select('*')
          .eq('chat_id', sChatId)
          .eq('user_id', sUserId)
          .order('id', { ascending: false });
        if (!error && data) return data;
      } catch (e) {}
    }
    return localPrepare('SELECT * FROM predictions_track WHERE chat_id = ? AND user_id = ? ORDER BY id DESC').all(sChatId, sUserId);
  }
}

module.exports = DB;
