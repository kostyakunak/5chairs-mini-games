import { StorageAdapter, MockStorageAdapter, RESTStorageAdapter } from './storage';
import { config } from '../config';

// Factory function to create the appropriate adapter
export function createStorageAdapter(): StorageAdapter {
  if (config.USE_TEST_MODE) {
    return new MockStorageAdapter();
  } else {
    // For production, use REST adapter connected to Railway bot
    return new RESTStorageAdapter(config.RAILWAY_API_BASE_URL, config.USER_BOT_TOKEN);
  }
}

// Global instance
export const storageAdapter = createStorageAdapter();