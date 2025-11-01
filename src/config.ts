export const config = {
  // Test mode flags
  USE_TEST_MODE: process.env.NODE_ENV === 'development' || import.meta.env.VITE_USE_TEST_MODE === 'true',
  SHOW_TEST_PANEL: import.meta.env.VITE_SHOW_TEST_PANEL === 'true',
  SHOW_MULTI_VIEW: import.meta.env.VITE_SHOW_MULTI_VIEW === 'true',

  // Timing constants
  GAME_POLL_INTERVAL_MS: parseInt(import.meta.env.VITE_GAME_POLL_INTERVAL_MS || '3000'),
  INACTIVITY_TIMEOUT_MS: parseInt(import.meta.env.VITE_INACTIVITY_TIMEOUT_MS || '600000'), // 10 minutes

  // Game constants
  MIN_PLAYERS_DEFAULT: parseInt(import.meta.env.VITE_MIN_PLAYERS_DEFAULT || '2'),
  MAX_PLAYERS_DEFAULT: parseInt(import.meta.env.VITE_MAX_PLAYERS_DEFAULT || '10'),

  // Railway database settings
  RAILWAY_API_BASE_URL: import.meta.env.VITE_RAILWAY_API_BASE_URL || 'https://your-railway-app-url.up.railway.app/api',
  USER_BOT_TOKEN: import.meta.env.VITE_USER_BOT_TOKEN,

  // Telegram WebApp settings
  TELEGRAM_WEBAPP_CLOSE_ON_START: import.meta.env.VITE_TELEGRAM_WEBAPP_CLOSE_ON_START === 'true',
};