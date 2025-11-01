/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string
  readonly VITE_SUPABASE_ANON_KEY: string
  readonly VITE_USE_TEST_MODE: string
  readonly VITE_SHOW_TEST_PANEL: string
  readonly VITE_SHOW_MULTI_VIEW: string
  readonly VITE_GAME_POLL_INTERVAL_MS: string
  readonly VITE_INACTIVITY_TIMEOUT_MS: string
  readonly VITE_MIN_PLAYERS_DEFAULT: string
  readonly VITE_MAX_PLAYERS_DEFAULT: string
  readonly VITE_TELEGRAM_WEBAPP_CLOSE_ON_START: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

// Telegram WebApp types
declare global {
  interface Window {
    Telegram?: {
      WebApp?: {
        initDataUnsafe?: {
          user?: {
            id: number;
            username?: string;
            first_name?: string;
            last_name?: string;
          };
        };
        ready(): void;
        close(): void;
        sendData(data: string): void;
        onEvent(eventType: string, eventHandler: Function): void;
      };
    };
  }
}
