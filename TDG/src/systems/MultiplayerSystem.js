// ============================================================
// MultiplayerSystem — Supabase Realtime 2-player co-op
// ============================================================
const SUPABASE_URL = 'https://wvtfclnogquradgdqoae.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind2dGZjbG5vZ3F1cmFkZ2Rxb2FlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgxNDM3NDcsImV4cCI6MjA5MzcxOTc0N30.25N3yb_rsAKeNoixTuJsLEml6B0egyQI5nzgZ8LEg7E';

export class MultiplayerSystem {
  constructor() {
    this.client     = null;
    this.channel    = null;
    this.roomCode   = null;
    this.isHost     = false;
    this.playerId   = 'P' + Math.random().toString(36).slice(2, 7).toUpperCase();
    this.partnerId  = null;
    this.onPartnerJoin  = null;
    this.onPartnerState = null;
    this.onPartnerDeath = null;
    this.onPartnerWave  = null;
    this._ready = false;
  }

  _initClient() {
    if (this.client) return;
    // Dynamically import supabase-js from CDN (no bundler)
    // The BootScene will load this script tag before GameScene runs
    if (window.supabase) {
      this.client = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    }
  }

  /** Host creates room. Returns roomCode. */
  async createRoom(seed, wave) {
    this._initClient();
    if (!this.client) return null;
    this.isHost   = true;
    this.roomCode = Math.random().toString(36).slice(2, 8).toUpperCase();
    await this._joinChannel(this.roomCode, seed, wave);
    return this.roomCode;
  }

  /** Guest joins room by code. Returns { seed, wave } from host. */
  async joinRoom(code) {
    this._initClient();
    if (!this.client) return null;
    this.isHost   = false;
    this.roomCode = code.toUpperCase();
    return new Promise((resolve) => {
      this._pendingJoinResolve = resolve;
      this._joinChannel(this.roomCode, null, null);
    });
  }

  async _joinChannel(code, seed, wave) {
    const ch = this.client.channel(`siege_room_${code}`, {
      config: { broadcast: { self: false } },
    });

    ch.on('broadcast', { event: 'player_state' }, ({ payload }) => {
      if (payload.id === this.playerId) return;
      this.partnerId = payload.id;
      if (this.onPartnerState) this.onPartnerState(payload);
    });

    ch.on('broadcast', { event: 'player_join' }, ({ payload }) => {
      if (payload.id === this.playerId) return;
      this.partnerId = payload.id;
      if (this.isHost && this._hostSeed !== undefined) {
        // Send seed to joiner
        ch.send({ type: 'broadcast', event: 'room_info', payload: { seed: this._hostSeed, wave: this._hostWave, hostId: this.playerId } });
      }
      if (this.onPartnerJoin) this.onPartnerJoin(payload);
    });

    ch.on('broadcast', { event: 'room_info' }, ({ payload }) => {
      if (this.isHost) return;
      if (this._pendingJoinResolve) {
        this._pendingJoinResolve({ seed: payload.seed, wave: payload.wave });
        this._pendingJoinResolve = null;
      }
    });

    ch.on('broadcast', { event: 'player_death' }, ({ payload }) => {
      if (payload.id === this.playerId) return;
      if (this.onPartnerDeath) this.onPartnerDeath(payload);
    });

    ch.on('broadcast', { event: 'wave_sync' }, ({ payload }) => {
      if (payload.id === this.playerId) return;
      if (this.onPartnerWave) this.onPartnerWave(payload);
    });

    ch.on('broadcast', { event: 'enemy_kill' }, ({ payload }) => {
      if (payload.id === this.playerId) return;
      if (this.onEnemyKill) this.onEnemyKill(payload);
    });

    await new Promise(res => ch.subscribe(status => { if (status === 'SUBSCRIBED') res(); }));
    this.channel  = ch;
    this._hostSeed = seed;
    this._hostWave = wave;
    this._ready    = true;

    // Announce join
    ch.send({ type: 'broadcast', event: 'player_join', payload: { id: this.playerId, isHost: this.isHost } });
  }

  /** Broadcast local player state each update tick (throttled externally). */
  sendState(x, y, hp, wave) {
    if (!this._ready || !this.channel) return;
    this.channel.send({ type: 'broadcast', event: 'player_state', payload: { id: this.playerId, x, y, hp, wave } });
  }

  sendDeath() {
    if (!this._ready || !this.channel) return;
    this.channel.send({ type: 'broadcast', event: 'player_death', payload: { id: this.playerId } });
  }

  sendEnemyKill(enemyId) {
    if (!this._ready || !this.channel) return;
    this.channel.send({ type: 'broadcast', event: 'enemy_kill', payload: { id: this.playerId, enemyId } });
  }

  disconnect() {
    this.channel?.unsubscribe();
    this.channel  = null;
    this._ready   = false;
  }
}

export const multiplayerSys = new MultiplayerSystem();
