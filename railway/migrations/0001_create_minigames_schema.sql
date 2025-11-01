/*
  # Mini-Games Schema for Railway PostgreSQL
  Adapted from Supabase schema for 5Chairs Bot

  1. New Tables
    - `meetings`
      - `id` (uuid, primary key)
      - `total_participants` (integer) - Total number of people in the meeting
      - `created_at` (timestamptz)
      - `expires_at` (timestamptz) - When the meeting session expires

    - `games`
      - `id` (uuid, primary key)
      - `name` (text) - Name of the game
      - `min_players` (integer) - Minimum players required for early start
      - `description` (text) - Optional description
      - `created_at` (timestamptz)

    - `game_sessions`
      - `id` (uuid, primary key)
      - `meeting_id` (uuid, foreign key to meetings)
      - `game_id` (uuid, foreign key to games)
      - `status` (text) - 'waiting', 'in_progress', 'completed'
      - `started_at` (timestamptz)
      - `last_activity` (timestamptz)
      - `created_at` (timestamptz)

    - `participants`
      - `id` (uuid, primary key)
      - `telegram_user_id` (bigint) - Telegram user ID (changed from user_id for clarity)
      - `telegram_username` (text) - Telegram username (nullable)
      - `meeting_id` (uuid, foreign key to meetings)
      - `created_at` (timestamptz)

    - `game_participants`
      - `id` (uuid, primary key)
      - `game_session_id` (uuid, foreign key to game_sessions)
      - `participant_id` (uuid, foreign key to participants)
      - `ready_to_start` (boolean) - Whether user voted for early start
      - `joined_at` (timestamptz)

  2. Notes
    - All timestamps use timestamptz for proper timezone handling
    - Game sessions track activity for 10-minute timeout
    - Ready_to_start flag tracks early start votes
    - Telegram user IDs are stored as bigint to match Telegram's format
    - Telegram usernames are nullable since not all users have usernames
*/

-- Create meetings table
CREATE TABLE IF NOT EXISTS meetings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  total_participants integer NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  expires_at timestamptz DEFAULT (now() + interval '24 hours')
);

-- Create games table with predefined mini-games
CREATE TABLE IF NOT EXISTS games (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  min_players integer NOT NULL DEFAULT 2,
  description text DEFAULT '',
  created_at timestamptz DEFAULT now()
);

-- Create game_sessions table
CREATE TABLE IF NOT EXISTS game_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  meeting_id uuid REFERENCES meetings(id) ON DELETE CASCADE,
  game_id uuid REFERENCES games(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'waiting',
  started_at timestamptz,
  last_activity timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

-- Add unique index on (meeting_id, game_id) for active sessions to prevent duplicates
CREATE UNIQUE INDEX IF NOT EXISTS idx_game_sessions_active_meeting_game
ON game_sessions (meeting_id, game_id)
WHERE status IN ('waiting', 'in_progress');

-- Create participants table
CREATE TABLE IF NOT EXISTS participants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  telegram_user_id bigint NOT NULL,
  telegram_username text,
  meeting_id uuid REFERENCES meetings(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(telegram_user_id, meeting_id)
);

-- Create game_participants table
CREATE TABLE IF NOT EXISTS game_participants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  game_session_id uuid REFERENCES game_sessions(id) ON DELETE CASCADE,
  participant_id uuid REFERENCES participants(id) ON DELETE CASCADE,
  ready_to_start boolean DEFAULT false,
  joined_at timestamptz DEFAULT now(),
  UNIQUE(game_session_id, participant_id)
);

-- Insert default mini-games
INSERT INTO games (name, min_players, description) VALUES
  ('Викторина', 2, 'Ответьте на вопросы и проверьте свои знания'),
  ('Крокодил', 3, 'Показывайте слова без слов'),
  ('Мафия', 5, 'Классическая игра в детектива'),
  ('Алиас', 4, 'Объясняйте слова своей команде'),
  ('Данетки', 2, 'Разгадайте загадочные истории')
ON CONFLICT DO NOTHING;