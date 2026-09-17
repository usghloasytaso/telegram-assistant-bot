-- =============================================
-- Telegram Assistant Bot Database Schema for Supabase
-- =============================================

-- 1. Group Settings
CREATE TABLE IF NOT EXISTS public.group_settings (
    chat_id BIGINT PRIMARY KEY,
    owner_id BIGINT,
    rules TEXT DEFAULT 'هنوز قانونی برای این گروه تنظیم نشده است.',
    welcome_message TEXT DEFAULT 'به گروه خوش آمدید! 👋',
    is_installed BOOLEAN DEFAULT TRUE,
    spam_filter_enabled BOOLEAN DEFAULT TRUE,
    daily_report_enabled BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW())
);

-- 2. Group Admins
CREATE TABLE IF NOT EXISTS public.group_admins (
    id BIGSERIAL PRIMARY KEY,
    chat_id BIGINT NOT NULL,
    user_id BIGINT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()),
    UNIQUE(chat_id, user_id)
);

-- 3. User Profiles & Mira-style Memory
CREATE TABLE IF NOT EXISTS public.user_profiles (
    id BIGSERIAL PRIMARY KEY,
    chat_id BIGINT NOT NULL,
    user_id BIGINT NOT NULL,
    username TEXT,
    first_name TEXT,
    karma INT DEFAULT 0,
    messages_count INT DEFAULT 0,
    personality_summary TEXT DEFAULT 'عضو فعال گروه',
    last_analysis TEXT,
    last_active TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()),
    UNIQUE(chat_id, user_id)
);

-- 4. Messages History (Group Context)
CREATE TABLE IF NOT EXISTS public.messages_history (
    id BIGSERIAL PRIMARY KEY,
    chat_id BIGINT NOT NULL,
    user_id BIGINT NOT NULL,
    username TEXT,
    first_name TEXT,
    message_text TEXT NOT NULL,
    msg_type TEXT DEFAULT 'chat', -- 'chat', 'news', 'analysis', 'voice'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW())
);

-- 5. User Predictions Track Record
CREATE TABLE IF NOT EXISTS public.predictions_track (
    id BIGSERIAL PRIMARY KEY,
    chat_id BIGINT NOT NULL,
    user_id BIGINT NOT NULL,
    username TEXT,
    prediction_text TEXT NOT NULL,
    status TEXT DEFAULT 'pending', -- 'pending', 'correct', 'wrong'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW())
);

-- Indexing for performance
CREATE INDEX IF NOT EXISTS idx_messages_chat_id ON public.messages_history(chat_id);
CREATE INDEX IF NOT EXISTS idx_user_profiles_chat_user ON public.user_profiles(chat_id, user_id);
