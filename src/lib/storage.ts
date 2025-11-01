import { Game, GameSession, Participant, GameParticipant, Meeting } from '../types';

export interface StorageAdapter {
  // Meeting operations
  getMeeting(id: string): Promise<Meeting | null>;
  createMeeting(totalParticipants: number): Promise<Meeting>;

  // Session operations
  getActiveSession(meetingId: string, gameId: string): Promise<GameSession | null>;
  createWaitingSession(meetingId: string, gameId: string): Promise<GameSession>;
  setSessionStatus(sessionId: string, status: 'waiting' | 'in_progress' | 'completed'): Promise<void>;
  updateSessionActivity(sessionId: string): Promise<void>;
  cleanupInactiveSessions(): Promise<void>;

  // Participant operations
  getOrCreateParticipant(meetingId: string, telegramUserId: number, telegramUsername?: string): Promise<Participant>;

  // Game participant operations (join/leave/vote)
  joinSession(sessionId: string, participantId: string): Promise<void>;
  leaveSession(sessionId: string, participantId: string): Promise<void>;
  voteEarlyStart(sessionId: string, participantId: string, vote: boolean): Promise<void>;

  // Snapshot operations
  getSessionSnapshot(sessionId: string): Promise<{
    session: GameSession;
    participants: GameParticipant[];
    readyCount: number;
  } | null>;

  // WebSocket operations
  connectWebSocket(sessionId: string): Promise<void>;
  disconnectWebSocket(): void;
  addSessionUpdateListener(listener: (sessionId: string, data: any) => void): void;
  removeSessionUpdateListener(listener: (sessionId: string, data: any) => void): void;
  isWebSocketConnected(): boolean;
}

// Mock implementation for testing and offline development
export class MockStorageAdapter implements StorageAdapter {
  private meetings = new Map<string, Meeting>();
  private sessions = new Map<string, GameSession>();
  private participants = new Map<string, Participant>();
  private gameParticipants = new Map<string, GameParticipant>();
  private sessionUpdateListeners: ((sessionId: string, data: any) => void)[] = [];
  private wsConnected = false;

  connectWebSocket(sessionId: string): Promise<void> {
    this.wsConnected = true;
    return Promise.resolve();
  }

  disconnectWebSocket(): void {
    this.wsConnected = false;
  }

  addSessionUpdateListener(listener: (sessionId: string, data: any) => void): void {
    this.sessionUpdateListeners.push(listener);
  }

  removeSessionUpdateListener(listener: (sessionId: string, data: any) => void): void {
    this.sessionUpdateListeners = this.sessionUpdateListeners.filter(l => l !== listener);
  }

  isWebSocketConnected(): boolean {
    return this.wsConnected;
  }

  private notifySessionUpdate(sessionId: string) {
    const snapshot = this.getSessionSnapshot(sessionId);
    if (snapshot) {
      this.sessionUpdateListeners.forEach(listener => listener(sessionId, snapshot));
    }
  }

  async getMeeting(id: string): Promise<Meeting | null> {
    return this.meetings.get(id) || null;
  }

  async createMeeting(totalParticipants: number): Promise<Meeting> {
    const meeting: Meeting = {
      id: `meeting_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      total_participants: totalParticipants,
    };
    this.meetings.set(meeting.id, meeting);
    return meeting;
  }

  async getActiveSession(meetingId: string, gameId: string): Promise<GameSession | null> {
    // Priority: in_progress, then waiting
    const inProgress = Array.from(this.sessions.values()).find(
      s => s.meeting_id === meetingId && s.game_id === gameId && s.status === 'in_progress'
    );
    if (inProgress) return inProgress;

    const waiting = Array.from(this.sessions.values()).find(
      s => s.meeting_id === meetingId && s.game_id === gameId && s.status === 'waiting'
    );
    return waiting || null;
  }

  async createWaitingSession(meetingId: string, gameId: string): Promise<GameSession> {
    const session: GameSession = {
      id: `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      meeting_id: meetingId,
      game_id: gameId,
      status: 'waiting',
      last_activity: new Date().toISOString(),
    };
    this.sessions.set(session.id, session);
    return session;
  }

  async setSessionStatus(sessionId: string, status: 'waiting' | 'in_progress' | 'completed'): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (session) {
      session.status = status;
      if (status === 'in_progress') {
        session.started_at = new Date().toISOString();
      }
      session.last_activity = new Date().toISOString();
      // Simulate real-time update
      setTimeout(() => this.notifySessionUpdate(sessionId), 100);
    }
  }

  async updateSessionActivity(sessionId: string): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (session) {
      session.last_activity = new Date().toISOString();
    }
  }

  async cleanupInactiveSessions(): Promise<void> {
    const now = Date.now();
    const timeoutMs = 10 * 60 * 1000; // 10 minutes

    for (const [sessionId, session] of this.sessions.entries()) {
      if (session.status === 'waiting') {
        const lastActivity = new Date(session.last_activity).getTime();
        if (now - lastActivity > timeoutMs) {
          console.log(`[MockStorageAdapter] Cleaning up inactive session: ${sessionId}`);

          // Get all participants and remove them
          const participants = Array.from(this.gameParticipants.values())
            .filter(gp => gp.game_session_id === sessionId);

          for (const participant of participants) {
            this.gameParticipants.delete(`${sessionId}_${participant.participant_id}`);
          }

          // Mark session as completed
          session.status = 'completed';
        }
      }
    }
  }

  async getOrCreateParticipant(meetingId: string, telegramUserId: number, telegramUsername?: string): Promise<Participant> {
    const existing = Array.from(this.participants.values()).find(
      p => p.telegram_user_id === telegramUserId && p.meeting_id === meetingId
    );
    if (existing) return existing;

    const participant: Participant = {
      id: `participant_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      telegram_user_id: telegramUserId,
      telegram_username: telegramUsername || `User ${telegramUserId.toString().slice(0, 6)}`,
      meeting_id: meetingId,
    };
    this.participants.set(participant.id, participant);
    return participant;
  }

  async joinSession(sessionId: string, participantId: string): Promise<void> {
    const key = `${sessionId}_${participantId}`;
    if (!this.gameParticipants.has(key)) {
      const gameParticipant: GameParticipant = {
        id: `gp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        game_session_id: sessionId,
        participant_id: participantId,
        ready_to_start: false,
      };
      this.gameParticipants.set(key, gameParticipant);
      // Simulate real-time update
      setTimeout(() => this.notifySessionUpdate(sessionId), 100);
    }
  }

  async leaveSession(sessionId: string, participantId: string): Promise<void> {
    const key = `${sessionId}_${participantId}`;
    this.gameParticipants.delete(key);
    // Simulate real-time update
    setTimeout(() => this.notifySessionUpdate(sessionId), 100);
  }

  async voteEarlyStart(sessionId: string, participantId: string, vote: boolean): Promise<void> {
    const key = `${sessionId}_${participantId}`;
    const gp = this.gameParticipants.get(key);
    if (gp) {
      gp.ready_to_start = vote;
      // Simulate real-time update
      setTimeout(() => this.notifySessionUpdate(sessionId), 100);
    }
  }

  async getSessionSnapshot(sessionId: string): Promise<{
    session: GameSession;
    participants: GameParticipant[];
    readyCount: number;
  } | null> {
    const session = this.sessions.get(sessionId);
    if (!session) return null;

    const participants = Array.from(this.gameParticipants.values())
      .filter(gp => gp.game_session_id === sessionId);

    const readyCount = participants.filter(p => p.ready_to_start).length;

    return { session, participants, readyCount };
  }
}

// WebSocket connection for real-time updates
class WebSocketManager {
  private ws: WebSocket | null = null;
  private sessionId: string | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;
  private listeners: ((data: any) => void)[] = [];

  connect(sessionId: string, token: string, baseUrl?: string): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.ws?.readyState === WebSocket.OPEN) {
        this.disconnect();
      }

      this.sessionId = sessionId;
      const wsUrl = `${baseUrl || window.location.origin.replace('http', 'ws')}/api/ws/sessions/${sessionId}?token=${token}`;

      try {
        this.ws = new WebSocket(wsUrl);

        this.ws.onopen = () => {
          console.log('WebSocket connected to session', sessionId);
          this.reconnectAttempts = 0;
          resolve();
        };

        this.ws.onmessage = (event) => {
          try {
            const data = event.data;
            if (data.startsWith('session_update:')) {
              const sessionData = JSON.parse(data.substring(14)); // Remove 'session_update:' prefix
              this.listeners.forEach(listener => listener(sessionData));
            } else if (data === 'ping') {
              this.ws?.send('pong');
            }
          } catch (e) {
            console.error('Failed to parse WebSocket message:', e);
          }
        };

        this.ws.onclose = (event) => {
          console.log('WebSocket disconnected:', event.code, event.reason);
          if (event.code !== 1000 && this.reconnectAttempts < this.maxReconnectAttempts) {
            this.attemptReconnect(token, baseUrl);
          }
        };

        this.ws.onerror = (error) => {
          console.error('WebSocket error:', error);
          reject(error);
        };

      } catch (e) {
        reject(e);
      }
    });
  }

  private attemptReconnect(token: string, baseUrl?: string) {
    this.reconnectAttempts++;
    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1); // Exponential backoff

    setTimeout(() => {
      if (this.sessionId) {
        console.log(`Attempting WebSocket reconnection (${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
        this.connect(this.sessionId, token, baseUrl).catch(e => {
          console.error('Reconnection failed:', e);
        });
      }
    }, delay);
  }

  disconnect() {
    if (this.ws) {
      this.ws.close(1000, 'Client disconnecting');
      this.ws = null;
    }
    this.sessionId = null;
    this.reconnectAttempts = 0;
  }

  addListener(listener: (data: any) => void) {
    this.listeners.push(listener);
  }

  removeListener(listener: (data: any) => void) {
    this.listeners = this.listeners.filter(l => l !== listener);
  }

  isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }
}

// REST implementation for production (connected to Railway bot)
export class RESTStorageAdapter implements StorageAdapter {
  private baseUrl: string;
  private token: string | undefined;
  private wsManager: WebSocketManager;
  private sessionUpdateListeners: ((sessionId: string, data: any) => void)[] = [];

  constructor(baseUrl?: string, token?: string) {
    this.baseUrl = baseUrl || '/api';
    this.token = token;
    this.wsManager = new WebSocketManager();
  }

  private async authenticatedFetch(url: string, options: RequestInit = {}): Promise<Response> {
    const headers = new Headers(options.headers);

    if (this.token) {
      headers.set('Authorization', `Bearer ${this.token}`);
    }
    headers.set('Content-Type', 'application/json');

    return fetch(url, {
      ...options,
      headers,
    });
  }

  // WebSocket management methods
  async connectWebSocket(sessionId: string): Promise<void> {
    if (this.token) {
      await this.wsManager.connect(sessionId, this.token, this.baseUrl.replace('/api', '').replace('http', 'ws'));
      this.wsManager.addListener((data) => {
        this.sessionUpdateListeners.forEach(listener => listener(sessionId, data));
      });
    }
  }

  disconnectWebSocket() {
    this.wsManager.disconnect();
  }

  addSessionUpdateListener(listener: (sessionId: string, data: any) => void) {
    this.sessionUpdateListeners.push(listener);
  }

  removeSessionUpdateListener(listener: (sessionId: string, data: any) => void) {
    this.sessionUpdateListeners = this.sessionUpdateListeners.filter(l => l !== listener);
  }

  isWebSocketConnected(): boolean {
    return this.wsManager.isConnected();
  }

  async getMeeting(id: string): Promise<Meeting | null> {
    try {
      const response = await this.authenticatedFetch(`${this.baseUrl}/meetings/${id}`);
      if (!response.ok) {
        console.error(`Failed to get meeting ${id}:`, response.status, response.statusText);
        return null;
      }
      return response.json();
    } catch (error) {
      console.error('Error getting meeting:', error);
      return null;
    }
  }

  async createMeeting(totalParticipants: number): Promise<Meeting> {
    try {
      const response = await this.authenticatedFetch(`${this.baseUrl}/meetings`, {
        method: 'POST',
        body: JSON.stringify({ total_participants: totalParticipants }),
      });
      if (!response.ok) {
        throw new Error(`Failed to create meeting: ${response.status} ${response.statusText}`);
      }
      return response.json();
    } catch (error) {
      console.error('Error creating meeting:', error);
      throw error;
    }
  }

  async getActiveSession(meetingId: string, gameId: string): Promise<GameSession | null> {
    try {
      const response = await this.authenticatedFetch(`${this.baseUrl}/sessions?meeting_id=${meetingId}&game_id=${gameId}`);
      if (!response.ok) {
        console.error(`Failed to get active session for meeting ${meetingId}, game ${gameId}:`, response.status, response.statusText);
        return null;
      }
      return response.json();
    } catch (error) {
      console.error('Error getting active session:', error);
      return null;
    }
  }

  async createWaitingSession(meetingId: string, gameId: string): Promise<GameSession> {
    try {
      const response = await this.authenticatedFetch(`${this.baseUrl}/sessions`, {
        method: 'POST',
        body: JSON.stringify({ meeting_id: meetingId, game_id: gameId }),
      });
      if (!response.ok) {
        throw new Error(`Failed to create waiting session: ${response.status} ${response.statusText}`);
      }
      return response.json();
    } catch (error) {
      console.error('Error creating waiting session:', error);
      throw error;
    }
  }

  async setSessionStatus(sessionId: string, status: 'waiting' | 'in_progress' | 'completed'): Promise<void> {
    try {
      const response = await this.authenticatedFetch(`${this.baseUrl}/sessions/${sessionId}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      });
      if (!response.ok) {
        throw new Error(`Failed to set session status: ${response.status} ${response.statusText}`);
      }
    } catch (error) {
      console.error('Error setting session status:', error);
      throw error;
    }
  }

  async getOrCreateParticipant(meetingId: string, telegramUserId: number, telegramUsername?: string): Promise<Participant> {
    try {
      const response = await this.authenticatedFetch(`${this.baseUrl}/meetings/${meetingId}/participants`, {
        method: 'POST',
        body: JSON.stringify({ telegram_user_id: telegramUserId.toString(), telegram_username: telegramUsername }),
      });
      if (!response.ok) {
        throw new Error(`Failed to get or create participant: ${response.status} ${response.statusText}`);
      }
      return response.json();
    } catch (error) {
      console.error('Error getting or creating participant:', error);
      throw error;
    }
  }

  async joinSession(sessionId: string, participantId: string): Promise<void> {
    try {
      const response = await this.authenticatedFetch(`${this.baseUrl}/sessions/${sessionId}/join`, {
        method: 'POST',
        body: JSON.stringify({ participant_id: participantId }),
      });
      if (!response.ok) {
        throw new Error(`Failed to join session: ${response.status} ${response.statusText}`);
      }
    } catch (error) {
      console.error('Error joining session:', error);
      throw error;
    }
  }

  async leaveSession(sessionId: string, participantId: string): Promise<void> {
    try {
      const response = await this.authenticatedFetch(`${this.baseUrl}/sessions/${sessionId}/leave`, {
        method: 'POST',
        body: JSON.stringify({ participant_id: participantId }),
      });
      if (!response.ok) {
        throw new Error(`Failed to leave session: ${response.status} ${response.statusText}`);
      }
    } catch (error) {
      console.error('Error leaving session:', error);
      throw error;
    }
  }

  async voteEarlyStart(sessionId: string, participantId: string, vote: boolean): Promise<void> {
    try {
      const response = await this.authenticatedFetch(`${this.baseUrl}/sessions/${sessionId}/early-start-vote`, {
        method: 'POST',
        body: JSON.stringify({ participant_id: participantId, vote }),
      });
      if (!response.ok) {
        throw new Error(`Failed to vote early start: ${response.status} ${response.statusText}`);
      }
    } catch (error) {
      console.error('Error voting early start:', error);
      throw error;
    }
  }

  async getSessionSnapshot(sessionId: string): Promise<{
    session: GameSession;
    participants: GameParticipant[];
    readyCount: number;
  } | null> {
    try {
      const response = await this.authenticatedFetch(`${this.baseUrl}/sessions/${sessionId}/snapshot`);
      if (!response.ok) {
        console.error(`Failed to get session snapshot for ${sessionId}:`, response.status, response.statusText);
        return null;
      }
      return response.json();
    } catch (error) {
      console.error('Error getting session snapshot:', error);
      return null;
    }
  }

  async updateSessionActivity(sessionId: string): Promise<void> {
    try {
      const response = await this.authenticatedFetch(`${this.baseUrl}/sessions/${sessionId}/activity`, {
        method: 'PATCH',
      });
      if (!response.ok) {
        throw new Error(`Failed to update session activity: ${response.status} ${response.statusText}`);
      }
    } catch (error) {
      console.error('Error updating session activity:', error);
      throw error;
    }
  }

  async cleanupInactiveSessions(): Promise<void> {
    try {
      const response = await this.authenticatedFetch(`${this.baseUrl}/sessions/cleanup-inactive`, {
        method: 'POST',
      });
      if (!response.ok) {
        throw new Error(`Failed to cleanup inactive sessions: ${response.status} ${response.statusText}`);
      }
    } catch (error) {
      console.error('Error cleaning up inactive sessions:', error);
      throw error;
    }
  }
}