export interface Game {
  id: string;
  name: string;
  min_players: number;
  description: string;
}

export interface Meeting {
  id: string;
  total_participants: number;
}

export interface GameSession {
  id: string;
  meeting_id: string;
  game_id: string;
  status: 'waiting' | 'in_progress' | 'completed';
  started_at?: string;
  last_activity: string;
  participant_count?: number;
  ready_count?: number;
}

export interface Participant {
  id: string;
  telegram_user_id: number;
  telegram_username?: string;
  meeting_id: string;
}

export interface TelegramUser {
  id: number;
  first_name?: string;
  username?: string;
}

export interface GameParticipant {
  id: string;
  game_session_id: string;
  participant_id: string;
  ready_to_start: boolean;
}
